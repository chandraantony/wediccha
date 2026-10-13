import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import test from 'node:test'
import { createGuestResponseHandler } from './guest-responses.mjs'

async function fixture(t) {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'wedding-responses-'))
  t.after(() => rm(dataDir, { recursive: true, force: true }))
  return { dataDir, handler: createGuestResponseHandler({ dataDir }) }
}

async function request(handler, method, url, payload, options = {}) {
  const chunks = options.chunks || (payload === undefined ? [] : [Buffer.from(JSON.stringify(payload))])
  const req = Readable.from(chunks)
  Object.assign(req, { method, url, headers: { 'content-type': 'application/json', ...options.headers } })
  let status
  let headers
  let body
  let passedThrough = false
  const res = {
    writeHead(value, values) { status = value; headers = values },
    end(value) { body = value ? JSON.parse(value) : null },
  }
  await handler(req, res, () => { passedThrough = true })
  return { status, headers, body, passedThrough }
}

test('lazily creates private storage and exposes counts without the RSVP list', async (t) => {
  const { dataDir, handler } = await fixture(t)
  assert.deepEqual(await readdir(dataDir), [])
  assert.equal((await request(handler, 'GET', '/gallery')).passedThrough, true)
  assert.deepEqual(await readdir(dataDir), [])

  const response = await request(handler, 'GET', '/api/guest-responses')
  assert.equal(response.status, 200)
  assert.deepEqual(response.body, { counts: { attending: 0, notAttending: 0, guests: 0 }, wishes: [] })
  const filePath = path.join(dataDir, 'guest-responses.json')
  assert.deepEqual(JSON.parse(await readFile(filePath, 'utf8')), { version: 1, rsvps: [], wishes: [] })
  assert.equal((await stat(filePath)).mode & 0o777, 0o600)
  assert.equal(response.headers['Cache-Control'], 'no-store')
})

test('RSVP upserts recalculate counts, while wishes remain idempotent on retry', async (t) => {
  const { dataDir, handler } = await fixture(t)
  const rsvpId = randomUUID()
  const wishId = randomUUID()
  const attendee = { id: rsvpId, name: '  Andi  ', attendance: 'hadir', guests: 3 }
  const first = await request(handler, 'POST', '/api/rsvps', attendee)
  assert.deepEqual(first.body.counts, { attending: 1, notAttending: 0, guests: 3 })
  await request(handler, 'POST', '/api/rsvps', attendee)
  const updated = await request(handler, 'POST', '/api/rsvps', { ...attendee, attendance: 'tidak_hadir', guests: 0 })
  assert.deepEqual(updated.body.counts, { attending: 0, notAttending: 1, guests: 0 })
  assert.equal('rsvps' in updated.body, false)

  const wish = { id: wishId, name: '  Andi ', message: '  Selamat!  ' }
  const sent = await request(handler, 'POST', '/api/wishes', wish)
  const retried = await request(handler, 'POST', '/api/wishes', { ...wish, message: 'different retry text' })
  assert.deepEqual(retried.body.wishes, sent.body.wishes)
  assert.equal(retried.body.wishes[0].message, 'Selamat!')
  assert.equal(retried.body.wishes[0].name, 'Andi')
  assert.ok(Number.isFinite(Date.parse(retried.body.wishes[0].createdAt)))
  const stored = JSON.parse(await readFile(path.join(dataDir, 'guest-responses.json'), 'utf8'))
  assert.equal(stored.rsvps.length, 1)
  assert.equal(stored.wishes.length, 1)
})

test('concurrent writes from multiple handlers do not lose responses', async (t) => {
  const { dataDir, handler } = await fixture(t)
  const secondHandler = createGuestResponseHandler({ dataDir })
  const submissions = Array.from({ length: 24 }, (_, index) => {
    const selected = index % 2 ? secondHandler : handler
    return request(selected, 'POST', index % 3 ? '/api/rsvps' : '/api/wishes', index % 3
      ? { id: randomUUID(), name: `Tamu ${index}`, attendance: 'hadir', guests: 2 }
      : { id: randomUUID(), name: `Tamu ${index}`, message: `Ucapan ${index}` })
  })
  const results = await Promise.all(submissions)
  assert.ok(results.every((response) => response.status === 200 && response.body.ok))
  const response = await request(handler, 'GET', '/api/guest-responses')
  assert.deepEqual(response.body.counts, { attending: 16, notAttending: 0, guests: 32 })
  assert.equal(response.body.wishes.length, 8)
  assert.equal(new Set(response.body.wishes.map((wish) => wish.id)).size, 8)
  assert.deepEqual(await readdir(dataDir), ['guest-responses.json'])
})

