import { createServer } from 'node:http'
import { readFile, realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createGuestResponseHandler } from './guest-responses.mjs'

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function sendError(res, status, message) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end(message)
}

export function createWeddingServer({ distDir = path.join(process.cwd(), 'dist'), dataDir } = {}) {
  const staticRoot = path.resolve(distDir)
  const responses = createGuestResponseHandler({ dataDir })
  const serveStatic = async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD')
      sendError(res, 405, 'Method not allowed')
      return
    }
    let pathname
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    } catch {
      sendError(res, 400, 'Bad request')
      return
    }

    const requestedPath = path.resolve(staticRoot, `.${pathname}`)
    if (requestedPath !== staticRoot && !requestedPath.startsWith(`${staticRoot}${path.sep}`)) {
      sendError(res, 403, 'Forbidden')
      return
    }

    try {
      let filePath = requestedPath
      try {
        const information = await stat(filePath)
        if (information.isDirectory()) filePath = path.join(filePath, 'index.html')
      } catch (error) {
        if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error
        if (path.extname(pathname)) {
          sendError(res, 404, 'Not found')
          return
        }
        filePath = path.join(staticRoot, 'index.html')
      }
      const [canonicalRoot, canonicalFile] = await Promise.all([realpath(staticRoot), realpath(filePath)])
      if (!canonicalFile.startsWith(`${canonicalRoot}${path.sep}`)) {
        sendError(res, 403, 'Forbidden')
        return
      }
      const contents = await readFile(canonicalFile)
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[path.extname(canonicalFile).toLowerCase()] || 'application/octet-stream',
        'Content-Length': contents.length,
        'Cache-Control': 'no-cache',
      })
      res.end(req.method === 'HEAD' ? undefined : contents)
    } catch (error) {
      sendError(res, error.code === 'ENOENT' || error.code === 'ENOTDIR' ? 404 : 500, 'File unavailable')
    }
  }

  return createServer((req, res) => {
    responses(req, res, () => serveStatic(req, res)).catch(() => {
      if (!res.headersSent) sendError(res, 500, 'Request failed')
      else res.destroy()
    })
  })
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000)
  const host = process.env.HOST || '127.0.0.1'
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535')
  }
  const server = createWeddingServer()
  server.listen(port, host, () => {
    console.log(`Wedding invitation running at http://${host}:${port}`)
  })
}
