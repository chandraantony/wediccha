import { BlobNotFoundError, BlobPreconditionFailedError, get, put } from '@vercel/blob'
import { snapshot, validateStoredData } from './guest-responses.mjs'

function emptyData() {
  return { version: 1, rsvps: [], wishes: [] }
}

/**
 * Guest responses persisted as a single private JSON file in Vercel Blob.
 *
 * Serverless filesystems are read-only, so the JSON file lives in Blob storage
 * instead of on disk. Writes use the blob ETag with `ifMatch` and retry on a
 * conflict, so two concurrent submissions cannot overwrite each other.
 *
 * Requires the `BLOB_READ_WRITE_TOKEN` environment variable, which Vercel sets
 * when a Blob store is connected to the project. The store must allow private
 * blobs, because the file holds every RSVP record.
 */
export function createBlobGuestStore({
  pathname = process.env.WEDDING_BLOB_PATH || 'wedding/guest-responses.json',
  maxAttempts = 5,
  retryDelayMs = 25,
  blob = { get, put },
  isNotFound = (error) => error instanceof BlobNotFoundError,
  isPreconditionFailed = (error) => error instanceof BlobPreconditionFailedError,
} = {}) {
  // Serialize writes inside one warm function instance; cross-instance races are
  // resolved by the ETag check below.
  let queue = Promise.resolve()
  function serialize(operation) {
    const result = queue.then(operation)
    queue = result.then(() => undefined, () => undefined)
    return result
  }

  function wait(attempt) {
    const backoff = retryDelayMs * 2 ** attempt
    return new Promise((resolve) => setTimeout(resolve, backoff + Math.random() * backoff))
  }

  async function readFile() {
    let result
    try {
      result = await blob.get(pathname, { access: 'private', useCache: false })
    } catch (error) {
      if (isNotFound(error)) return { data: emptyData(), etag: null }
      throw error
    }
    if (!result || result.statusCode !== 200) return { data: emptyData(), etag: null }

    const text = await new Response(result.stream).text()
    return { data: validateStoredData(JSON.parse(text)), etag: result.blob.etag }
  }

  async function writeFile(data, etag) {
    const options = {
      access: 'private',
      addRandomSuffix: false,
      contentType: 'application/json',
      cacheControlMaxAge: 60,
    }
    if (etag) {
      // Update only if nobody else changed the file since we read it.
      options.allowOverwrite = true
      options.ifMatch = etag
    } else {
      // First write: let exactly one concurrent creator win.
      options.allowOverwrite = false
    }
    await blob.put(pathname, `${JSON.stringify(data, null, 2)}\n`, options)
  }

  return {
    async read() {
      return (await readFile()).data
    },

    async submit(kind, payload) {
      return serialize(async () => {
        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
          const { data, etag } = await readFile()
          const records = kind === 'rsvp' ? data.rsvps : data.wishes
          const index = records.findIndex((record) => record.id === payload.id)
          if (kind === 'wish' && index !== -1) return snapshot(data)

          const record = {
            ...payload,
            createdAt: index === -1 ? new Date().toISOString() : records[index].createdAt,
          }
          if (index === -1) records.push(record)
          else records[index] = record

          try {
            await writeFile(data, etag)
            return snapshot(data)
          } catch (error) {
            // Retry when another invocation created or changed the file first.
            if ((isPreconditionFailed(error) || etag === null) && attempt < maxAttempts - 1) {
              await wait(attempt)
              continue
            }
            throw error
          }
        }
        throw new Error('Data belum tersimpan karena terlalu banyak perubahan bersamaan.')
      })
    },
  }
}