test('validates types and lengths without creating storage for invalid submissions', async (t) => {
  const { dataDir, handler } = await fixture(t)
  const valid = { id: randomUUID(), name: 'Andi', attendance: 'hadir', guests: 1 }
  for (const changes of [
    { id: 'invalid' }, { name: '   ' }, { name: 'a'.repeat(101) },
    { attendance: 'maybe' }, { guests: '2' }, { guests: 1.5 }, { guests: 0 },
    { guests: 11 }, { attendance: 'tidak_hadir', guests: 1 }, { extra: 'unexpected' },
  ]) {
    assert.equal((await request(handler, 'POST', '/api/rsvps', { ...valid, ...changes })).status, 400)
  }
  for (const message of ['', '  ', 'a'.repeat(1001), 42]) {
    assert.equal((await request(handler, 'POST', '/api/wishes', { id: randomUUID(), name: 'Andi', message })).status, 400)
  }
  assert.equal((await request(handler, 'POST', '/api/wishes', null)).status, 400)
  assert.equal((await request(handler, 'POST', '/api/rsvps', valid, { headers: { 'content-type': 'text/plain' } })).status, 415)
  assert.deepEqual(await readdir(dataDir), [])
})

test('rejects malformed JSON and oversized declared or streamed bodies', async (t) => {
  const { dataDir, handler } = await fixture(t)
  assert.equal((await request(handler, 'POST', '/api/wishes', undefined, { chunks: [Buffer.from('{')] })).status, 400)
  assert.equal((await request(handler, 'POST', '/api/wishes', undefined, { headers: { 'content-length': '9000' } })).status, 413)
  assert.equal((await request(handler, 'POST', '/api/wishes', undefined, {
    chunks: [Buffer.alloc(4096, ' '), Buffer.alloc(4097, ' ')],
  })).status, 413)
  assert.deepEqual(await readdir(dataDir), [])
})

test('corrupt or unreadable storage reports failure and is preserved', async (t) => {
  const { dataDir, handler } = await fixture(t)
  const filePath = path.join(dataDir, 'guest-responses.json')
  for (const contents of ['{broken', JSON.stringify({ version: 1, rsvps: [{}], wishes: [] })]) {
    await writeFile(filePath, contents)
    assert.equal((await request(handler, 'GET', '/api/guest-responses')).status, 500)
    const response = await request(handler, 'POST', '/api/rsvps', {
      id: randomUUID(), name: 'Andi', attendance: 'hadir', guests: 1,
    })
    assert.equal(response.status, 500)
    assert.equal(response.body.ok, false)
    assert.equal(await readFile(filePath, 'utf8'), contents)
  }
  const unavailableDirectory = path.join(dataDir, 'a-file')
  await writeFile(unavailableDirectory, 'keep me')
  const unavailableHandler = createGuestResponseHandler({ dataDir: unavailableDirectory })
  assert.equal((await request(unavailableHandler, 'POST', '/api/wishes', {
    id: randomUUID(), name: 'Andi', message: 'Selamat',
  })).status, 500)
  assert.equal(await readFile(unavailableDirectory, 'utf8'), 'keep me')
})

test('private data requests and unsupported API routes cannot fall through to static serving', async (t) => {
  const { dataDir, handler } = await fixture(t)
  for (const url of ['/data/guest-responses.json', `/@fs/${dataDir}/guest-responses.json`, '/data/guest-responses.json.id.tmp', '/api/missing']) {
    const response = await request(handler, 'GET', url)
    assert.equal(response.status, 404)
    assert.equal(response.passedThrough, false)
  }
  const wrongMethod = await request(handler, 'GET', '/api/rsvps')
  assert.equal(wrongMethod.status, 405)
  assert.equal(wrongMethod.headers.Allow, 'POST')
})
