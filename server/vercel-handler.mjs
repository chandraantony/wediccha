import { createGuestResponseHandler } from './guest-responses.mjs'
import { createBlobGuestStore } from './blob-guest-store.mjs'

// Vercel Node.js serverless function for the guest-response API.
// Responses are stored in Vercel Blob (a private guest-responses.json file),
// because serverless functions cannot write to the local filesystem.
const handler = createGuestResponseHandler({ store: createBlobGuestStore() })

export default handler