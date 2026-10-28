import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type DataraDesktopApi } from '@shared/api'

// The interface gets exactly these functions and nothing else from Node/Electron.
const api: DataraDesktopApi = {
  progress: {
    load: () => ipcRenderer.invoke(IPC.progressLoad),
    save: (data) => ipcRenderer.invoke(IPC.progressSave, data),
    exportBackup: (data) => ipcRenderer.invoke(IPC.progressExport, data),
    importBackup: () => ipcRenderer.invoke(IPC.progressImport)
  }
}

contextBridge.exposeInMainWorld('datara', api)
