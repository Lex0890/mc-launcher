import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import https from 'https';
import http from 'http';
import { Downloader } from './downloader';
import { JavaManager } from './javaManager';

const FABRIC_META = 'https://meta.fabricmc.net/v2';
const QUILT_META = 'https://meta.quiltmc.org/v3';
const FORGE_MAVEN = 'https://maven.minecraftforge.net/net/minecraftforge/forge';
const NEOFORGE_MAVEN = 'https://maven.neoforged.net/releases/net/neoforged/neoforge';

interface LoaderVersion {
  version: string;
  stable: boolean;
}

interface LoaderProgress {
  stage: string;
  loader: string;
  status: string;
  total?: number;
  completed?: number;
  percent?: number;
  versionId?: string;
}

interface LoaderManagerOptions {
  versionsDir: string;
  librariesDir: string;
  onProgress?: (progress: LoaderProgress) => void;
}

export class LoaderManager {
  versionsDir: string;
  librariesDir: string;
  onProgress: (progress: LoaderProgress) => void;
  downloader: Downloader;

  constructor({ versionsDir, librariesDir, onProgress }: LoaderManagerOptions) {
    this.versionsDir = versionsDir;
    this.librariesDir = librariesDir;
    this.onProgress = onProgress || (() => {});
    this.downloader = new Downloader();
  }

  async getLoaderVersions(loader: string, mcVersion: string): Promise<LoaderVersion[]> {
    switch (loader) {
      case 'fabric': return this._fabricVersions(mcVersion);
      case 'quilt': return this._quiltVersions(mcVersion);
      case 'forge': return this._forgeVersions(mcVersion);
      case 'neoforge': return this._neoforgeVersions(mcVersion);
      default: throw new Error(`Unknown loader: ${loader}`);
    }
  }

  async installLoader(loader: string, mcVersion: string, loaderVersion: string, instancePath: string): Promise<{ versionId: string; jsonPath?: string }> {
    switch (loader) {
      case 'fabric': return this._installFabric(mcVersion, loaderVersion, instancePath);
      case 'quilt': return this._installQuilt(mcVersion, loaderVersion, instancePath);
      case 'forge': return this._installForge(mcVersion, loaderVersion, instancePath);
      case 'neoforge': return this._installNeoForge(mcVersion, loaderVersion, instancePath);
      default: throw new Error(`Unknown loader: ${loader}`);
    }
  }

  async _fabricVersions(mcVersion: string): Promise<LoaderVersion[]> {
    const data = await this.downloader.fetchJson<Array<{ loader: { version: string; stable: boolean } }>>(
      `${FABRIC_META}/versions/loader/${mcVersion}`,
    );
    return data.map(entry => ({
      version: entry.loader.version,
      stable: entry.loader.stable,
    }));
  }

  async _installFabric(mcVersion: string, loaderVersion: string, _instancePath: string): Promise<{ versionId: string; jsonPath: string }> {
    this.onProgress({ stage: 'loader', loader: 'fabric', status: 'fetching-profile' });

    const profileUrl = `${FABRIC_META}/versions/loader/${mcVersion}/${loaderVersion}/profile/json`;
    const profileJson = await this.downloader.fetchJson<{ id: string; libraries: Array<{ name: string; url?: string; sha1?: string }> }>(profileUrl);

    const versionId = profileJson.id;
    const versionDir = path.join(this.versionsDir, versionId);
    await fs.promises.mkdir(versionDir, { recursive: true });

    const jsonPath = path.join(versionDir, `${versionId}.json`);
    await fs.promises.writeFile(jsonPath, JSON.stringify(profileJson, null, 2));

    await this._downloadLoaderLibraries(profileJson, 'fabric');

    this.onProgress({ stage: 'loader', loader: 'fabric', status: 'done', versionId });
    return { versionId, jsonPath };
  }

