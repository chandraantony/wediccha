import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const BODY_LIMIT = 8 * 1024
const FILE_NAME = 'guest-responses.json'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const queues = new Map()

class RequestError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function sendJson(res, status, body, extraHeaders = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  })
  res.end(JSON.stringify(body))
}

function textValue(value, maxLength, label) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new RequestError(400, `${label} tidak valid.`)
  }
  return value.trim()
}

function validatePayload(payload, kind) {
  const keys = kind === 'rsvp'
    ? ['id', 'name', 'attendance', 'guests']
    : ['id', 'name', 'message']

  if (
    !payload || typeof payload !== 'object' || Array.isArray(payload) ||
    Object.keys(payload).some((key) => !keys.includes(key)) ||
    typeof payload.id !== 'string' || !UUID_PATTERN.test(payload.id)
  ) {
    throw new RequestError(400, 'Data yang dikirim tidak valid.')
  }

  const validated = { id: payload.id.toLowerCase(), name: textValue(payload.name, 100, 'Nama') }
  if (kind === 'wish') {
    return { ...validated, message: textValue(payload.message, 1000, 'Ucapan') }
  }

  if (
    !['hadir', 'tidak_hadir'].includes(payload.attendance) ||
    !Number.isInteger(payload.guests) ||
    (payload.attendance === 'hadir'
      ? payload.guests < 1 || payload.guests > 10
      : payload.guests !== 0)
  ) {
    throw new RequestError(400, 'Konfirmasi kehadiran atau jumlah tamu tidak valid.')
  }
  return { ...validated, attendance: payload.attendance, guests: payload.guests }
}

export function validateStoredData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== 1) {
    throw new Error('Invalid response file')
  }

  // Tolerate a hand-edited file that omits an empty list.
  const normalized = {
    version: 1,
    rsvps: data.rsvps === undefined ? [] : data.rsvps,
    wishes: data.wishes === undefined ? [] : data.wishes,
  }
  if (!Array.isArray(normalized.rsvps) || !Array.isArray(normalized.wishes)) {
    throw new Error('Invalid response file')
  }

  for (const [records, kind] of [[normalized.rsvps, 'rsvp'], [normalized.wishes, 'wish']]) {
    const seen = new Set()
    for (const record of records) {
      if (
        !record || typeof record.createdAt !== 'string' ||
        !Number.isFinite(Date.parse(record.createdAt)) ||
        new Date(record.createdAt).toISOString() !== record.createdAt
      ) {
        throw new Error('Invalid stored response')
      }
      const payload = { ...record }
      delete payload.createdAt
      const validated = validatePayload(payload, kind)
      if (seen.has(validated.id)) throw new Error('Duplicate stored response')
      seen.add(validated.id)
    }
  }
  return normalized
}

export function snapshot(data) {
  const counts = { attending: 0, notAttending: 0, guests: 0 }
  for (const rsvp of data.rsvps) {
    if (rsvp.attendance === 'hadir') {
      counts.attending += 1
      counts.guests += rsvp.guests
    } else {
      counts.notAttending += 1
    }
  }
  return {
    counts,
    wishes: data.wishes
      .slice().reverse()
      .map(({ id, name, message, createdAt }) => ({ id, name, message, createdAt }))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
  }
}

function serialize(filePath, operation) {
  const previous = queues.get(filePath) || Promise.resolve()
  const result = previous.then(operation)
  const settled = result.then(() => undefined, () => undefined)
  queues.set(filePath, settled)
  settled.then(() => {
    if (queues.get(filePath) === settled) queues.delete(filePath)
  })
  return result
}

async function writeData(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 })
  const temporaryPath = `${filePath}.${randomUUID()}.tmp`
  try {
    await writeFile(temporaryPath, `${JSON.stringify(data, null, 2)}\n`, { flag: 'wx', mode: 0o600 })
    await rename(temporaryPath, filePath)
  } finally {
    await rm(temporaryPath, { force: true }).catch(() => {})
  }
}

async function readData(filePath) {
  let contents
  try {
    contents = await readFile(filePath, 'utf8')
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    const initial = { version: 1, rsvps: [], wishes: [] }
    await writeData(filePath, initial)
    return initial
  }
  try {
    return validateStoredData(JSON.parse(contents))
  } catch {
    throw new Error('Cannot read the response file')
  }
}

