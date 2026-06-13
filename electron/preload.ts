import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getDb: () => ipcRenderer.invoke('get-db'),
  saveDb: (data: any) => ipcRenderer.invoke('save-db', data),
  fetchRss: (url: string) => ipcRenderer.invoke('fetch-rss', url)
});
