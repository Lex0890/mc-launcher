import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { Downloader } from './downloader';

const ADOPTIUM_API = 'https://api.adoptium.net/v3/assets/latest';

const ADOPTIUM_OS: Record<string, string> = {
  win32: 'windows',
  linux: 'linux',
  darwin: 'mac',
};

const ADOPTIUM_ARCH: Record<string, string> = {
  x64: 'x64',
  arm64: 'aarch64',
  ia32: 'x86',
};

export interface JavaInfo {
  path: string;
  version: number;
  versionString: string;
}

interface JavaManagerOptions {
  javaDir?: string;
  onProgress?: (progress: { stage: string; status: string; version?: number; fileName?: string; size?: number; path?: string }) => void;
}

export class JavaManager {
  javaDir?: string;
  onProgress: (progress: { stage: string; status: string; version?: number; fileName?: string; size?: number; path?: string }) => void;
  downloader: Downloader;

  constructor({ javaDir, onProgress }: JavaManagerOptions = {}) {
    this.javaDir = javaDir;
    this.onProgress = onProgress || (() => {});
    this.downloader = new Downloader();
  }

  getRequiredJavaVersion(mcVersion: string): number {
    const cleanVersion = mcVersion.replace(/^fabric-loader-|^quilt-loader-|^forge-|^neoforge-/, '');
    const match = cleanVersion.match(/^(\d+)\.(\d+)/);
    if (!match) return 21;

    const [, majorStr, minorStr] = match;
    const major = parseInt(majorStr);
    const minor = parseInt(minorStr);

    if (major !== 1) return 21;
    if (minor <= 16) return 8;
    if (minor === 17) return 16;
    if (minor <= 20) return 17;
    return 21;
  }