  async _quiltVersions(mcVersion: string): Promise<LoaderVersion[]> {
    const data = await this.downloader.fetchJson<Array<{ loader: { version: string } }>>(
      `${QUILT_META}/versions/loader/${mcVersion}`,
    );
    return data.map(entry => ({
      version: entry.loader.version,
      stable: !entry.loader.version.includes('beta'),
    }));
  }

  async _installQuilt(mcVersion: string, loaderVersion: string, _instancePath: string): Promise<{ versionId: string; jsonPath: string }> {
    this.onProgress({ stage: 'loader', loader: 'quilt', status: 'fetching-profile' });

    const profileUrl = `${QUILT_META}/versions/loader/${mcVersion}/${loaderVersion}/profile/json`;
    const profileJson = await this.downloader.fetchJson<{ id: string; libraries: Array<{ name: string; url?: string; sha1?: string }> }>(profileUrl);

    const versionId = profileJson.id;
    const versionDir = path.join(this.versionsDir, versionId);
    await fs.promises.mkdir(versionDir, { recursive: true });

    const jsonPath = path.join(versionDir, `${versionId}.json`);
    await fs.promises.writeFile(jsonPath, JSON.stringify(profileJson, null, 2));

    await this._downloadLoaderLibraries(profileJson, 'quilt');

    this.onProgress({ stage: 'loader', loader: 'quilt', status: 'done', versionId });
    return { versionId, jsonPath };
  }

  async _forgeVersions(mcVersion: string): Promise<LoaderVersion[]> {
    const metaUrl = `${FORGE_MAVEN}/maven-metadata.xml`;
    const xml = await this._fetchText(metaUrl);
    const versions = [...xml.matchAll(/<version>([^<]+)<\/version>/g)]
      .map(m => m[1])
      .filter(v => v.startsWith(`${mcVersion}-`))
      .reverse();

    return versions.map(v => ({
      version: v,
      stable: !v.includes('beta') && !v.includes('alpha'),
    }));
  }

  async _installForge(mcVersion: string, loaderVersion: string, instancePath: string): Promise<{ versionId: string }> {
    this.onProgress({ stage: 'loader', loader: 'forge', status: 'downloading-installer' });

    const installerName = `forge-${loaderVersion}-installer.jar`;
    const installerUrl = `${FORGE_MAVEN}/${loaderVersion}/${installerName}`;
    const installerPath = path.join(instancePath, installerName);

    try {
      await this.downloader.downloadFile(installerUrl, installerPath, null);

      this.onProgress({ stage: 'loader', loader: 'forge', status: 'running-installer' });

      const javaPath = this._findJava();
      execFileSync(javaPath, [
        '-jar', installerPath,
        '--installClient', this.versionsDir,
      ], {
        cwd: instancePath,
        stdio: 'pipe',
        timeout: 300000,
      });

      const versionId = `${mcVersion}-forge-${loaderVersion.split('-')[1] || loaderVersion}`;

      this.onProgress({ stage: 'loader', loader: 'forge', status: 'done', versionId });
      return { versionId };
    } catch (err) {
      this.onProgress({ stage: 'loader', loader: 'forge', status: 'error', versionId: '' });
      throw err;
    } finally {
      if (fs.existsSync(installerPath)) {
        try { fs.unlinkSync(installerPath); } catch { /* ignore */ }
      }
    }
  }

  async _neoforgeVersions(mcVersion: string): Promise<LoaderVersion[]> {
    const metaUrl = `${NEOFORGE_MAVEN}/maven-metadata.xml`;
    const xml = await this._fetchText(metaUrl);

    const parts = mcVersion.split('.').map(Number);
    const minor = parts[1] || 0;
    const prefix = minor <= 20 ? `${mcVersion}-` : `${parts[0]}.${minor}.`;

    const versions = [...xml.matchAll(/<version>([^<]+)<\/version>/g)]
      .map(m => m[1])
      .filter(v => v.startsWith(prefix))
      .reverse();

    return versions.map(v => ({
      version: v,
      stable: !v.includes('beta') && !v.includes('alpha'),
    }));
  }

