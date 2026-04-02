import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { setupIpcHandlers } from './ipcHandlers';
import { initStore } from './store';

const isDev = process.env.NODE_ENV === 'development';
const VITE_DEV_SERVER_URL = 'http://localhost:5173';

let mainWindow: BrowserWindow | null = null;

export const APP_DATA_DIR: string = path.join(app.getPath('appData'), '.mclauncher');
export const INSTANCES_DIR: string = path.join(APP_DATA_DIR, 'instances');
export const VERSIONS_DIR: string = path.join(APP_DATA_DIR, 'versions');
export const ASSETS_DIR: string = path.join(APP_DATA_DIR, 'assets');
export const LIBRARIES_DIR: string = path.join(APP_DATA_DIR, 'libraries');
export const JAVA_DIR: string = path.join(APP_DATA_DIR, 'java');

function ensureDirectories(): void {
  const dirs = [APP_DATA_DIR, INSTANCES_DIR, VERSIONS_DIR, ASSETS_DIR, LIBRARIES_DIR, JAVA_DIR];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

function createWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    frame: false,
    transparent: false,
    backgroundColor: '#0f0f13',
    show: false,
    icon: path.join(__dirname, '../../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

export const getMainWindow = (): BrowserWindow | null => mainWindow;

ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window:close', () => mainWindow?.close());
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false);

app.whenReady().then(() => {
  ensureDirectories();
  initStore();

  setupIpcHandlers({
    mainWindow: () => mainWindow,
    paths: {
      appData: APP_DATA_DIR,
      instances: INSTANCES_DIR,
      versions: VERSIONS_DIR,
      assets: ASSETS_DIR,
      libraries: LIBRARIES_DIR,
      java: JAVA_DIR,
    },
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.origin !== VITE_DEV_SERVER_URL && !navigationUrl.startsWith('file://')) {
      event.preventDefault();
    }
  });
});


