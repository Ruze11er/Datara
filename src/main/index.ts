import { app, BrowserWindow, ipcMain, Menu, session, shell, type IpcMainInvokeEvent } from 'electron'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { IPC } from '@shared/api'
import { APP_ORIGIN, CONTENT_SECURITY_POLICY, handleAppScheme, registerAppScheme } from './appProtocol'
import { loadProgress, saveProgress } from './progressStore'

const devServerUrl = !app.isPackaged ? process.env['ELECTRON_RENDERER_URL'] : undefined

registerAppScheme()

// Only one copy of the app at a time, so two windows never fight over the progress file.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })
  app.whenReady().then(start)
}

/** True for URLs that belong to the app itself. */
function isAppUrl(url: string): boolean {
  return url.startsWith(`${APP_ORIGIN}/`) || (!!devServerUrl && url.startsWith(devServerUrl))
}

function assertTrustedSender(event: IpcMainInvokeEvent): void {
  const url = event.senderFrame?.url ?? ''
  if (!isAppUrl(url)) throw new Error('Blocked IPC call from untrusted page')
}

function hardenSecurity(): void {
  // The app never needs camera, microphone, notifications, etc.
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false))
  session.defaultSession.setPermissionCheckHandler(() => false)

  // In development the page comes from Vite's local server, so the security
  // policy is added here. Vite needs inline scripts and a websocket for hot reload.
  if (devServerUrl) {
    const devPolicy = CONTENT_SECURITY_POLICY.replace(
      "script-src 'self'",
      "script-src 'self' 'unsafe-inline'"
    ).replace("connect-src 'self'", "connect-src 'self' ws://localhost:*")
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [devPolicy] }
      })
    })
  }

  app.on('web-contents-created', (_event, contents) => {
    // Never navigate the app window away from the app.
    contents.on('will-navigate', (event) => {
      if (!isAppUrl(event.url)) event.preventDefault()
    })
    // Links to websites (e.g. lesson citations) open in the normal web browser.
    contents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https://')) void shell.openExternal(url)
      return { action: 'deny' }
    })
    contents.on('will-attach-webview', (event) => event.preventDefault())
  })
}

function registerIpc(): void {
  ipcMain.handle(IPC.progressLoad, (event) => {
    assertTrustedSender(event)
    return loadProgress()
  })
  ipcMain.handle(IPC.progressSave, (event, data: unknown) => {
    assertTrustedSender(event)
    return saveProgress(data)
  })
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 620,
    show: false,
    title: 'Datara',
    backgroundColor: '#f8fafc',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false
    }
  })

  win.once('ready-to-show', () => {
    if (!process.env['DATARA_SELFTEST']) win.show()
  })

  if (devServerUrl) void win.loadURL(devServerUrl)
  else void win.loadURL(`${APP_ORIGIN}/index.html`)

  return win
}

/**
 * Automated check used by `npm run selftest`: loads the app hidden, runs the
 * SQL and Python engines inside the real window, writes the results to a file
 * and quits. Proves the packaged app works offline.
 */
function runSelfTest(win: BrowserWindow, outFile: string): void {
  win.webContents.once('did-finish-load', async () => {
    let result: unknown
    try {
      result = await win.webContents.executeJavaScript('window.__dataraSelfTest()', true)
    } catch (err) {
      result = { ok: false, error: String(err) }
    }
    await writeFile(outFile, JSON.stringify(result, null, 2), 'utf8')
    app.exit((result as { ok?: boolean })?.ok ? 0 : 1)
  })
}

function start(): void {
  if (app.isPackaged) Menu.setApplicationMenu(null)
  if (!devServerUrl) handleAppScheme(join(__dirname, '../renderer'))
  hardenSecurity()
  registerIpc()

  const win = createWindow()
  const selfTestOut = process.env['DATARA_SELFTEST_OUT']
  if (process.env['DATARA_SELFTEST'] && selfTestOut) runSelfTest(win, selfTestOut)

  app.on('window-all-closed', () => app.quit())
}
