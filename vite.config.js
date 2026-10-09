import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  // Relative asset URLs work both at a GitHub Pages project path and locally.
  base: './',
  ...(command === 'serve' ? {
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      // Browser test profiles contain files Chrome locks on Windows.
      // They are verification artifacts, not application source files.
      watch: {
        ignored: ['**/.tools/**', '**/certs/**'],
      },
      https: {
        cert: readFileSync(fileURLToPath(new URL('./certs/dev-cert.pem', import.meta.url))),
        key: readFileSync(fileURLToPath(new URL('./certs/dev-key.pem', import.meta.url))),
      },
    },
  } : {}),
}))
