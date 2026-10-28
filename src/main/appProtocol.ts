import { protocol } from 'electron'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize, resolve, sep } from 'node:path'

// The packaged app is served from app://datara/ instead of file://.
// file:// can't reliably load WebAssembly or module workers, which the SQL and
// Python engines need, and a custom scheme lets us attach a strict security
// policy header to every response.

export const APP_SCHEME = 'app'
export const APP_HOST = 'datara'
export const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`

// Content Security Policy:
// - only the app's own files may load ('self'); no internet access (connect-src)
// - 'wasm-unsafe-eval' lets the SQL/Python engines compile WebAssembly
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "worker-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'"
].join('; ')

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.zip': 'application/zip',
  '.whl': 'application/zip',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.sqlite': 'application/octet-stream'
}

/** Must run before the app's `ready` event. */
export function registerAppScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: APP_SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, codeCache: true }
    }
  ])
}

/** Serves files from `rootDir` (the built renderer). Call after `ready`. */
export function handleAppScheme(rootDir: string): void {
  const root = resolve(rootDir)

  protocol.handle(APP_SCHEME, async (request) => {
    const url = new URL(request.url)
    if (url.host !== APP_HOST) return new Response('Not found', { status: 404 })

    let pathname = decodeURIComponent(url.pathname)
    if (pathname === '/' || pathname === '') pathname = '/index.html'

    // Block path tricks like /../../secret.txt
    const filePath = normalize(join(root, pathname))
    if (!filePath.startsWith(root + sep)) return new Response('Forbidden', { status: 403 })

    try {
      const body = await readFile(filePath)
      return new Response(body, {
        headers: {
          'Content-Type': MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
          'Content-Security-Policy': CONTENT_SECURITY_POLICY,
          'X-Content-Type-Options': 'nosniff'
        }
      })
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })
}
