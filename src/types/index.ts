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

export interface Profile {
  id: string;
  username: string;
  uuid: string;
  active: boolean;
  createdAt: number;
}

export interface ModInfo {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  file: string;
  projectId?: string;
  versionId?: string;
}

export interface ModrinthSearchResult {
  hits: ModrinthProject[];
  total: number;
}

export interface ModrinthProject {
  project_id: string;
  slug: string;
  title: string;
  description: string;
  categories: string[];
  icon_url?: string;
  downloads: number;
  follows: number;
  author: string;
  client_side: 'required' | 'optional' | 'unsupported';
  server_side: 'required' | 'optional' | 'unsupported';
}

export interface ModrinthVersion {
  id: string;
  project_id: string;
  version_number: string;
  version_type: 'release' | 'beta' | 'alpha';
  loaders: string[];
  game_versions: string[];
  files: Array<{
    url: string;
    filename: string;
    hashes: {
      sha1: string;
      sha512: string;
    };
  }>;
  date_published: string;
}

export interface Settings {
  javaDir: string;
  instancesDir: string;
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

export interface VersionManifest {
  versions: Array<{
    id: string;
    type: 'release' | 'snapshot' | 'old';
    url: string;
    time: string;
    releaseTime: string;
  }>;
}

export interface DownloadProgress {
  type: 'version' | 'loader' | 'java' | 'mod';
  name: string;
  downloaded: number;
  total: number;
  percent: number;
  speed?: number;
  status?: 'downloading' | 'verifying' | 'error' | 'done';
  message?: string;
}

export interface GameStatus {
  status: 'launching' | 'running' | 'closing' | 'crashed';
  instanceId?: string;
  pid?: number;
  exitCode?: number;
}

export interface JavaInfo {
  path: string;
  version: string;
  majorVersion: number;
}

export interface SystemInfo {
  os: string;
  arch: string;
  cores: number;
  memory: number;
  javaPath?: string;
}
