import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

const vercel = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: { proxy: { '/api': { target: `http://127.0.0.1:${process.env.AI_PORT || '3001'}`, changeOrigin: false } } },
  // Production security headers (vercel.json) are mirrored in preview so they are tested locally.
  preview: { headers: Object.fromEntries(vercel.headers[0].headers.map(h => [h.key, h.value])), proxy: { '/api': { target: `http://127.0.0.1:${process.env.AI_PORT || '3001'}`, changeOrigin: false } } },
  build: {
    minify: true,
  },
})