  detectJavaAtPath(javaPath: string): JavaInfo | null {
    try {
      const result = spawnSync(javaPath, ['-version'], {
        encoding: 'utf-8',
        timeout: 5000,
      });

      const output = result.stderr || result.stdout || '';
      const match = output.match(/version "([^"]+)"/);

      if (!match) return null;

      const versionStr = match[1];
      let major: number;

      if (versionStr.startsWith('1.')) {
        major = parseInt(versionStr.split('.')[1]);
      } else {
        major = parseInt(versionStr.split('.')[0]);
      }

      return { path: javaPath, version: major, versionString: versionStr };
    } catch {
      return null;
    }
  }

  detectSystemJava(): JavaInfo | null {
    const candidates: string[] = ['java'];

    if (process.platform === 'win32') {
      candidates.push(
        'C:\\Program Files\\Java\\jdk-17\\bin\\java.exe',
        'C:\\Program Files\\Java\\jdk-21\\bin\\java.exe',
        'C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.0.0-hotspot\\bin\\java.exe',
      );
    } else if (process.platform === 'darwin') {
      candidates.push(
        '/usr/bin/java',
        '/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home/bin/java',
        '/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home/bin/java',
      );

      if (process.env.JAVA_HOME) {
        candidates.push(path.join(process.env.JAVA_HOME, 'bin', 'java'));
      }
    } else {
      candidates.push(
        '/usr/bin/java',
        '/usr/lib/jvm/java-17-openjdk-amd64/bin/java',
        '/usr/lib/jvm/java-21-openjdk-amd64/bin/java',
        '/usr/lib/jvm/temurin-17/bin/java',
      );

      if (process.env.JAVA_HOME) {
        candidates.push(path.join(process.env.JAVA_HOME, 'bin', 'java'));
      }
    }

    for (const candidate of candidates) {
      const result = this.detectJavaAtPath(candidate);
      if (result) return result;
    }

    return null;
  }

  findManagedJava(majorVersion: number): JavaInfo | null {
    if (!this.javaDir) return null;
    const javaInstallDir = path.join(this.javaDir, `java${majorVersion}`);

    if (!fs.existsSync(javaInstallDir)) return null;

    const javaExe = process.platform === 'win32' ? 'java.exe' : 'java';

    const entries = fs.readdirSync(javaInstallDir);
    for (const entry of entries) {
      const binPath = path.join(javaInstallDir, entry, 'bin', javaExe);
      if (fs.existsSync(binPath)) {
        const detected = this.detectJavaAtPath(binPath);
        if (detected && detected.version === majorVersion) {
          return detected;
        }
      }
    }

    const directBin = path.join(javaInstallDir, 'bin', javaExe);
    if (fs.existsSync(directBin)) {
      return this.detectJavaAtPath(directBin);
    }

    return null;
  }

  async getJavaForVersion(mcVersion: string, customJavaPath: string | null = null): Promise<JavaInfo> {
    const requiredMajor = this.getRequiredJavaVersion(mcVersion);

    if (customJavaPath) {
      const detected = this.detectJavaAtPath(customJavaPath);
      if (detected) {
        return detected;
      }
      throw new Error(`Custom Java path not found or invalid: ${customJavaPath}`);
    }

    const managed = this.findManagedJava(requiredMajor);
    if (managed) return managed;

    const system = this.detectSystemJava();
    if (system && system.version >= requiredMajor) {
      return system;
    }

    this.onProgress({ stage: 'java', status: 'downloading', version: requiredMajor });
    const downloaded = await this.downloadJava(requiredMajor);
    return downloaded;
  }

  async downloadJava(majorVersion: number): Promise<JavaInfo> {
    const platform = process.platform;
    const arch = process.arch;

    const adoptiumOs = ADOPTIUM_OS[platform] || 'linux';
    const adoptiumArch = ADOPTIUM_ARCH[arch] || 'x64';

    const apiUrl = `${ADOPTIUM_API}/${majorVersion}/hotspot?os=${adoptiumOs}&architecture=${adoptiumArch}&image_type=jdk&jvm_impl=hotspot&vendor=eclipse`;

    this.onProgress({ stage: 'java', status: 'fetching-release-info', version: majorVersion });

    const releases = await this.downloader.fetchJson<Array<{
      binary: {
        package: {
          name: string;
          link: string;
          size: number;
          checksum: string;
        };
      };
    }>>(apiUrl);

    if (!releases || releases.length === 0) {
      throw new Error(`No Java ${majorVersion} release found for ${adoptiumOs}/${adoptiumArch}`);
    }

    const release = releases[0];
    const binary = release.binary;
    const pkg = binary.package;

    if (!this.javaDir) throw new Error('Java directory not configured');
    const installDir = path.join(this.javaDir, `java${majorVersion}`);
    await fs.promises.mkdir(installDir, { recursive: true });

    const ext = pkg.name.endsWith('.zip') ? '.zip' : pkg.name.endsWith('.tar.gz') ? '.tar.gz' : '.pkg';
    const archivePath = path.join(installDir, `java${majorVersion}${ext}`);

    this.onProgress({
      stage: 'java',
      status: 'downloading',
      version: majorVersion,
      fileName: pkg.name,
      size: pkg.size,
    });

    await this.downloader.downloadFile(pkg.link, archivePath, null);

    if (pkg.checksum) {
      const actualHash = await this._computeSha256(archivePath);
      if (actualHash !== pkg.checksum) {
        fs.unlinkSync(archivePath);
        throw new Error(`SHA256 mismatch for Java ${majorVersion} archive: expected ${pkg.checksum}, got ${actualHash}`);
      }
    }

    this.onProgress({ stage: 'java', status: 'extracting', version: majorVersion });

    await this.extractJava(archivePath, installDir, ext);

    fs.unlinkSync(archivePath);

    const found = this.findManagedJava(majorVersion);
    if (!found) {
      throw new Error(`Java ${majorVersion} installation failed: executable not found after extraction`);
    }

    this.onProgress({ stage: 'java', status: 'ready', version: majorVersion, path: found.path });
    return found;
  }

  async extractJava(archivePath: string, destDir: string, ext: string): Promise<void> {
    if (ext === '.zip') {
      const extract = await import('extract-zip');
      await extract.default(archivePath, { dir: destDir });
    } else if (ext === '.tar.gz') {
      const tar = await import('tar');
      await tar.extract({ file: archivePath, cwd: destDir });
    } else {
      throw new Error(`Unsupported archive format: ${ext}`);
    }
  }

  async _computeSha256(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const crypto = require('crypto');
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  listManagedInstallations(): Array<JavaInfo & { major: number; managed: boolean }> {
    if (!this.javaDir || !fs.existsSync(this.javaDir)) return [];

    const results: Array<JavaInfo & { major: number; managed: boolean }> = [];
    const entries = fs.readdirSync(this.javaDir);

    for (const entry of entries) {
      const match = entry.match(/^java(\d+)$/);
      if (match) {
        const major = parseInt(match[1]);
        const found = this.findManagedJava(major);
        if (found) {
          results.push({ major, ...found, managed: true });
        }
      }
    }

    return results;
  }
}
