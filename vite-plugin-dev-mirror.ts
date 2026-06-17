import fs from 'node:fs/promises'
import path from 'node:path'
import type { Plugin } from 'vite'

const MIRROR_ROUTE = '/__dev/mirror'

export interface DevMirrorPluginOptions {
  /** Vite config root (projocalypse package dir when submoduled). */
  viteRoot: string
  /** Host repo root for `.projocalypse/dev-mirror.json`. Defaults to viteRoot. */
  mirrorRoot?: string
}

function resolveMirrorRoot(options: DevMirrorPluginOptions): string {
  const fromEnv = process.env.PROJOCALYPSE_MIRROR_ROOT?.trim()
  if (fromEnv) return path.resolve(options.viteRoot, fromEnv)
  return options.mirrorRoot ?? options.viteRoot
}

export function devMirrorPlugin(options: DevMirrorPluginOptions | string): Plugin {
  const mirrorRoot = typeof options === 'string' ? options : resolveMirrorRoot(options)
  const mirrorPath = path.join(mirrorRoot, '.projocalypse', 'dev-mirror.json')

  return {
    name: 'projocalypse-dev-mirror',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith(MIRROR_ROUTE)) {
          next()
          return
        }

        if (req.method === 'GET') {
          try {
            const raw = await fs.readFile(mirrorPath, 'utf8')
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 200
            res.end(raw)
          } catch {
            res.statusCode = 404
            res.end('{}')
          }
          return
        }

        if (req.method === 'PUT' || req.method === 'POST') {
          try {
            const chunks: Buffer[] = []
            for await (const chunk of req) {
              chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
            }
            const body = Buffer.concat(chunks).toString('utf8')
            JSON.parse(body)
            await fs.mkdir(path.dirname(mirrorPath), { recursive: true })
            await fs.writeFile(mirrorPath, body, 'utf8')
            res.statusCode = 204
            res.end()
          } catch (err) {
            res.statusCode = 400
            res.end(err instanceof Error ? err.message : 'Invalid mirror payload')
          }
          return
        }

        res.statusCode = 405
        res.end('Method not allowed')
      })
    },
  }
}

export const DEV_MIRROR_DISK_URL = MIRROR_ROUTE
