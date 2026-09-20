'use strict';
// Preload for the local top bar only.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bar', {
  minimize: () => ipcRenderer.send('win:minimize'),
  fullscreen: () => ipcRenderer.send('win:fullscreen'),
  toggleMaximize: () => ipcRenderer.send('win:toggle-maximize'),
  close: () => ipcRenderer.send('win:close'),
  onState: (cb) => ipcRenderer.on('win:state', (_e, s) => cb(s)),
  platform: process.platform,
});