  async _installNeoForge(mcVersion: string, loaderVersion: string, instancePath: string): Promise<{ versionId: string }> {
    this.onProgress({ stage: 'loader', loader: 'neoforge', status: 'downloading-installer' });

    const installerName = `neoforge-${loaderVersion}-installer.jar`;
    const installerUrl = `${NEOFORGE_MAVEN}/${loaderVersion}/${installerName}`;
    const installerPath = path.join(instancePath, installerName);

    try {
      await this.downloader.downloadFile(installerUrl, installerPath, null);

      this.onProgress({ stage: 'loader', loader: 'neoforge', status: 'running-installer' });

      const javaPath = this._findJava();
      execFileSync(javaPath, [
        '-jar', installerPath,
        '--installClient', this.versionsDir,
      ], {
        cwd: instancePath,
        stdio: 'pipe',
        timeout: 300000,
      });

      const versionId = `neoforge-${loaderVersion}`;

      this.onProgress({ stage: 'loader', loader: 'neoforge', status: 'done', versionId });
      return { versionId };
    } finally {
      if (fs.existsSync(installerPath)) {
        try { fs.unlinkSync(installerPath); } catch { /* ignore */ }
      }
    }
  }

  async _downloadLoaderLibraries(
    profileJson: { libraries?: Array<{ name: string; url?: string; sha1?: string }> },
    loaderName: string,
  ): Promise<void> {
    const libraries = profileJson.libraries || [];
    const files: Array<{ url: string; dest: string; sha1: string | null }> = [];

    for (const lib of libraries) {
      if (!lib.name) continue;

      const [group, artifact, version] = lib.name.split(':');
      if (!group || !artifact || !version) continue;

      const groupPath = group.replace(/\./g, '/');
      const jarName = `${artifact}-${version}.jar`;
      const mavenPath = `${groupPath}/${artifact}/${version}/${jarName}`;
      const dest = path.join(this.librariesDir, mavenPath);

      const baseUrl = (lib.url || 'https://repo1.maven.org/maven2/').replace(/\/$/, '');
      const url = `${baseUrl}/${mavenPath}`;

      files.push({ url, dest, sha1: lib.sha1 || null });
    }

    if (files.length === 0) return;

    this.onProgress({
      stage: 'loader',
      loader: loaderName,
      status: 'downloading-libraries',
      total: files.length,
    });

    let done = 0;
    for (const file of files) {
      try {
        await this.downloader.downloadFile(file.url, file.dest, file.sha1);
      } catch (err) {
        console.warn(`[LoaderManager] Skipped lib ${file.url}: ${(err as Error).message}`);
      }
      done++;
      this.onProgress({
        stage: 'loader',
        loader: loaderName,
        status: 'downloading-libraries',
        completed: done,
        total: files.length,
        percent: Math.floor((done / files.length) * 100),
      });
    }
  }

  _fetchText(url: string, maxRedirects = 5): Promise<string> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      const request = protocol.get(url, (res) => {
        if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
          if (maxRedirects <= 0) { reject(new Error(`Too many redirects: ${url}`)); return; }
          resolve(this._fetchText(res.headers.location, maxRedirects - 1));
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        let data = '';
        res.on('data', c => (data += c));
        res.on('end', () => resolve(data));
        res.on('error', reject);
      }).on('error', reject);
      const timeoutId = setTimeout(() => {
        request.destroy();
        reject(new Error(`Timeout: ${url}`));
      }, 30000);
      request.on('close', () => clearTimeout(timeoutId));
    });
  }

  _findJava(): string {
    const jm = new JavaManager({ javaDir: path.join(this.versionsDir, '..', 'java') });
    const java = jm.detectSystemJava();
    if (java) return java.path;
    throw new Error('Java not found. Please install Java before installing Forge/NeoForge.');
  }
}
