import type {
  Instance,
  Profile,
  ModInfo,
  ModrinthSearchResult,
  ModrinthVersion,
  Settings,
  VersionManifest,
  DownloadProgress,
  GameStatus,
  JavaInfo,
  SystemInfo,
} from './index';

export interface ElectronAPI {
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    isMaximized: () => Promise<boolean>;
  };
  profiles: {
    list: () => Promise<Profile[]>;
    create: (data: { username: string }) => Promise<Profile>;
    delete: (data: { id: string }) => Promise<void>;
    setActive: (data: { id: string }) => Promise<void>;
    getActive: () => Promise<Profile | null>;
  };
  instances: {
    list: () => Promise<Instance[]>;
    create: (config: {
      name: string;
      mcVersion: string;
      loader: string;
      loaderVersion?: string;
      javaVersion?: number;
      javaPath?: string;
      minMemory?: number;
      maxMemory?: number;
    }) => Promise<Instance>;
    update: (data: Partial<Instance> & { id: string }) => Promise<void>;
    delete: (data: { id: string }) => Promise<void>;
    getMods: (data: { instanceId: string }) => Promise<ModInfo[]>;
    toggleMod: (data: { instanceId: string; modId: string; enabled: boolean }) => Promise<void>;
    deleteMod: (data: { instanceId: string; modId: string }) => Promise<void>;
  };
  versions: {
    fetchManifest: () => Promise<VersionManifest>;
    install: (data: { versionId: string; instanceId?: string }) => Promise<void>;
    getInstalled: () => Promise<string[]>;
  };
  loaders: {
    getVersions: (data: { mcVersion: string }) => Promise<Record<string, string[]>>;
  };
  java: {
    detect: () => Promise<JavaInfo | null>;
    listManaged: () => Promise<JavaInfo[]>;
    download: (data: { version: number; onProgress?: (progress: DownloadProgress) => void }) => Promise<JavaInfo>;
    getForVersion: (data: { mcVersion: string }) => Promise<JavaInfo | null>;
  };
  game: {
    launch: (data: { instanceId: string }) => Promise<void>;
    kill: () => Promise<void>;
    isRunning: () => Promise<boolean>;
  };
  modrinth: {
    search: (data: { query: string; gameVersion?: string; categories?: string[] }) => Promise<ModrinthSearchResult>;
    getVersions: (data: { projectId: string; gameVersion?: string; loader?: string }) => Promise<ModrinthVersion[]>;
    installMod: (data: { instanceId: string; projectId: string; versionId: string }) => Promise<void>;
  };
  settings: {
    get: () => Promise<Settings>;
    set: (updates: Partial<Settings>) => Promise<void>;
  };
  system: {
    info: () => Promise<SystemInfo>;
    openFolder: (data: { folderPath: string }) => Promise<void>;
  };
  events: {
    onDownloadProgress: (cb: (progress: DownloadProgress) => void) => () => void;
    onDownloadError: (cb: (error: { message: string }) => void) => () => void;
    onJavaProgress: (cb: (progress: DownloadProgress) => void) => () => void;
    onGameStatus: (cb: (status: GameStatus) => void) => () => void;
    onGameLog: (cb: (log: string) => void) => () => void;
    onGameClosed: (cb: (exitCode: number) => void) => () => void;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
