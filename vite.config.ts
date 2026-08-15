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

function slimPages(): Plugin {
  return {
    name: 'slim-pages',
    apply: 'build',
    closeBundle() {
      const dist = path.join(root, 'dist')
      fs.rmSync(path.join(dist, 'maps', 'screens'), { recursive: true, force: true })
      fs.rmSync(path.join(dist, 'maps', 'thumbs'), { recursive: true, force: true })
      const catalogPath = path.join(dist, 'data', 'catalog.json')
      if (fs.existsSync(catalogPath)) {
        const raw = JSON.parse(fs.readFileSync(catalogPath, 'utf8')) as {
          guides?: Record<
            string,
            Record<string, { publishedVersionId?: string | null; versions?: { id: string }[] }>
          >
        }
        const guides: typeof raw.guides = {}
        for (const [mapId, modes] of Object.entries(raw.guides || {})) {
          const slim: NonNullable<typeof guides>[string] = {}
          for (const [modeId, g] of Object.entries(modes)) {
            const id = g.publishedVersionId
            if (!id) continue
            const ver = g.versions?.find((v) => v.id === id)
            if (!ver) continue
            slim[modeId] = { versions: [ver], publishedVersionId: id }
          }
          if (Object.keys(slim).length) guides[mapId] = slim
        }
        fs.writeFileSync(catalogPath, JSON.stringify({ guides }))
      }

      const catalog = JSON.parse(fs.readFileSync(dataFile, 'utf8')) as {
        guides?: Record<string, Record<string, { publishedVersionId?: string | null }>>
      }
      const keep = new Set<string>()
      for (const [mapId, modes] of Object.entries(catalog.guides || {})) {
        if (Object.values(modes).some((g) => g.publishedVersionId)) keep.add(mapId)
      }
      const mapsDir = path.join(dist, 'maps')
      if (!fs.existsSync(mapsDir)) return
      for (const name of fs.readdirSync(mapsDir)) {
        const id = name.replace(/\.(png|jpg)$/, '')
        const file = path.join(mapsDir, name)
        if (!keep.has(id)) {
          fs.unlinkSync(file)
          continue
        }
        if (name.endsWith('.png') && fs.existsSync(path.join(mapsDir, `${id}.jpg`))) {
          fs.unlinkSync(file)
        }
      }
    },
  }
}

export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react(), adminApi(), slimPages()],
  server: {
    watch: {
      ignored: ['**/_extracted_maps/**', '**/public/maps/**', '**/public/icons/**'],
    },
  },
  build: {
    modulePreload: { polyfill: false },
  },
})
