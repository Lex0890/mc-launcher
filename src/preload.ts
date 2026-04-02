import { contextBridge, ipcRenderer } from 'electron';

type IpcCallback = (...args: unknown[]) => void;

const invoke = (channel: string, data?: unknown): Promise<unknown> => ipcRenderer.invoke(channel, data);
const send = (channel: string, data?: unknown): void => { ipcRenderer.send(channel, data); };

const on = (channel: string, callback: IpcCallback): (() => void) => {
  const handler = (_: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

contextBridge.exposeInMainWorld('electronAPI', {
  window: {
    minimize: () => send('window:minimize'),
    maximize: () => send('window:maximize'),
    close: () => send('window:close'),
    isMaximized: () => invoke('window:isMaximized') as Promise<boolean>,
  },

  profiles: {
    list: () => invoke('profiles:list') as Promise<unknown[]>,
    create: (data: { username: string }) => invoke('profiles:create', data) as Promise<unknown>,
    delete: (data: { id: string }) => invoke('profiles:delete', data) as Promise<boolean>,
    setActive: (data: { id: string }) => invoke('profiles:setActive', data) as Promise<boolean>,
    getActive: () => invoke('profiles:getActive') as Promise<unknown | null>,
  },

  instances: {
    list: () => invoke('instances:list') as Promise<unknown[]>,
    create: (config: unknown) => invoke('instances:create', config) as Promise<unknown>,
    update: (data: { instanceId: string; updates: unknown }) => invoke('instances:update', data) as Promise<unknown>,
    delete: (data: { instanceId: string }) => invoke('instances:delete', data) as Promise<boolean>,
    getMods: (data: { instanceId: string }) => invoke('instances:getMods', data) as Promise<unknown[]>,
    toggleMod: (data: { instanceId: string; filename: string }) => invoke('instances:toggleMod', data) as Promise<unknown>,
    deleteMod: (data: { instanceId: string; filename: string }) => invoke('instances:deleteMod', data) as Promise<boolean>,
  },

  versions: {
    fetchManifest: () => invoke('versions:fetchManifest') as Promise<unknown>,
    install: (data: { instanceId: string; mcVersion: string; loader?: string; loaderVersion?: string }) => invoke('versions:install', data) as Promise<unknown>,
    getInstalled: () => invoke('versions:getInstalled') as Promise<string[]>,
  },

  loaders: {
    getVersions: (data: { loader: string; mcVersion: string }) => invoke('loaders:getVersions', data) as Promise<unknown>,
  },

  java: {
    detect: () => invoke('java:detect') as Promise<unknown>,
    listManaged: () => invoke('java:listManaged') as Promise<unknown[]>,
    download: (data: { majorVersion: number }) => invoke('java:download', data) as Promise<unknown>,
    getForVersion: (data: { mcVersion: string; customPath?: string }) => invoke('java:getForVersion', data) as Promise<unknown>,
  },

  game: {
    launch: (data: { instanceId: string }) => invoke('game:launch', data) as Promise<unknown>,
    kill: () => invoke('game:kill') as Promise<boolean>,
    isRunning: () => invoke('game:isRunning') as Promise<boolean>,
  },

  modrinth: {
    search: (data: { query?: string; mcVersion?: string; loader?: string; offset?: number; limit?: number }) => 
      invoke('modrinth:search', data) as Promise<unknown>,
    getVersions: (data: { projectId: string; mcVersion?: string; loader?: string }) => 
      invoke('modrinth:getVersions', data) as Promise<unknown[]>,
    installMod: (data: { instanceId: string; versionData: unknown }) => 
      invoke('modrinth:installMod', data) as Promise<unknown>,
  },

  settings: {
    get: () => invoke('settings:get') as Promise<unknown>,
    set: (updates: unknown) => invoke('settings:set', updates) as Promise<unknown>,
  },

  system: {
    info: () => invoke('system:info') as Promise<unknown>,
    openFolder: (data: { folderPath: string }) => invoke('system:openFolder', data) as Promise<boolean>,
  },

  events: {
    onDownloadProgress: (cb: (...args: unknown[]) => void) => on('download:progress', cb),
    onDownloadError: (cb: (...args: unknown[]) => void) => on('download:error', cb),
    onJavaProgress: (cb: (...args: unknown[]) => void) => on('java:progress', cb),
    onGameStatus: (cb: (...args: unknown[]) => void) => on('game:status', cb),
    onGameLog: (cb: (...args: unknown[]) => void) => on('game:log', cb),
    onGameClosed: (cb: (...args: unknown[]) => void) => on('game:closed', cb),
  },
});
