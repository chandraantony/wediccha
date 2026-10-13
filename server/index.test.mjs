import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import test from 'node:test'
import { createWeddingServer } from './index.mjs'

async function request(server, method, url) {
  const req = Readable.from([])
  Object.assign(req, { method, url, headers: {} })
  return new Promise((resolve) => {
    const headers = {}
    const res = {
      headersSent: false,
      setHeader(name, value) { headers[name] = value },
      writeHead(status, values) { this.status = status; Object.assign(headers, values); this.headersSent = true },
      end(body) { resolve({ status: this.status, headers, body: body?.toString() || '' }) },
      destroy() { resolve({ status: this.status, headers, body: '' }) },
    }
    server.emit('request', req, res)
  })
}

test('production serving supports assets, SPA navigation, HEAD, and routes API first', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'wedding-server-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const distDir = path.join(root, 'dist')
  await mkdir(distDir)
  await writeFile(path.join(distDir, 'index.html'), '<html>Invitation</html>')
  await writeFile(path.join(distDir, 'app.js'), 'console.log("wedding")')
  const server = createWeddingServer({ distDir, dataDir: path.join(root, 'data') })
  assert.equal((await request(server, 'GET', '/')).body, '<html>Invitation</html>')
  assert.equal((await request(server, 'GET', '/guest/Andi')).body, '<html>Invitation</html>')
  const asset = await request(server, 'GET', '/app.js')
  assert.equal(asset.status, 200)
  assert.match(asset.headers['Content-Type'], /javascript/)
  assert.equal((await request(server, 'HEAD', '/app.js')).body, '')
  assert.equal((await request(server, 'GET', '/missing.js')).status, 404)
  assert.equal((await request(server, 'POST', '/app.js')).status, 405)
  const api = await request(server, 'GET', '/api/guest-responses')
  assert.deepEqual(JSON.parse(api.body), { counts: { attending: 0, notAttending: 0, guests: 0 }, wishes: [] })
})

test('production serving rejects traversal, symlink escapes, and private data files', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'wedding-private-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const distDir = path.join(root, 'dist')
  await mkdir(distDir)
  await writeFile(path.join(root, 'secret.txt'), 'private')
  await writeFile(path.join(distDir, 'guest-responses.json'), 'must not be public')
  await symlink(path.join(root, 'secret.txt'), path.join(distDir, 'escape.txt'))
  const server = createWeddingServer({ distDir, dataDir: path.join(root, 'data') })
  assert.equal((await request(server, 'GET', '/%2e%2e%2fsecret.txt')).status, 403)
  assert.equal((await request(server, 'GET', '/escape.txt')).status, 403)
  assert.equal((await request(server, 'GET', '/guest-responses.json')).status, 404)
})
