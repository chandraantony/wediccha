import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'
import test from 'node:test'
import { createBlobGuestStore } from './blob-guest-store.mjs'
import { createGuestResponseHandler } from './guest-responses.mjs'

// In-memory stand-in for a private Vercel Blob, including ETag conflicts.
function fakeBlob() {
  let content = null
  let version = 0
  return {
    async get() {
      if (content === null) {
        const error = new Error('not found')
        error.name = 'BlobNotFoundError'
        throw error
      }
      return {
        statusCode: 200,
        blob: { etag: String(version) },
        stream: new Response(content).body,
      }
    },
    async put(_pathname, body, options) {
      if (options.allowOverwrite === false && content !== null) {
        const error = new Error('blob already exists')
        error.name = 'BlobError'
        throw error
      }
      if (options.ifMatch !== undefined && options.ifMatch !== String(version)) {
        const error = new Error('precondition failed')
        error.name = 'BlobPreconditionFailedError'
        throw error
      }
      content = body
      version += 1
      return {}
    },
  }
}

function blobFixture(blob = fakeBlob()) {
  return createBlobGuestStore({
    maxAttempts: 8,
    blob,
    isNotFound: (error) => error.name === 'BlobNotFoundError',
    isPreconditionFailed: (error) => error.name === 'BlobPreconditionFailedError',
  })
}

async function request(handler, method, url, payload) {
  const req = Readable.from(payload === undefined ? [] : [Buffer.from(JSON.stringify(payload))])
  Object.assign(req, { method, url, headers: { 'content-type': 'application/json' } })
  let status
  let body
  const res = {
    writeHead(value) { status = value },
    end(value) { body = value ? JSON.parse(value) : null },
  }
  await handler(req, res, () => {})
  return { status, body }
}

test('blob store starts empty and upserts RSVPs with corrected counts', async () => {
  const store = blobFixture()
  assert.deepEqual(await store.read(), { version: 1, rsvps: [], wishes: [] })

  const rsvp = { id: randomUUID(), name: 'Andi', attendance: 'hadir', guests: 3 }
  assert.deepEqual((await store.submit('rsvp', rsvp)).counts, { attending: 1, notAttending: 0, guests: 3 })
  assert.deepEqual(
    (await store.submit('rsvp', { ...rsvp, attendance: 'tidak_hadir', guests: 0 })).counts,
    { attending: 0, notAttending: 1, guests: 0 },
  )
  assert.equal((await store.read()).rsvps.length, 1)
})

test('blob store keeps wishes idempotent when a failed request is retried', async () => {
  const store = blobFixture()
  const id = randomUUID()
  const first = await store.submit('wish', { id, name: 'Andi', message: 'Selamat!' })
  const retried = await store.submit('wish', { id, name: 'Andi', message: 'teks berbeda' })
  assert.deepEqual(retried.wishes, first.wishes)
  assert.equal(retried.wishes[0].message, 'Selamat!')
})

test('blob store retries on concurrent writes so no response is lost', async () => {
  // Several store instances share one fake blob, simulating serverless instances
  // that each serialize locally but still collide through the ETag check.
  const blob = fakeBlob()
  const stores = Array.from({ length: 4 }, () => blobFixture(blob))
  await Promise.all(Array.from({ length: 25 }, (_, index) => stores[index % 4].submit('rsvp', {
    id: randomUUID(),
    name: `Tamu ${index}`,
    attendance: 'hadir',
    guests: 2,
  })))
  const data = await stores[0].read()
  assert.equal(data.rsvps.length, 25)
  assert.equal(data.rsvps.reduce((sum, record) => sum + record.guests, 0), 50)
})

test('handler accepts an injected store instead of the file store', async () => {
  const submissions = []
  const handler = createGuestResponseHandler({
    store: {
      async read() { return { version: 1, rsvps: [], wishes: [] } },
      async submit(kind, payload) {
        submissions.push({ kind, payload })
        return { counts: { attending: 1, notAttending: 0, guests: 2 }, wishes: [] }
      },
    },
  })

  const get = await request(handler, 'GET', '/api/guest-responses')
  assert.deepEqual(get.body, { counts: { attending: 0, notAttending: 0, guests: 0 }, wishes: [] })

  const post = await request(handler, 'POST', '/api/rsvps', {
    id: randomUUID(), name: 'Andi', attendance: 'hadir', guests: 2,
  })
  assert.equal(post.body.ok, true)
  assert.equal(submissions.length, 1)
  assert.equal(submissions[0].kind, 'rsvp')
})