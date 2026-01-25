const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  encryptValue: (value) => ipcRenderer.invoke('encrypt-value', value),
  decryptValue: (encryptedValue) => ipcRenderer.invoke('decrypt-value', encryptedValue),
  createDesktopEntry: () => ipcRenderer.invoke('create-desktop-entry'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppPath: (name) => ipcRenderer.invoke('get-app-path', name),
  onMessage: (callback) => ipcRenderer.on('message', callback),
  sendMessage: (channel, data) => ipcRenderer.send(channel, data),
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', url)
});

contextBridge.exposeInMainWorld('api', {
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  getFileAccessStatus: () => ipcRenderer.invoke('get-file-access-status'),
  toggleFileAccess: (enabled) => ipcRenderer.invoke('toggle-file-access', enabled),
  readFile: (path) => ipcRenderer.invoke('read-file', path),
  writeFile: (path, content) => ipcRenderer.invoke('write-file', { path, content }),
  listDirectory: (path) => ipcRenderer.invoke('list-directory', path),
  getFileStats: (path) => ipcRenderer.invoke('get-file-stats', path),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  apiKeys: {
    get: () => ipcRenderer.invoke('api-keys:get'),
    set: (keys) => ipcRenderer.invoke('api-keys:set', keys),
    delete: (keyNames) => ipcRenderer.invoke('api-keys:delete', keyNames),
    getStatus: () => ipcRenderer.invoke('api-keys:get-status')
  }
});
