import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

const root = import.meta.dirname
const dataFile = path.join(root, 'public', 'data', 'catalog.json')

function readBody(req: import('http').IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(Buffer.from(c)))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function adminApi(): Plugin {
  return {
    name: 'admin-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()
        try {
          if (req.method === 'POST' && req.url === '/api/catalog') {
            const body = await readBody(req)
            fs.mkdirSync(path.dirname(dataFile), { recursive: true })
            fs.writeFileSync(dataFile, body)
            res.setHeader('Content-Type', 'application/json')
            res.end('{"ok":true}')
            return
          }
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: String(e) }))
          return
        }
        next()
      })
    },
  }
}

export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react(), adminApi()],
  server: {
    watch: {
      ignored: ['**/_extracted_maps/**', '**/public/maps/**', '**/public/icons/**'],
    },
  },
})
