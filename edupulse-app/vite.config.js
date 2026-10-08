import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createReadStream, readFileSync } from 'node:fs'
import { extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const vercel = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'))

// OCR runs in the browser. Its worker, engine, English model and the PDF image decoders are served
// from this origin, because the Content-Security-Policy only allows scripts from 'self'.
const OCR_ASSETS = {
  'worker.min.js': 'tesseract.js/dist/worker.min.js',
  'tesseract-core-lstm.wasm.js': 'tesseract.js-core/tesseract-core-lstm.wasm.js',
  'tesseract-core-simd-lstm.wasm.js': 'tesseract.js-core/tesseract-core-simd-lstm.wasm.js',
  'tesseract-core-relaxedsimd-lstm.wasm.js': 'tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js',
  'eng.traineddata.gz': '@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz',
  'pdf/jbig2.wasm': 'pdfjs-dist/wasm/jbig2.wasm',
  'pdf/openjpeg.wasm': 'pdfjs-dist/wasm/openjpeg.wasm',
  'pdf/qcms_bg.wasm': 'pdfjs-dist/wasm/qcms_bg.wasm',
}
const OCR_TYPES = { '.js': 'text/javascript', '.wasm': 'application/wasm', '.gz': 'application/octet-stream' }
const ocrSource = name => fileURLToPath(new URL(`./node_modules/${OCR_ASSETS[name]}`, import.meta.url))
function ocrAssets() {
  return {
    name: 'edupulse-ocr-assets',
    configureServer(server) {
      server.middlewares.use('/ocr/', (req, res, next) => {
        const name = decodeURIComponent((req.url || '').split('?')[0].replace(/^\//, ''))
        if (!Object.hasOwn(OCR_ASSETS, name)) return next()
        res.setHeader('Content-Type', OCR_TYPES[extname(name)])
        createReadStream(ocrSource(name)).pipe(res)
      })
    },
    generateBundle() {
      for (const name of Object.keys(OCR_ASSETS)) this.emitFile({ type: 'asset', fileName: `ocr/${name}`, source: readFileSync(ocrSource(name)) })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), ocrAssets()],
  base: '/',
  server: { proxy: { '/api': { target: `http://127.0.0.1:${process.env.AI_PORT || '3001'}`, changeOrigin: false } } },
  // Production security headers (vercel.json) are mirrored in preview so they are tested locally.
  preview: { headers: Object.fromEntries(vercel.headers[0].headers.map(h => [h.key, h.value])), proxy: { '/api': { target: `http://127.0.0.1:${process.env.AI_PORT || '3001'}`, changeOrigin: false } } },
  build: {
    minify: true,
  },
})
