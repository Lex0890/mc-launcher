import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface Profile {
  id: string;
  username: string;
  uuid: string;
  active: boolean;
  createdAt: number;
}

export interface Instance {
  id: string;
  name: string;
  mcVersion: string;
  loader: string;
  loaderVersion: string;
  icon?: string;
  lastPlayed?: number;
  javaVersion?: number;
  javaPath?: string;
  minMemory?: number;
  maxMemory?: number;
  createdAt: number;
}

export interface GameLog {
  line: string;
  timestamp: number;
}

export interface Toast {
  id: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export interface Settings {
  javaDir?: string;
  instancesDir?: string;
  customJavaPath?: string;
  minMemoryAllocation?: number;
  maxMemoryAllocation?: number;
  jvmArgs?: string;
  resolution?: {
    width: number;
    height: number;
    fullscreen: boolean;
  };
}

interface LauncherState {
  profiles: Profile[];
  activeProfile: Profile | null;
  setProfiles: (profiles: Profile[]) => void;
  setActiveProfile: (profile: Profile) => void;

  instances: Instance[];
  selectedInstanceId: string | null;
  setInstances: (instances: Instance[]) => void;
  setSelectedInstance: (id: string) => void;
  getSelectedInstance: () => Instance | null;

  versionManifest: unknown | null;
  setVersionManifest: (manifest: unknown) => void;

  downloadProgress: { percent: number; message?: string } | null;
  isDownloading: boolean;
  setDownloadProgress: (progress: { percent: number; message?: string } | null) => void;
  clearDownload: () => void;

  gameRunning: boolean;
  gameStatus: unknown | null;
  gameLogs: GameLog[];
  setGameRunning: (running: boolean) => void;
  setGameStatus: (status: unknown) => void;
  addGameLog: (line: string) => void;
  clearGameLogs: () => void;

  javaInfo: unknown | null;
  javaProgress: unknown | null;
  setJavaInfo: (info: unknown) => void;
  setJavaProgress: (progress: unknown) => void;

  settings: Settings;
  setSettings: (settings: Settings) => void;

  systemInfo: unknown | null;
  setSystemInfo: (info: unknown) => void;

  toast: Toast | null;
  showToast: (message: string, type?: 'info' | 'success' | 'error' | 'warning', duration?: number) => void;
  clearToast: () => void;

  consoleOpen: boolean;
  setConsoleOpen: (open: boolean) => void;
}

export const useLauncherStore = create<LauncherState>()(
  subscribeWithSelector((set, get) => ({
    profiles: [],
    activeProfile: null,
    setProfiles: (profiles) => set({ profiles }),
    setActiveProfile: (profile) => set({ activeProfile: profile }),

    instances: [],
    selectedInstanceId: null,
    setInstances: (instances) => set({ instances }),
    setSelectedInstance: (id) => set({ selectedInstanceId: id }),
    getSelectedInstance: () => {
      const { instances, selectedInstanceId } = get();
      return instances.find((i) => i.id === selectedInstanceId) || null;
    },

    versionManifest: null,
    setVersionManifest: (manifest) => set({ versionManifest: manifest }),

    downloadProgress: null,
    isDownloading: false,
    setDownloadProgress: (progress) =>
      set({ downloadProgress: progress, isDownloading: progress !== null && progress.percent < 100 }),
    clearDownload: () => set({ downloadProgress: null, isDownloading: false }),

    gameRunning: false,
    gameStatus: null,
    gameLogs: [],
    setGameRunning: (running) => set({ gameRunning: running }),
    setGameStatus: (status) => set({ gameStatus: status }),
    addGameLog: (line) =>
      set((state) => ({
        gameLogs: [...state.gameLogs.slice(-1000), { line, timestamp: Date.now() }],
      })),
    clearGameLogs: () => set({ gameLogs: [] }),

    javaInfo: null,
    javaProgress: null,
    setJavaInfo: (info) => set({ javaInfo: info }),
    setJavaProgress: (progress) => set({ javaProgress: progress }),

    settings: {},
    setSettings: (settings) => set({ settings }),

    systemInfo: null,
    setSystemInfo: (info) => set({ systemInfo: info }),

    toast: null,
    showToast: (message, type = 'info', duration = 3000) => {
      const id = Date.now();
      set({ toast: { id, message, type } });
      setTimeout(() => {
        set((s) => (s.toast?.id === id ? { toast: null } : {}));
      }, duration);
    },
    clearToast: () => set({ toast: null }),

    consoleOpen: false,
    setConsoleOpen: (open) => set({ consoleOpen: open }),
  })),
);
