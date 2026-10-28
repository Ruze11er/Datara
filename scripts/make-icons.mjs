// Generates the Datara logo and every icon file from one design.
// Run with: npm run icons   (uses Electron to render the SVG, so it matches what Chromium draws)
//
// Output:
//   build/icon.svg                       the full logo (source of truth)
//   build/icon-small.svg                 simplified version for 16–32 px (no glow, bolder bars)
//   build/icon.ico                       Windows icon: 16–256 px (window, taskbar, installer, shortcut)
//   build/icon.png                       512 px PNG
//   src/renderer/src/assets/logo.svg     the small version, used in the sidebar
//   src/renderer/public/favicon.svg      for the future web version

import { app, BrowserWindow } from 'electron'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// ---------------------------------------------------------------- design

/**
 * A bar with a slanted top (rising to the right) and rounded corners.
 * x, w: position and width; top: y of the top-left corner; base: y of the bottom; slant: rise across the top.
 */
function barPath(x, w, top, base, slant, r, rb) {
  const s = (slant * r) / w // rise across the rounded part of the top edge
  return [
    `M${x},${base - rb}`,
    `L${x},${top + r}`,
    `Q${x},${top} ${x + r},${top - s}`,
    `L${x + w - r},${top - slant + s}`,
    `Q${x + w},${top - slant} ${x + w},${top - slant + r}`,
    `L${x + w},${base - rb}`,
    `Q${x + w},${base} ${x + w - rb},${base}`,
    `L${x + rb},${base}`,
    `Q${x},${base} ${x},${base - rb}`,
    'Z'
  ].join(' ')
}

/** The logo as SVG. `small` drops the glow, sheen, and edge, and makes the bars bolder for tiny sizes. */
function logoSvg({ small = false } = {}) {
  const tile = small ? { inset: 8, radius: 104 } : { inset: 16, radius: 108 }
  const w = small ? 74 : 60
  const gap = small ? 22 : 28
  const x0 = (512 - (4 * w + 3 * gap)) / 2
  const base = small ? 418 : 400
  const slant = small ? 12 : 14
  // Heights of the four bars (left edge), rising with a slight dip at the end, as in the original sketch.
  const heights = small ? [112, 180, 262, 206] : [100, 164, 240, 186]
  const bars = heights.map((h, i) => barPath(x0 + i * (w + gap), w, base - h, base, slant, small ? 16 : 13, small ? 8 : 9))
  const tallX = x0 + 2 * (w + gap) + w / 2
  const tallTop = base - heights[2] - slant / 2
  const dot = { cx: tallX, cy: tallTop - (small ? 52 : 47), r: small ? 30 : 20 }
  const t = tile.inset
  const size = 512 - 2 * t

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <title>Datara</title>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#22345a"/>
      <stop offset="1" stop-color="#0a1121"/>
    </linearGradient>
    <radialGradient id="bgGlow" cx="0.5" cy="0.72" r="0.55">
      <stop offset="0" stop-color="#1fd1a8" stop-opacity="${small ? 0.12 : 0.2}"/>
      <stop offset="1" stop-color="#1fd1a8" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bar" gradientUnits="userSpaceOnUse" x1="0" y1="${base - heights[2] - slant}" x2="0" y2="${base}">
      <stop offset="0" stop-color="#8ff8de"/>
      <stop offset="0.45" stop-color="#3ad6b6"/>
      <stop offset="1" stop-color="#11938a"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.28"/>
      <stop offset="0.38" stop-color="#ffffff" stop-opacity="0.06"/>
      <stop offset="0.55" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="dot" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#eafff9"/>
      <stop offset="0.45" stop-color="#6ff2d1"/>
      <stop offset="1" stop-color="#20c4a2"/>
    </radialGradient>
    <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur"/>
      <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.6 0" result="soft"/>
      <feMerge><feMergeNode in="soft"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect x="${t}" y="${t}" width="${size}" height="${size}" rx="${tile.radius}" fill="url(#bg)"/>
  <rect x="${t}" y="${t}" width="${size}" height="${size}" rx="${tile.radius}" fill="url(#bgGlow)"/>
  ${small ? '' : `<rect x="${t + 1.5}" y="${t + 1.5}" width="${size - 3}" height="${size - 3}" rx="${tile.radius - 1.5}" fill="none" stroke="#ffffff" stroke-opacity="0.08" stroke-width="3"/>`}
  <g${small ? '' : ' filter="url(#glow)"'}>
    ${bars.map((d) => `<path d="${d}" fill="url(#bar)"/>`).join('\n    ')}
    <circle cx="${dot.cx}" cy="${dot.cy}" r="${dot.r}" fill="url(#dot)"/>
  </g>
  ${small ? '' : bars.map((d) => `<path d="${d}" fill="url(#sheen)"/>`).join('\n  ')}
</svg>
`
}

// ---------------------------------------------------------------- rendering

const ICO_SIZES = [16, 20, 24, 32, 40, 48, 64, 96, 128, 256]
const SMALL_MAX = 32

async function render(win, svg, size) {
  const sized = svg.replace('width="512" height="512"', `width="${size}" height="${size}"`)
  const html = `<!doctype html><html><body style="margin:0;background:transparent;overflow:hidden">${sized}</body></html>`
  await win.loadURL(`data:text/html;base64,${Buffer.from(html).toString('base64')}`)
  await new Promise((r) => setTimeout(r, 150))
  let image = await win.webContents.capturePage({ x: 0, y: 0, width: size, height: size })
  const actual = image.getSize()
  if (actual.width !== size || actual.height !== size) image = image.resize({ width: size, height: size, quality: 'best' })
  return image.toPNG()
}

/** An .ico file with PNG-compressed images (supported by Windows Vista and later). */
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(images.length, 4)
  let offset = header.length
  images.forEach(({ size, png }, i) => {
    const e = 6 + i * 16
    header.writeUInt8(size >= 256 ? 0 : size, e) // 0 means 256
    header.writeUInt8(size >= 256 ? 0 : size, e + 1)
    header.writeUInt8(0, e + 2) // palette colours
    header.writeUInt8(0, e + 3) // reserved
    header.writeUInt16LE(1, e + 4) // colour planes
    header.writeUInt16LE(32, e + 6) // bits per pixel
    header.writeUInt32LE(png.length, e + 8)
    header.writeUInt32LE(offset, e + 12)
    offset += png.length
  })
  return Buffer.concat([header, ...images.map((i) => i.png)])
}

app.commandLine.appendSwitch('force-device-scale-factor', '1')
app.whenReady().then(async () => {
  try {
    const full = logoSvg()
    const small = logoSvg({ small: true })
    const write = async (path, data) => {
      await mkdir(dirname(join(root, path)), { recursive: true })
      await writeFile(join(root, path), data)
      console.log(`[icons] ${path}`)
    }
    await write('build/icon.svg', full)
    await write('build/icon-small.svg', small)
    await write('src/renderer/src/assets/logo.svg', small)
    await write('src/renderer/public/favicon.svg', small)

    const win = new BrowserWindow({
      show: false,
      width: 512,
      height: 512,
      transparent: true,
      frame: false,
      useContentSize: true,
      webPreferences: { offscreen: true }
    })
    const images = []
    for (const size of ICO_SIZES) images.push({ size, png: await render(win, size <= SMALL_MAX ? small : full, size) })
    await write('build/icon.ico', ico(images))
    await write('build/icon.png', await render(win, full, 512))
  } catch (err) {
    console.error(err)
    process.exitCode = 1
  }
  app.quit()
})
