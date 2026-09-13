import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: { proxy: { '/api': { target: `http://127.0.0.1:${process.env.AI_PORT || '3001'}`, changeOrigin: false } } },
  build: {
    minify: true,
  },
})
