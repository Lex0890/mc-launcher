// src/preload.js
// Exposes a safe, typed API to the renderer via contextBridge
// NEVER expose Node.js directly — all access goes through window.electronAPI

const { contextBridge, ipcRenderer } = require('electron');

// ─── Helper: create a type-safe IPC invoker ───────────────────────────────────
const invoke = (channel, data) => ipcRenderer.invoke(channel, data);
const send = (channel, data) => ipcRenderer.send(channel, data);

// ─── Helper: subscribe to events ──────────────────────────────────────────────
const on = (channel, callback) => {
  const handler = (_, ...args) => callback(...args);
  ipcRenderer.on(channel, handler);
  // Return unsubscribe function
  return () => ipcRenderer.removeListener(channel, handler);
};

const once = (channel, callback) => {
  ipcRenderer.once(channel, (_, ...args) => callback(...args));
};

// ─── Expose API ───────────────────────────────────────────────────────────────
contextBridge.exposeInMainWorld('electronAPI', {

  // ── Window controls ──────────────────────────────────────────────────────────
  window: {
    minimize: () => send('window:minimize'),
    maximize: () => send('window:maximize'),
    close: () => send('window:close'),
    isMaximized: () => invoke('window:isMaximized'),
  },

  // ── Profiles (offline auth) ──────────────────────────────────────────────────
  profiles: {
    list: () => invoke('profiles:list'),
    create: (data) => invoke('profiles:create', data),
    delete: (data) => invoke('profiles:delete', data),
    setActive: (data) => invoke('profiles:setActive', data),
    getActive: () => invoke('profiles:getActive'),
  },

  // ── Instances ────────────────────────────────────────────────────────────────
  instances: {
    list: () => invoke('instances:list'),
    create: (config) => invoke('instances:create', config),
    update: (data) => invoke('instances:update', data),
    delete: (data) => invoke('instances:delete', data),
    getMods: (data) => invoke('instances:getMods', data),
    toggleMod: (data) => invoke('instances:toggleMod', data),
    deleteMod: (data) => invoke('instances:deleteMod', data),
  },

  // ── Versions ─────────────────────────────────────────────────────────────────
  versions: {
    fetchManifest: () => invoke('versions:fetchManifest'),
    install: (data) => invoke('versions:install', data),
    getInstalled: () => invoke('versions:getInstalled'),
  },

  // ── Java ─────────────────────────────────────────────────────────────────────
  java: {
    detect: () => invoke('java:detect'),
    listManaged: () => invoke('java:listManaged'),
    download: (data) => invoke('java:download', data),
    getForVersion: (data) => invoke('java:getForVersion', data),
  },

  // ── Game launch ──────────────────────────────────────────────────────────────
  game: {
    launch: (data) => invoke('game:launch', data),
    kill: () => invoke('game:kill'),
    isRunning: () => invoke('game:isRunning'),
  },

  // ── Modrinth ─────────────────────────────────────────────────────────────────
  modrinth: {
    search: (data) => invoke('modrinth:search', data),
    getVersions: (data) => invoke('modrinth:getVersions', data),
    installMod: (data) => invoke('modrinth:installMod', data),
  },

  // ── Settings ─────────────────────────────────────────────────────────────────
  settings: {
    get: () => invoke('settings:get'),
    set: (updates) => invoke('settings:set', updates),
  },

  // ── System ───────────────────────────────────────────────────────────────────
  system: {
    info: () => invoke('system:info'),
    openFolder: (data) => invoke('system:openFolder', data),
  },

  // ── Event listeners (renderer subscribes to main events) ─────────────────────
  events: {
    // Download progress
    onDownloadProgress: (cb) => on('download:progress', cb),
    onDownloadError: (cb) => on('download:error', cb),

    // Java progress
    onJavaProgress: (cb) => on('java:progress', cb),

    // Game events
    onGameStatus: (cb) => on('game:status', cb),
    onGameLog: (cb) => on('game:log', cb),
    onGameClosed: (cb) => on('game:closed', cb),
  },
});

// ─── DOM ready indicator ──────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  console.log('[Preload] electronAPI exposed');
});
