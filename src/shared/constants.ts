export const MC_JAVA_MAP: Record<string, number> = {
  '1.0–1.16': 8,
  '1.17': 16,
  '1.18–1.20': 17,
  '1.21+': 21,
};

export const LOADERS = {
  VANILLA: 'vanilla',
  FABRIC: 'fabric',
  FORGE: 'forge',
  QUILT: 'quilt',
  NEOFORGE: 'neoforge',
} as const;

export type LoaderType = typeof LOADERS[keyof typeof LOADERS];

export const LOADER_LABELS: Record<LoaderType, string> = {
  vanilla: 'Vanilla',
  fabric: 'Fabric',
  forge: 'Forge',
  quilt: 'Quilt',
  neoforge: 'NeoForge',
};

export const VERSION_TYPES = {
  RELEASE: 'release',
  SNAPSHOT: 'snapshot',
  OLD_BETA: 'old_beta',
  OLD_ALPHA: 'old_alpha',
} as const;

export const API_URLS = {
  VERSION_MANIFEST: 'https://launchermeta.mojang.com/mc/game/version_manifest_v2.json',
  RESOURCES: 'https://resources.download.minecraft.net',
  LIBRARIES: 'https://libraries.minecraft.net',
  MODRINTH: 'https://api.modrinth.com/v2',
  ADOPTIUM: 'https://api.adoptium.net/v3',
  FABRIC_META: 'https://meta.fabricmc.net/v2',
  QUILT_META: 'https://meta.quiltmc.org/v3',
  NEOFORGE_MAVEN: 'https://maven.neoforged.net/releases/net/neoforged/neoforge/',
};

export const IPC_CHANNELS = {
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_MAXIMIZED: 'window:isMaximized',

  PROFILES_LIST: 'profiles:list',
  PROFILES_CREATE: 'profiles:create',
  PROFILES_DELETE: 'profiles:delete',
  PROFILES_SET_ACTIVE: 'profiles:setActive',
  PROFILES_GET_ACTIVE: 'profiles:getActive',

  INSTANCES_LIST: 'instances:list',
  INSTANCES_CREATE: 'instances:create',
  INSTANCES_UPDATE: 'instances:update',
  INSTANCES_DELETE: 'instances:delete',
  INSTANCES_GET_MODS: 'instances:getMods',
  INSTANCES_TOGGLE_MOD: 'instances:toggleMod',
  INSTANCES_DELETE_MOD: 'instances:deleteMod',

  VERSIONS_FETCH_MANIFEST: 'versions:fetchManifest',
  VERSIONS_INSTALL: 'versions:install',
  VERSIONS_GET_INSTALLED: 'versions:getInstalled',

  JAVA_DETECT: 'java:detect',
  JAVA_LIST_MANAGED: 'java:listManaged',
  JAVA_DOWNLOAD: 'java:download',
  JAVA_GET_FOR_VERSION: 'java:getForVersion',

  GAME_LAUNCH: 'game:launch',
  GAME_KILL: 'game:kill',
  GAME_IS_RUNNING: 'game:isRunning',

  MODRINTH_SEARCH: 'modrinth:search',
  MODRINTH_VERSIONS: 'modrinth:getVersions',
  MODRINTH_INSTALL: 'modrinth:installMod',

  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',

  SYSTEM_INFO: 'system:info',
  SYSTEM_OPEN_FOLDER: 'system:openFolder',

  DOWNLOAD_PROGRESS: 'download:progress',
  DOWNLOAD_ERROR: 'download:error',
  JAVA_PROGRESS: 'java:progress',
  GAME_STATUS: 'game:status',
  GAME_LOG: 'game:log',
  GAME_CLOSED: 'game:closed',
} as const;
