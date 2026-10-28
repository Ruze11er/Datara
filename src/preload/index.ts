import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type DataraDesktopApi } from '@shared/api'

// The interface gets exactly these functions and nothing else from Node/Electron.
const api: DataraDesktopApi = {
  progress: {
    load: () => ipcRenderer.invoke(IPC.progressLoad),
    save: (data) => ipcRenderer.invoke(IPC.progressSave, data)
  }
}

contextBridge.exposeInMainWorld('datara', api)
