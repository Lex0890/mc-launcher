import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import https from 'https';
import http from 'http';
import { EventEmitter } from 'events';

export const MANIFEST_URL = 'https://launchermeta.mojang.com/mc/game/version_manifest_v2.json';
export const RESOURCES_BASE = 'https://resources.download.minecraft.net';
export const LIBRARIES_BASE = 'https://libraries.minecraft.net';

interface DownloadFile {
  url: string;
  dest: string;
  sha1?: string;
  size?: number;
  name?: string;
  required?: boolean;
  isNative?: boolean;
}

interface DownloadResult {
  url: string;
  dest: string;
  cached: boolean;
  path: string;
}

interface BatchProgress {
  completed: number;
  total: number;
  percent: number;
  currentFile: string;
  errors: number;
}

interface VersionJson {
  id: string;
  downloads?: {
    client?: {
      url: string;
      sha1: string;
      size?: number;
    };
  };
  libraries: Array<{
    name?: string;
    rules?: Array<{
      action: string;
      os?: { name: string };
    }>;
    downloads?: {
      artifact?: {
        url: string;
        sha1: string;
        size: number;
        path: string;
      };
      classifiers?: Record<string, {
        url: string;
        sha1: string;
        size: number;
        path: string;
      }>;
    };
    natives?: Record<string, string>;
  }>;
  assetIndex: {
    id: string;
    url: string;
    sha1: string;
  };
}

export class Downloader extends EventEmitter {
  parallelism: number;
  activeDownloads: number;
  queue: DownloadFile[];
  totalFiles: number;
  completedFiles: number;
  totalBytes: number;
  downloadedBytes: number;
  aborted: boolean;

  constructor({ parallelism = 4 }: { parallelism?: number } = {}) {
    super();
    this.parallelism = parallelism;
    this.activeDownloads = 0;
    this.queue = [];
    this.totalFiles = 0;
    this.completedFiles = 0;
    this.totalBytes = 0;
    this.downloadedBytes = 0;
    this.aborted = false;
  }

  async downloadFile(
    url: string,
    dest: string,
    expectedSha1: string | null = null,
    maxRedirects = 5,
  ): Promise<DownloadResult> {
    await fs.promises.mkdir(path.dirname(dest), { recursive: true });

    if (fs.existsSync(dest) && expectedSha1) {
      const existingHash = await this.computeSha1(dest);
      if (existingHash === expectedSha1) {
        return { cached: true, path: dest, url, dest };
      }
    }

    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      const tmpPath = dest + '.tmp';
      const writeStream = fs.createWriteStream(tmpPath);
      let downloadedBytes = 0;

      const request = protocol.get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          if (maxRedirects <= 0) {
            writeStream.close();
            reject(new Error(`Too many redirects for ${url}`));
            return;
          }
          const location = response.headers.location;
          response.destroy();
            writeStream.close(() => {
            if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
            this.downloadFile(location!, dest, expectedSha1, maxRedirects - 1)
              .then(resolve)
              .catch(reject);
          });
          return;
        }

        if (response.statusCode !== 200) {
          writeStream.close();
          if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
          reject(new Error(`HTTP ${response.statusCode} for ${url}`));
          return;
        }

        response.on('data', (chunk: Buffer) => {
          downloadedBytes += chunk.length;
          this.downloadedBytes += chunk.length;
          this.emit('file-progress', {
            url,
            dest,
            downloaded: downloadedBytes,
          });
        });

        response.pipe(writeStream);

        writeStream.on('finish', async () => {
          try {
            if (expectedSha1) {
              const actualSha1 = await this.computeSha1(tmpPath);
              if (actualSha1 !== expectedSha1) {
                fs.unlinkSync(tmpPath);
                reject(new Error(`SHA1 mismatch for ${path.basename(dest)}: expected ${expectedSha1}, got ${actualSha1}`));
                return;
              }
            }
            await fs.promises.rename(tmpPath, dest);
            resolve({ cached: false, path: dest, url, dest });
          } catch (err) {
            if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
            reject(err);
          }
        });

