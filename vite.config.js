import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

const certificate = fileURLToPath(new URL('./certs/dev-cert.pem', import.meta.url))
const privateKey = fileURLToPath(new URL('./certs/dev-key.pem', import.meta.url))

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    https: {
      cert: readFileSync(certificate),
      key: readFileSync(privateKey),
    },
  },
})
