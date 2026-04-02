import { ipcMain, BrowserWindow, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { getStore, InstanceData, JavaSettings, AppSettings } from './store';
import { Downloader } from './downloader';
import { JavaManager } from './javaManager';
import { Launcher } from './launcher';
import { LoaderManager } from './loaderManager';
import { API_URLS } from '../shared/constants';

interface AppPaths {
  appData: string;
  instances: string;
  versions: string;
  assets: string;
  libraries: string;
  java: string;
}

interface MainWindowGetter {
  (): BrowserWindow | null;
}

interface SetupIpcHandlersOptions {
  mainWindow: MainWindowGetter;
  paths: AppPaths;
}

interface InstanceConfig {
  name?: string;
  mcVersion: string;
  loader?: string;
  loaderVersion?: string;
  ram?: number;
  jvmArgs?: string;
  windowWidth?: number;
  windowHeight?: number;
  customJavaPath?: string;
  description?: string;
}

let activeLauncher: Launcher | null = null;

export function setupIpcHandlers({ mainWindow, paths }: SetupIpcHandlersOptions): void {
  function sendToRenderer(channel: string, data: unknown): void {
    const win = mainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, data);
    }
  }

  ipcMain.handle('profiles:list', () => {
    const store = getStore();
    return Object.values(store.get('profiles', {}));
  });

  ipcMain.handle('profiles:create', (_, { username }: { username: string }) => {
    const trimmedUsername = username.trim();
    if (!trimmedUsername || trimmedUsername.length < 3) {
      throw new Error('Username must be at least 3 characters');
    }
    if (trimmedUsername.length > 16) {
      throw new Error('Username must be at most 16 characters');
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      throw new Error('Username can only contain letters, numbers, and underscores');
    }

    const store = getStore();
    const profiles = store.get('profiles', {});

    const hash = crypto
      .createHash('md5')
      .update(`OfflinePlayer:${trimmedUsername}`)
      .digest('hex');
    const uuid = [
      hash.slice(0, 8),
      hash.slice(8, 12),
      '3' + hash.slice(13, 16),
      ((parseInt(hash[16], 16) & 0x3) | 0x8).toString(16) + hash.slice(17, 20),
      hash.slice(20, 32),
    ].join('-');

    const profile = {
      id: crypto.randomUUID(),
      username: trimmedUsername,
      uuid,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
    };

    profiles[profile.id] = profile;
    store.set('profiles', profiles);
    store.set('activeProfile', profile.id);

    return profile;
  });

  ipcMain.handle('profiles:delete', (_, { profileId }: { profileId: string }) => {
    const store = getStore();
    const profiles = store.get('profiles', {});
    delete profiles[profileId];
    store.set('profiles', profiles);

    if (store.get('activeProfile') === profileId) {
      const remaining = Object.keys(profiles);
      store.set('activeProfile', remaining[0] || null);
    }

    return true;
  });

  ipcMain.handle('profiles:setActive', (_, { profileId }: { profileId: string }) => {
    const store = getStore();
    store.set('activeProfile', profileId);
    return true;
  });

  ipcMain.handle('profiles:getActive', () => {
    const store = getStore();
    const activeId = store.get('activeProfile');
    if (!activeId) return null;
    const profiles = store.get('profiles', {});
    return profiles[activeId] || null;
  });

  ipcMain.handle('instances:list', () => {
    const store = getStore();
    return Object.values(store.get('instances', {}));
  });

  ipcMain.handle('instances:create', async (_, config: InstanceConfig) => {
    const store = getStore();
    const instances = store.get('instances', {});

    const id = crypto.randomUUID();
    const instancePath = path.join(paths.instances, id);

    const instance: InstanceData = {
      id,
      name: config.name || `Instance ${Object.keys(instances).length + 1}`,
      mcVersion: config.mcVersion,
      loader: (config.loader || 'vanilla') as 'vanilla' | 'fabric' | 'forge' | 'quilt' | 'neoforge',
      loaderVersion: config.loaderVersion || null,
      createdAt: new Date().toISOString(),
      lastPlayed: null,
      totalTimePlayed: 0,
      ram: config.ram || 2048,
      jvmArgs: config.jvmArgs || '',
      windowWidth: config.windowWidth || 854,
      windowHeight: config.windowHeight || 480,
      customJavaPath: config.customJavaPath || null,
      description: config.description || null,
      isInstalled: false,
      path: instancePath,
    };

    await fs.promises.mkdir(path.join(instancePath, '.minecraft'), { recursive: true });
    await fs.promises.mkdir(path.join(instancePath, '.minecraft', 'mods'), { recursive: true });
    await fs.promises.mkdir(path.join(instancePath, 'config'), { recursive: true });

    instances[id] = instance;
    store.set('instances', instances);

    return instance;
  });

  ipcMain.handle('instances:update', (_, { instanceId, updates }: { instanceId: string; updates: Record<string, unknown> }) => {
    const store = getStore();
    const instances = store.get('instances', {});

    if (!instances[instanceId]) throw new Error('Instance not found');

    instances[instanceId] = { ...instances[instanceId], ...updates };
    store.set('instances', instances);

    return instances[instanceId];
  });

  ipcMain.handle('instances:delete', async (_, { instanceId }: { instanceId: string }) => {
    const store = getStore();
    const instances = store.get('instances', {});
    const instance = instances[instanceId];

    if (!instance) throw new Error('Instance not found');

    if (fs.existsSync((instance as { path?: string }).path || '')) {
      await fs.promises.rm((instance as { path?: string }).path || '', { recursive: true, force: true });
    }

    delete instances[instanceId];
    store.set('instances', instances);

    return true;
  });

  ipcMain.handle('instances:getMods', (_, { instanceId }: { instanceId: string }) => {
    const store = getStore();
    const instances = store.get('instances', {});
    const instance = instances[instanceId];
    if (!instance) throw new Error('Instance not found');

    const modsDir = path.join((instance as { path?: string }).path || '', '.minecraft', 'mods');
    if (!fs.existsSync(modsDir)) return [];

    const files = fs.readdirSync(modsDir);
    return files
      .filter((f) => f.endsWith('.jar') || f.endsWith('.jar.disabled'))
      .map((f) => ({
        filename: f,
        enabled: f.endsWith('.jar'),
        size: fs.statSync(path.join(modsDir, f)).size,
      }));
  });

  ipcMain.handle('instances:toggleMod', (_, { instanceId, filename }: { instanceId: string; filename: string }) => {
    const store = getStore();
    const instances = store.get('instances', {});
    const instance = instances[instanceId];
    if (!instance) throw new Error('Instance not found');

    const modsDir = path.join((instance as { path?: string }).path || '', '.minecraft', 'mods');
    const fullPath = path.join(modsDir, filename);

    if (!fs.existsSync(fullPath)) throw new Error('Mod file not found');

    let newName: string;
    if (filename.endsWith('.jar.disabled')) {
      newName = filename.replace('.jar.disabled', '.jar');
    } else if (filename.endsWith('.jar')) {
      newName = filename + '.disabled';
    } else {
      throw new Error('Unknown file type');
    }

    fs.renameSync(fullPath, path.join(modsDir, newName));
    return { filename: newName, enabled: !filename.endsWith('.disabled') };
  });

  ipcMain.handle('instances:deleteMod', (_, { instanceId, filename }: { instanceId: string; filename: string }) => {
    const store = getStore();
    const instances = store.get('instances', {});
    const instance = instances[instanceId];
    if (!instance) throw new Error('Instance not found');

    const modPath = path.join((instance as { path?: string }).path || '', '.minecraft', 'mods', filename);
    if (fs.existsSync(modPath)) fs.unlinkSync(modPath);
    return true;
  });

  ipcMain.handle('versions:fetchManifest', async () => {
    const downloader = new Downloader();
    return downloader.fetchVersionManifest();
  });

  ipcMain.handle('loaders:getVersions', async (_, { loader, mcVersion }: { loader: string; mcVersion: string }) => {
    const loaderManager = new LoaderManager({
      versionsDir: paths.versions,
      librariesDir: paths.libraries,
    });
    return loaderManager.getLoaderVersions(loader, mcVersion);
  });

  ipcMain.handle('versions:install', async (_, { instanceId, mcVersion, loader, loaderVersion }: {
    instanceId: string;
    mcVersion: string;
    loader?: string;
    loaderVersion?: string;
  }) => {
    const store = getStore();
    const instances = store.get('instances', {});
    const instance = instances[instanceId];
    if (!instance) throw new Error('Instance not found');

    const downloader = new Downloader({ parallelism: 4 });

    try {
      sendToRenderer('download:progress', {
        stage: 'manifest',
        message: 'Fetching version manifest...',
        percent: 0,
      });

      const manifest = await downloader.fetchVersionManifest();
      const versionEntry = manifest.versions.find((v) => v.id === mcVersion);

      if (!versionEntry) throw new Error(`Version ${mcVersion} not found in manifest`);

      sendToRenderer('download:progress', {
        stage: 'manifest',
        message: `Loading ${mcVersion} metadata...`,
        percent: 5,
      });

      const versionJson = await downloader.fetchVersionJson(versionEntry.url);

      const versionDir = path.join(paths.versions, mcVersion);
      await fs.promises.mkdir(versionDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(versionDir, `${mcVersion}.json`),
        JSON.stringify(versionJson, null, 2),
      );

      sendToRenderer('download:progress', {
        stage: 'client',
        message: 'Downloading client JAR...',
        percent: 10,
      });

      await downloader.downloadClient(versionJson, paths.versions, (p) => {
        sendToRenderer('download:progress', {
          ...p,
          percent: 10 + (p.percent || 0) * 0.1,
        });
      });

      await downloader.downloadLibraries(versionJson, paths.libraries, (p) => {
        sendToRenderer('download:progress', {
          ...p,
          message: `Downloading libraries: ${p.currentFile}`,
          percent: 20 + p.percent * 0.3,
        });
      });

      await downloader.downloadAssets(versionJson, paths.assets, (p) => {
        sendToRenderer('download:progress', {
          ...p,
          message: `Downloading assets: ${p.currentFile}`,
          percent: 50 + p.percent * 0.4,
        });
      });

      let finalVersionId = mcVersion;

      if (loader && loader !== 'vanilla') {
        sendToRenderer('download:progress', {
          stage: 'loader',
          message: `Installing ${loader}${loaderVersion ? ` ${loaderVersion}` : ''}...`,
          percent: 90,
        });

        const loaderManager = new LoaderManager({
          versionsDir: paths.versions,
          librariesDir: paths.libraries,
          onProgress: (p) => {
            const msg = p.status === 'downloading-libraries'
              ? `Installing ${loader}: downloading libraries (${p.completed || 0}/${p.total || '?'})`
              : `Installing ${loader}: ${p.status}`;
            sendToRenderer('download:progress', {
              stage: 'loader',
              message: msg,
              percent: 90 + (p.percent || 0) * 0.09,
            });
          },
        });

        let resolvedLoaderVersion = loaderVersion;
        if (!resolvedLoaderVersion) {
          const versions = await loaderManager.getLoaderVersions(loader, mcVersion);
          const stable = versions.find((v) => v.stable);
          if (!stable) throw new Error(`No ${loader} versions found for ${mcVersion}`);
          resolvedLoaderVersion = stable.version;
        }

        const loaderResult = await loaderManager.installLoader(
          loader,
          mcVersion,
          resolvedLoaderVersion!,
          (instance as { path?: string }).path || '',
        );

        finalVersionId = loaderResult.versionId || mcVersion;

        (instances[instanceId] as { loader: string; loaderVersion: string; loaderVersionId: string }).loader = loader;
        (instances[instanceId] as { loader: string; loaderVersion: string; loaderVersionId: string }).loaderVersion = resolvedLoaderVersion!;
        (instances[instanceId] as { loader: string; loaderVersion: string; loaderVersionId: string }).loaderVersionId = finalVersionId;
      }

      (instances[instanceId] as { isInstalled: boolean; mcVersion: string }).isInstalled = true;
      (instances[instanceId] as { isInstalled: boolean; mcVersion: string }).mcVersion = mcVersion;
      store.set('instances', instances);

      sendToRenderer('download:progress', {
        stage: 'done',
        message: loader && loader !== 'vanilla'
          ? `Minecraft ${mcVersion} + ${loader} installed!`
          : `Minecraft ${mcVersion} installed!`,
        percent: 100,
      });

      return { success: true, loaderVersionId: finalVersionId };
    } catch (err) {
      sendToRenderer('download:error', { message: (err as Error).message });
      throw err;
    }
  });

  ipcMain.handle('versions:getInstalled', () => {
    if (!fs.existsSync(paths.versions)) return [];
    return fs.readdirSync(paths.versions).filter((v) => {
      const jsonPath = path.join(paths.versions, v, `${v}.json`);
      return fs.existsSync(jsonPath);
    });
  });

  ipcMain.handle('java:detect', async () => {
    const javaManager = new JavaManager({ javaDir: paths.java });
    return javaManager.detectSystemJava();
  });

  ipcMain.handle('java:listManaged', () => {
    const javaManager = new JavaManager({ javaDir: paths.java });
    return javaManager.listManagedInstallations();
  });

  ipcMain.handle('java:download', async (_, { majorVersion }: { majorVersion: number }) => {
    const javaManager = new JavaManager({
      javaDir: paths.java,
      onProgress: (p) => sendToRenderer('java:progress', p),
    });

    return javaManager.downloadJava(majorVersion);
  });

  ipcMain.handle('java:getForVersion', async (_, { mcVersion, customPath }: { mcVersion: string; customPath?: string }) => {
    const store = getStore();
    const javaSettings: JavaSettings = store.get('java', { autoDownload: true } as JavaSettings);

    const javaManager = new JavaManager({
      javaDir: paths.java,
      onProgress: (p) => sendToRenderer('java:progress', p),
    });

    return javaManager.getJavaForVersion(
      mcVersion,
      customPath || javaSettings.customPath,
    );
  });

  ipcMain.handle('game:launch', async (_, { instanceId }: { instanceId: string }) => {
    const store = getStore();
    const instances = store.get('instances', {});
    const instance = instances[instanceId];

    if (!instance) throw new Error('Instance not found');
    if (!(instance as { isInstalled?: boolean }).isInstalled) throw new Error('Instance is not installed yet');

    const activeProfileId = store.get('activeProfile');
    const profiles = store.get('profiles', {});
    const profile = profiles[activeProfileId || ''];

    if (!profile) throw new Error('No active profile. Please create a profile first.');

    const instanceLoaderVersionId = (instance as { loaderVersionId?: string }).loaderVersionId;
    const versionToUse = instanceLoaderVersionId || instance.mcVersion;
    
    const versionJsonPath = path.join(
      paths.versions,
      versionToUse,
      `${versionToUse}.json`,
    );
    if (!fs.existsSync(versionJsonPath)) {
      throw new Error(`Version files not found: ${versionToUse}. Please reinstall the instance.`);
    }
    const versionJson = JSON.parse(fs.readFileSync(versionJsonPath, 'utf-8'));

    sendToRenderer('game:status', {
      status: 'preparing',
      message: 'Locating Java...',
    });
    const javaManager = new JavaManager({
      javaDir: paths.java,
      onProgress: (p) => sendToRenderer('java:progress', p),
    });

    const java = await javaManager.getJavaForVersion(
      versionToUse,
      (instance as { customJavaPath?: string }).customJavaPath,
    );

    const loaderName = (instance as { loader?: string }).loader || 'vanilla';
    sendToRenderer('game:status', {
      status: 'launching',
      message: loaderName !== 'vanilla' 
        ? `Starting ${instance.mcVersion} with ${loaderName}...`
        : `Starting ${instance.mcVersion}...`,
    });

    activeLauncher = new Launcher({
      paths,
      onLog: (line: string) => sendToRenderer('game:log', { line }),
      onClose: (info: { exitCode?: number; duration?: number }) => {
        sendToRenderer('game:closed', info);
        activeLauncher = null;

        const currentInstances = store.get('instances', {});
        if (currentInstances[instanceId]) {
          (currentInstances[instanceId] as { lastPlayed?: string; totalTimePlayed?: number }).lastPlayed = new Date().toISOString();
          (currentInstances[instanceId] as { lastPlayed?: string; totalTimePlayed?: number }).totalTimePlayed =
            ((currentInstances[instanceId] as { totalTimePlayed?: number }).totalTimePlayed || 0) +
            (info.duration || 0);
          store.set('instances', currentInstances);
        }
      },
    });

    const result = await activeLauncher.launch({
      versionJson,
      javaPath: java.path,
      instancePath: (instance as { path?: string }).path || '',
      username: profile.username,
      uuid: profile.uuid,
      ram: (instance as { ram?: number }).ram || 2048,
      jvmArgs: (instance as { jvmArgs?: string }).jvmArgs || '',
      windowWidth: (instance as { windowWidth?: number }).windowWidth || 854,
      windowHeight: (instance as { windowHeight?: number }).windowHeight || 480,
    });

    sendToRenderer('game:status', { status: 'running', pid: result.pid });

    return result;
  });

  ipcMain.handle('game:kill', () => {
    if (activeLauncher) {
      activeLauncher.killGame();
      return true;
    }
    return false;
  });

  ipcMain.handle('game:isRunning', () => {
    return activeLauncher?.isRunning() ?? false;
  });

  ipcMain.handle(
    'modrinth:search',
    async (_, { query, mcVersion, loader, offset = 0, limit = 20 }: {
      query?: string;
      mcVersion?: string;
      loader?: string;
      offset?: number;
      limit?: number;
    }) => {
      const downloader = new Downloader();

      const facets = [['project_type:mod']];
      if (mcVersion) facets.push([`versions:${mcVersion}`]);
      if (loader && loader !== 'vanilla') facets.push([`categories:${loader}`]);

      const facetsStr = encodeURIComponent(JSON.stringify(facets));
      const url = `${API_URLS.MODRINTH}/search?query=${encodeURIComponent(query || '')}&facets=${facetsStr}&offset=${offset}&limit=${limit}`;

      return downloader.fetchJson(url);
    },
  );

  ipcMain.handle(
    'modrinth:getVersions',
    async (_, { projectId, mcVersion, loader }: { projectId: string; mcVersion?: string; loader?: string }) => {
      const downloader = new Downloader();
      let url = `${API_URLS.MODRINTH}/project/${projectId}/version`;

      const params: string[] = [];
      if (mcVersion) params.push(`game_versions=["${mcVersion}"]`);
      if (loader && loader !== 'vanilla') params.push(`loaders=["${loader}"]`);
      if (params.length) url += '?' + params.join('&');

      return downloader.fetchJson(url);
    },
  );

  ipcMain.handle(
    'modrinth:installMod',
    async (_, { instanceId, versionData }: { instanceId: string; versionData: { files: Array<{ url: string; filename: string; hashes?: { sha1?: string }; primary?: boolean }> } }) => {
      const store = getStore();
      const instances = store.get('instances', {});
      const instance = instances[instanceId];
      if (!instance) throw new Error('Instance not found');

      const downloader = new Downloader();
      const modsDir = path.join((instance as { path?: string }).path || '', '.minecraft', 'mods');
      await fs.promises.mkdir(modsDir, { recursive: true });

      const file = versionData.files.find((f) => f.primary) || versionData.files[0];
      if (!file) throw new Error('No file found for this mod version');

      const dest = path.join(modsDir, file.filename);

      sendToRenderer('download:progress', {
        stage: 'mod',
        message: `Downloading ${file.filename}...`,
        percent: 0,
      });

      await downloader.downloadFile(file.url, dest, file.hashes?.sha1);

      sendToRenderer('download:progress', {
        stage: 'mod',
        message: `Installed ${file.filename}`,
        percent: 100,
      });

      return { filename: file.filename, path: dest };
    },
  );

  ipcMain.handle('settings:get', () => {
    const store = getStore();
    return (store.get('settings') as AppSettings | undefined) || {};
  });

  ipcMain.handle('settings:set', (_, updates: Record<string, unknown>) => {
    const store = getStore();
    const current: AppSettings = (store.get('settings') as AppSettings | undefined) || {
      closeLauncherOnStart: false,
      showGameConsole: true,
      downloadParallelism: 4,
      theme: 'dark',
      accentColor: '#22c55e',
      language: 'en',
      checkUpdates: true,
    };
    store.set('settings' as keyof typeof store.store, { ...current, ...updates } as AppSettings);
    return (store.get('settings') as AppSettings | undefined) || current;
  });

  ipcMain.handle('system:info', () => {
    const totalMem = Math.floor(os.totalmem() / 1024 / 1024);
    const freeMem = Math.floor(os.freemem() / 1024 / 1024);

    return {
      platform: process.platform,
      arch: process.arch,
      totalMemMB: totalMem,
      freeMemMB: freeMem,
      cpus: os.cpus().length,
      appDataPath: paths.appData,
    };
  });

  ipcMain.handle('system:openFolder', async (_, { folderPath }: { folderPath: string }) => {
    const normalizedPath = path.normalize(folderPath);
    const normalizedAppData = path.normalize(paths.appData);
    if (!normalizedPath.startsWith(normalizedAppData)) {
      throw new Error('Invalid path: must be within app data directory');
    }
    await shell.openPath(normalizedPath);
    return true;
  });
}