function createFileStore(filePath) {
  return {
    async read() {
      return serialize(filePath, () => readData(filePath))
    },
    async submit(kind, payload) {
      return serialize(filePath, async () => {
        const data = await readData(filePath)
        const records = kind === 'rsvp' ? data.rsvps : data.wishes
        const index = records.findIndex((record) => record.id === payload.id)
        if (kind === 'wish' && index !== -1) return snapshot(data)

        const record = {
          ...payload,
          createdAt: index === -1 ? new Date().toISOString() : records[index].createdAt,
        }
        if (index === -1) records.push(record)
        else records[index] = record
        await writeData(filePath, data)
        return snapshot(data)
      })
    },
  }
}

async function readJsonBody(req) {
  const contentType = req.headers['content-type']?.split(';')[0].trim().toLowerCase()
  if (contentType !== 'application/json') {
    req.resume()
    throw new RequestError(415, 'Gunakan format JSON untuk mengirim data.')
  }
  if (Number(req.headers['content-length']) > BODY_LIMIT) {
    req.resume()
    throw new RequestError(413, 'Data yang dikirim terlalu besar.')
  }

  const body = await new Promise((resolve, reject) => {
    const chunks = []
    let bytes = 0
    let finished = false
    const fail = (error) => {
      if (finished) return
      finished = true
      reject(error)
    }
    req.on('data', (chunk) => {
      if (finished) return
      bytes += chunk.length
      if (bytes > BODY_LIMIT) {
        fail(new RequestError(413, 'Data yang dikirim terlalu besar.'))
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (finished) return
      finished = true
      resolve(Buffer.concat(chunks).toString('utf8'))
    })
    req.on('error', () => fail(new RequestError(400, 'Data tidak dapat dibaca.')))
    req.on('aborted', () => fail(new RequestError(400, 'Pengiriman data terputus.')))
  })

  try {
    return JSON.parse(body)
  } catch {
    throw new RequestError(400, 'Data JSON tidak valid.')
  }
}

/** Standard Node/Connect middleware; pass next to continue to Vite or static serving. */
export function createGuestResponseHandler({ dataDir, store: providedStore } = {}) {
  const directory = path.resolve(dataDir || process.env.WEDDING_DATA_DIR || path.join(process.cwd(), 'data'))
  const filePath = path.join(directory, FILE_NAME)
  const store = providedStore || createFileStore(filePath)

  return async function guestResponseHandler(req, res, next) {
    let pathname
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    } catch {
      sendJson(res, 400, { ok: false, error: 'Alamat permintaan tidak valid.' })
      return
    }

    // Vite can otherwise serve files from the project root and via /@fs/ URLs.
    if (pathname.split('/').some((part) => part === FILE_NAME || part.startsWith(`${FILE_NAME}.`))) {
      sendJson(res, 404, { ok: false, error: 'Tidak ditemukan.' })
      return
    }

    const routes = {
      '/api/guest-responses': 'GET',
      '/api/rsvps': 'POST',
      '/api/wishes': 'POST',
    }
    const expectedMethod = routes[pathname]
    if (!expectedMethod) {
      if (pathname === '/api' || pathname.startsWith('/api/')) {
        sendJson(res, 404, { ok: false, error: 'Tidak ditemukan.' })
      } else if (next) {
        return next()
      } else {
        sendJson(res, 404, { ok: false, error: 'Tidak ditemukan.' })
      }
      return
    }
    if (req.method !== expectedMethod) {
      req.resume()
      sendJson(res, 405, { ok: false, error: 'Metode permintaan tidak tersedia.' }, { Allow: expectedMethod })
      return
    }

    try {
      if (expectedMethod === 'GET') {
        sendJson(res, 200, snapshot(await store.read()))
        return
      }

      const kind = pathname === '/api/rsvps' ? 'rsvp' : 'wish'
      const payload = validatePayload(await readJsonBody(req), kind)
      const result = await store.submit(kind, payload)
      sendJson(res, 200, { ok: true, ...result })
    } catch (error) {
      sendJson(res, error instanceof RequestError ? error.status : 500, {
        ok: false,
        error: error instanceof RequestError ? error.message : 'Data belum tersimpan. Silakan coba kembali.',
      })
    }
  }
}
