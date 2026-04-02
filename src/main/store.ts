import Store from 'electron-store';

export interface ProfileData {
  id: string;
  username: string;
  uuid: string;
  createdAt: string;
  lastUsed?: string;
  avatar?: string | null;
}

export interface InstanceData {
  id: string;
  name: string;
  mcVersion: string;
  loader: 'vanilla' | 'fabric' | 'forge' | 'quilt' | 'neoforge';
  loaderVersion?: string | null;
  loaderVersionId?: string;
  createdAt: string;
  lastPlayed?: string | null;
  totalTimePlayed: number;
  ram: number;
  jvmArgs: string;
  windowWidth: number;
  windowHeight: number;
  customJavaPath?: string | null;
  icon?: string | null;
  description?: string | null;
  isInstalled: boolean;
  path?: string;
}

export interface JavaSettings {
  customPath?: string | null;
  autoDownload: boolean;
}

export interface AppSettings {
  closeLauncherOnStart: boolean;
  showGameConsole: boolean;
  downloadParallelism: number;
  theme: 'dark' | 'darker' | 'midnight';
  accentColor: string;
  language: string;
  checkUpdates: boolean;
}

export interface InstalledVersion {
  [key: string]: unknown;
}

interface StoreSchema {
  activeProfile: string | null;
  profiles: Record<string, ProfileData>;
  instances: Record<string, InstanceData>;
  java: JavaSettings;
  settings: AppSettings;
  installedVersions: Record<string, InstalledVersion>;
}

let store: Store<StoreSchema> | null = null;

function initStore(): Store<StoreSchema> {
  store = new Store<StoreSchema>({
    name: 'mclauncher-config',
    defaults: {
      activeProfile: null,
      profiles: {},
      instances: {},
      java: {
        autoDownload: true,
      },
      settings: {
        closeLauncherOnStart: false,
        showGameConsole: true,
        downloadParallelism: 4,
        theme: 'dark',
        accentColor: '#22c55e',
        language: 'en',
        checkUpdates: true,
      },
      installedVersions: {},
    },
  });
  return store;
}

function getStore(): Store<StoreSchema> {
  if (!store) {
    throw new Error('Store not initialized. Call initStore() first.');
  }
  return store;
}

export { initStore, getStore };