        writeStream.on('error', (err) => {
          if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
          reject(err);
        });
      });

      request.on('error', (err) => {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
        reject(err);
      });

      request.setTimeout(30000, () => {
        request.destroy();
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
        reject(new Error(`Download timeout: ${url}`));
      });
    });
  }

  async computeSha1(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha1');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  async downloadBatch(
    files: DownloadFile[],
    onProgress?: (progress: BatchProgress) => void,
  ): Promise<{ results: (DownloadFile & { cached?: boolean; path?: string })[]; errors: { file: DownloadFile; error: string }[] }> {
    this.totalFiles = files.length;
    this.completedFiles = 0;
    this.aborted = false;

    const results: (DownloadFile & { cached?: boolean; path?: string })[] = [];
    const errors: { file: DownloadFile; error: string }[] = [];
    const queue = [...files];

    const processNext = async (): Promise<void> => {
      while (queue.length > 0 && !this.aborted) {
        const file = queue.shift();
        if (!file) break;

        try {
          const result = await this.downloadFile(file.url, file.dest, file.sha1);
          results.push({ ...file, ...result });
        } catch (err) {
          errors.push({ file, error: (err as Error).message });
          if (file.required !== false) {
            this.emit('error', { file, error: err });
          }
        } finally {
          this.completedFiles++;
          if (onProgress) {
            onProgress({
              completed: this.completedFiles,
              total: this.totalFiles,
              percent: this.totalFiles > 0 ? Math.floor((this.completedFiles / this.totalFiles) * 100) : 0,
              currentFile: file.dest ? path.basename(file.dest) : '',
              errors: errors.length,
            });
          }
        }
      }
    };

    const workers: Promise<void>[] = [];
    for (let i = 0; i < Math.min(this.parallelism, files.length); i++) {
      workers.push(processNext());
    }

    await Promise.all(workers);

    if (errors.length > 0) {
      this.emit('batch-errors', errors);
    }

    return { results, errors };
  }

  abort(): void {
    this.aborted = true;
  }

  async fetchJson<T = unknown>(url: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      const request = protocol.get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          this.fetchJson<T>(res.headers.location!).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Invalid JSON from ${url}: ${(e as Error).message}`));
          }
        });
        res.on('error', reject);
      }).on('error', reject);

      request.setTimeout(30000, () => {
        request.destroy();
        reject(new Error(`JSON fetch timeout: ${url}`));
      });
    });
  }

  async fetchVersionManifest(): Promise<{ versions: Array<{ id: string; type: string; url: string; time: string; releaseTime: string }> }> {
    return this.fetchJson(MANIFEST_URL);
  }

  async fetchVersionJson(versionUrl: string): Promise<VersionJson> {
    return this.fetchJson<VersionJson>(versionUrl);
  }

  async downloadClient(
    versionJson: VersionJson,
    versionsDir: string,
    onProgress?: (progress: { stage: string; file: string; percent: number }) => void,
  ): Promise<string> {
    const { id, downloads } = versionJson;
    const clientJar = downloads?.client;
    if (!clientJar) throw new Error('No client JAR found in version JSON');
    
    const dest = path.join(versionsDir, id, `${id}.jar`);
    const totalSize = clientJar.size || 0;

    onProgress?.({ stage: 'client', file: `${id}.jar`, percent: 0 });

    const onFileProgress = ({ downloaded }: { downloaded: number }) => {
      if (totalSize > 0) {
        const percent = Math.min(100, Math.floor((downloaded / totalSize) * 100));
        onProgress?.({ stage: 'client', file: `${id}.jar`, percent });
      }
    };
    this.on('file-progress', onFileProgress);

    try {
      await this.downloadFile(clientJar.url, dest, clientJar.sha1);
    } finally {
      this.off('file-progress', onFileProgress);
    }

    onProgress?.({ stage: 'client', file: `${id}.jar`, percent: 100 });
    return dest;
  }

  async downloadLibraries(
    versionJson: VersionJson,
    librariesDir: string,
    onProgress?: (progress: { stage: string; completed: number; total: number; percent: number; currentFile: string }) => void,
  ): Promise<{ results: DownloadFile[]; errors: { file: DownloadFile; error: string }[]; total: number }> {
    const platform = process.platform;
    const osName = platform === 'win32' ? 'windows' : platform === 'darwin' ? 'osx' : 'linux';

    const filesToDownload: DownloadFile[] = [];

    for (const lib of versionJson.libraries) {
      if (lib.rules) {
        const allowed = this._checkRules(lib.rules, osName);
        if (!allowed) continue;
      }

      if (lib.downloads?.artifact) {
        const artifact = lib.downloads.artifact;
        filesToDownload.push({
          url: artifact.url,
          dest: path.join(librariesDir, artifact.path),
          sha1: artifact.sha1,
          size: artifact.size,
        });
      }

      if (lib.natives) {
        const nativeKey = lib.natives[osName];
        if (nativeKey && lib.downloads?.classifiers?.[nativeKey]) {
          const native = lib.downloads.classifiers[nativeKey];
          filesToDownload.push({
            url: native.url,
            dest: path.join(librariesDir, native.path),
            sha1: native.sha1,
            size: native.size,
            isNative: true,
          });
        }
      }
    }

    const { results, errors } = await this.downloadBatch(filesToDownload, (progress) => {
      onProgress?.({
        stage: 'libraries',
        completed: progress.completed,
        total: progress.total,
        percent: progress.percent,
        currentFile: progress.currentFile,
      });
    });

    return { results, errors, total: filesToDownload.length };
  }

  async downloadAssets(
    versionJson: VersionJson,
    assetsDir: string,
    onProgress?: (progress: { stage: string; completed: number; total: number; percent: number; currentFile: string }) => void,
  ): Promise<{ results: DownloadFile[]; errors: { file: DownloadFile; error: string }[]; indexId: string }> {
    const assetIndex = versionJson.assetIndex;
    const indexPath = path.join(assetsDir, 'indexes', `${assetIndex.id}.json`);

    await this.downloadFile(assetIndex.url, indexPath, assetIndex.sha1);

    const indexJson = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    const objects = indexJson.objects;

    const filesToDownload: DownloadFile[] = Object.entries(objects).map(([name, obj]) => {
      const { hash, size } = obj as { hash: string; size: number };
      const prefix = hash.substring(0, 2);
      const url = `${RESOURCES_BASE}/${prefix}/${hash}`;
      const dest = path.join(assetsDir, 'objects', prefix, hash);
      return { url, dest, sha1: hash, size, name };
    });

    const { results, errors } = await this.downloadBatch(filesToDownload, (progress) => {
      onProgress?.({
        stage: 'assets',
        completed: progress.completed,
        total: progress.total,
        percent: progress.percent,
        currentFile: progress.currentFile,
      });
    });

    return { results, errors, indexId: assetIndex.id };
  }

  _checkRules(
    rules: Array<{ action: string; os?: { name: string } }>,
    osName: string,
  ): boolean {
    // Mojang rule spec: process rules in order; last matching rule wins.
    // A rule with no `os` matches all platforms.
    // A rule with `os` only matches that platform — non-matching os rules are SKIPPED entirely.
    let allowed = false;
    for (const rule of rules) {
      const applies = !rule.os || rule.os.name === osName;
      if (applies) allowed = rule.action === 'allow';
    }
    return allowed;
  }
}
