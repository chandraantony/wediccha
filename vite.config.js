import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { createGuestResponseHandler } from './server/guest-responses.mjs'

const guestResponsesApi = () => ({
  name: 'guest-responses-api',
  configureServer(server) {
    server.middlewares.use(createGuestResponseHandler())
  },
  configurePreviewServer(server) {
    server.middlewares.use(createGuestResponseHandler())
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), guestResponsesApi()],
  server: {
    fs: {
      deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/data/**', '**/guest-responses.json*'],
    },
  },
})
