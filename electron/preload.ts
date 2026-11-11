import { contextBridge, ipcRenderer } from 'electron';
import type { AIRequest } from '../src/types';

const api = {
  isDesktop: true,
  loadProjects: () => ipcRenderer.invoke('storage:loadProjects'),
  saveProjects: (projects: unknown) => ipcRenderer.invoke('storage:saveProjects', projects),
  flushProjects: (projects: unknown) => ipcRenderer.invoke('storage:flushProjects', projects),
  loadProjectsBackup: () => ipcRenderer.invoke('storage:loadProjectsBackup'),
  loadAISessions: () => ipcRenderer.invoke('storage:loadAISessions'),
  saveAISessions: (payload: unknown) => ipcRenderer.invoke('storage:saveAISessions', payload),
  loadSettings: () => ipcRenderer.invoke('storage:loadSettings'),
  saveSettings: (settings: unknown) => ipcRenderer.invoke('storage:saveSettings', settings),
  setSecret: (key: string, value: string) => ipcRenderer.invoke('secrets:set', key, value),
  getSecret: (key: string) => ipcRenderer.invoke('secrets:get', key),
  saveZip: (filename: string, data: Uint8Array) => ipcRenderer.invoke('dialog:saveZip', filename, data),
  saveFile: (filename: string, data: Uint8Array, extension: string) =>
    ipcRenderer.invoke('dialog:saveFile', filename, data, extension),
  pickAssets: () => ipcRenderer.invoke('dialog:pickAssets'),
  appInfo: () => ipcRenderer.invoke('app:info'),
  openPath: (p: string) => ipcRenderer.invoke('shell:openPath', p),
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  ollamaTags: (url: string) => ipcRenderer.invoke('ai:ollamaTags', url),
  aiChat: (req: AIRequest) => ipcRenderer.invoke('ai:chat', req),
  onAiChunk: (cb: (payload: { id: string; delta: string }) => void) => {
    const handler = (_e: unknown, payload: { id: string; delta: string }) => cb(payload);
    ipcRenderer.on('ai:chunk', handler);
    return () => ipcRenderer.removeListener('ai:chunk', handler);
  },
  onFlushRequest: (cb: () => void) => {
    const handler = () => cb();
    ipcRenderer.on('app:flush', handler);
    return () => ipcRenderer.removeListener('app:flush', handler);
  },
  flushDone: () => ipcRenderer.send('app:flush-done'),
  checkForUpdates: (channel?: string) => ipcRenderer.invoke('update:check', channel),
  downloadUpdate: (url: string) => ipcRenderer.invoke('update:download', url),
  installUpdate: (filePath: string) => ipcRenderer.invoke('update:install', filePath),
  onUpdateAvailable: (cb: (info: unknown) => void) => {
    const handler = (_e: unknown, info: unknown) => cb(info);
    ipcRenderer.on('update:available', handler);
    return () => ipcRenderer.removeListener('update:available', handler);
  },
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
};

contextBridge.exposeInMainWorld('webora', api);

export type WeboraApi = typeof api;
