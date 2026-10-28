import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC, type DataraDesktopApi } from '@shared/api'

// The interface gets exactly these functions and nothing else from Node/Electron.
const api: DataraDesktopApi = {
  progress: {
    load: () => ipcRenderer.invoke(IPC.progressLoad),
    save: (data) => ipcRenderer.invoke(IPC.progressSave, data),
    exportBackup: (data) => ipcRenderer.invoke(IPC.progressExport, data),
    importBackup: () => ipcRenderer.invoke(IPC.progressImport)
  },
  window: {
    isFullScreen: () => ipcRenderer.invoke(IPC.windowIsFullScreen),
    toggleFullScreen: () => ipcRenderer.invoke(IPC.windowToggleFullScreen),
    onFullScreenChange: (listener) => {
      // Only the boolean is passed on, never the raw IPC event.
      const handler = (_event: IpcRendererEvent, fullScreen: boolean) => listener(fullScreen === true)
      ipcRenderer.on(IPC.windowFullScreenChanged, handler)
      return () => ipcRenderer.removeListener(IPC.windowFullScreenChanged, handler)
    }
  }
}

contextBridge.exposeInMainWorld('datara', api)
