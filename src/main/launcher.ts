import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import crypto from 'crypto';

interface AppPaths {
  appData: string;
  instances: string;
  versions: string;
  assets: string;
  libraries: string;
  java: string;
}

interface LaunchOptions {
  versionJson: {
    id: string;
    libraries: Array<{
      name?: string;
      rules?: Array<{ action: string; os?: { name: string } }>;
      downloads?: {
        artifact?: { path: string };
        classifiers?: Record<string, { path: string }>;
      };
      natives?: Record<string, string>;
    }>;
    arguments?: {
      jvm?: unknown[];
      game?: unknown[];
    };
    mainClass: string;
    assetIndex?: { id: string };
    minecraftArguments?: string;
  };
  javaPath: string;
  instancePath: string;
  username: string;
  uuid?: string;
  ram?: number;
  jvmArgs?: string;
  windowWidth?: number;
  windowHeight?: number;
}

export class Launcher {
  paths: AppPaths;
  onLog: (line: string) => void;
  onClose: (info: { code?: number; duration?: number; error?: string }) => void;
  activeProcess: ChildProcess | null;

  constructor({
    paths,
    onLog,
    onClose,
  }: {
    paths: AppPaths;
    onLog?: (line: string) => void;
    onClose?: (info: { code?: number; duration?: number; error?: string }) => void;
  } = { paths: {} as AppPaths }) {
    this.paths = paths;
    this.onLog = onLog || (() => {});
    this.onClose = onClose || (() => {});
    this.activeProcess = null;
  }

  generateOfflineUUID(username: string): string {
    const hash = crypto
      .createHash('md5')
      .update(`OfflinePlayer:${username}`)
      .digest('hex');
    return [
      hash.slice(0, 8),
      hash.slice(8, 12),
      '3' + hash.slice(13, 16),
      ((parseInt(hash[16], 16) & 0x3) | 0x8).toString(16) + hash.slice(17, 20),
      hash.slice(20, 32),
    ].join('-');
  }

  buildClasspath(
    versionJson: LaunchOptions['versionJson'],
    librariesDir: string,
    clientJarPath: string,
    baseVersionId?: string,
    versionsDir?: string,
  ): string {
    const osName = this._osName();
    const separator = process.platform === 'win32' ? ';' : ':';
    const entries: string[] = [];
    for (const lib of versionJson.libraries) {
      if (lib.rules && !this._checkRules(lib.rules ?? [], osName)) continue;
      if (lib.downloads?.artifact) {
        // Mojang format (vanilla): has explicit downloads.artifact.path
        const libPath = path.join(librariesDir, lib.downloads.artifact.path);
        if (fs.existsSync(libPath)) entries.push(libPath);
      } else if (lib.name) {
        // Maven format (Fabric, Quilt): "group:artifact:version" — no downloads block
        const parts = lib.name.split(':');
        if (parts.length >= 3) {
          const [group, artifact, version] = parts;
          const groupPath = group.replace(/\./g, '/');
          const jarName = `${artifact}-${version}.jar`;
          const libPath = path.join(librariesDir, groupPath, artifact, version, jarName);
          if (fs.existsSync(libPath)) entries.push(libPath);
        }
      }
    }
    if (fs.existsSync(clientJarPath)) {
      entries.push(clientJarPath);
    } else if (baseVersionId && versionsDir) {
      const altJarPath = path.join(versionsDir, baseVersionId, `${baseVersionId}.jar`);
      if (fs.existsSync(altJarPath)) {
        entries.push(altJarPath);
      }
    }
    return entries.join(separator);
  }

  resolveArguments(args: unknown, vars: Record<string, string>): string[] {
    if (!args) return [];
    const osName = this._osName();
    const resolved: string[] = [];
    const argsArray = Array.isArray(args) ? args : [args];
    for (const arg of argsArray) {
      if (typeof arg === 'string') {
        const replaced = arg.replace(/\$\{([^}]+)\}/g, (m, k) => (k in vars ? vars[k] : m));
        if (replaced.includes('=') && replaced.startsWith('-D')) {
          resolved.push(replaced.trim());
        } else {
          const parts = replaced.split(/\s+/).filter(Boolean);
          resolved.push(...parts);
        }
      } else if (arg && typeof arg === 'object') {
        const argObj = arg as { rules?: Array<{ action: string; os?: { name: string } }>; value?: unknown };
        if (argObj.rules && !this._checkRules(argObj.rules, osName)) continue;
        const values = Array.isArray(argObj.value) ? argObj.value : [argObj.value];
        for (const val of values) {
          const replaced = String(val).replace(/\$\{([^}]+)\}/g, (m, k) =>
            k in vars ? vars[k] : m,
          );
          if (replaced.includes('=') && replaced.startsWith('-D')) {
            resolved.push(replaced.trim());
          } else {
            const parts = replaced.split(/\s+/).filter(Boolean);
            resolved.push(...parts);
          }
        }
      }
    }
    return resolved;
  }

  async extractNatives(
    versionJson: LaunchOptions['versionJson'],
    librariesDir: string,
    nativesDir: string,
  ): Promise<void> {
    const osName = this._osName();
    await fs.promises.mkdir(nativesDir, { recursive: true });
    for (const lib of versionJson.libraries) {
      if (!lib.natives) continue;
      const nativeKey = lib.natives[osName];
      if (!nativeKey || !lib.downloads?.classifiers?.[nativeKey]) continue;
      const nativePath = path.join(
        librariesDir,
        lib.downloads.classifiers[nativeKey].path,
      );
      if (!fs.existsSync(nativePath)) continue;
      try {
        const AdmZip = require('adm-zip');
        new AdmZip(nativePath).extractAllTo(nativesDir, true);
      } catch (err) {
        this.onLog(`[WARN] Native extract failed: ${(err as Error).message}`);
      }
    }
  }

  async launch(options: LaunchOptions): Promise<{ pid: number; version: string; username: string; uuid: string }> {
    const {
      versionJson,
      javaPath,
      instancePath,
      username,
      uuid,
      ram = 2048,
      jvmArgs = '',
      windowWidth = 854,
      windowHeight = 480,
    } = options;

    if (this.activeProcess) throw new Error('A game instance is already running');

    const versionsDir = this.paths.versions;
    const librariesDir = this.paths.libraries;
    const assetsDir = this.paths.assets;

    const mcVersion = versionJson.id;
    const inheritsFrom = (versionJson as { inheritsFrom?: string }).inheritsFrom;
    const baseVersionId = inheritsFrom || mcVersion;
    const clientJarPath = path.join(versionsDir, baseVersionId, `${baseVersionId}.jar`);
    const gameDirPath = path.join(instancePath, '.minecraft');
    const nativesDir = path.join(instancePath, 'natives');

    const resolvedUuid = uuid || this.generateOfflineUUID(username);

    await fs.promises.mkdir(gameDirPath, { recursive: true });

    // When a loader profile uses `inheritsFrom` (Fabric, Quilt), it only lists
    // its own libraries — vanilla libraries (LWJGL, log4j, etc.) live in the
    // parent version JSON. Merge them so the classpath is complete.
    let mergedVersionJson = versionJson;
    if (inheritsFrom) {
      const parentJsonPath = path.join(versionsDir, inheritsFrom, `${inheritsFrom}.json`);
      if (fs.existsSync(parentJsonPath)) {
        const parentJson = JSON.parse(fs.readFileSync(parentJsonPath, 'utf-8')) as typeof versionJson;

        // Deduplicate by group:artifact — loader version wins over parent.
        // Without this, e.g. Fabric ships asm-9.9 and vanilla ships asm-9.6;
        // both end up on the classpath and Fabric verifyClasspath() aborts.
        const mavenKey = (name?: string): string => {
          if (!name) return Math.random().toString();
          const parts = name.split(':');
          return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : name;
        };
        const seenKeys = new Set<string>(
          versionJson.libraries.map(l => mavenKey(l.name)),
        );
        const parentLibsDeduped = parentJson.libraries.filter(
          l => !seenKeys.has(mavenKey(l.name)),
        );

        mergedVersionJson = {
          ...parentJson,
          ...versionJson,
          libraries: [...versionJson.libraries, ...parentLibsDeduped],
          mainClass: versionJson.mainClass || parentJson.mainClass,
          arguments: {
            jvm: [
              ...((versionJson.arguments?.jvm as unknown[]) || []),
              ...((parentJson.arguments?.jvm as unknown[]) || []),
            ],
            game: [
              ...((versionJson.arguments?.game as unknown[]) || []),
              ...((parentJson.arguments?.game as unknown[]) || []),
            ],
          },
          assetIndex: versionJson.assetIndex || parentJson.assetIndex,
          minecraftArguments: versionJson.minecraftArguments || parentJson.minecraftArguments,
        };
      }
    }

    const classpath = this.buildClasspath(mergedVersionJson, librariesDir, clientJarPath, baseVersionId, versionsDir);
    await this.extractNatives(mergedVersionJson, librariesDir, nativesDir);

    const vars: Record<string, string> = {
      auth_player_name: username,
      auth_uuid: resolvedUuid,
      auth_access_token: resolvedUuid,
      auth_session: `token:${resolvedUuid}:${resolvedUuid}`,
      user_type: 'msa',
      user_properties: '{}',
      clientid: '',
      auth_xuid: '',
      game_directory: gameDirPath,
      assets_root: assetsDir,
      game_assets: assetsDir,
      assets_index_name: mergedVersionJson.assetIndex?.id || mcVersion,
      version_name: mcVersion,
      version_type: 'release',
      classpath: classpath,
      natives_directory: nativesDir,
      library_directory: librariesDir,
      launcher_name: 'MCLauncher',
      launcher_version: '1.0.0',
      resolution_width: String(windowWidth),
      resolution_height: String(windowHeight),
      quickPlayPath: '',
      quickPlaySingleplayer: '',
      quickPlayMultiplayer: '',
      quickPlayRealms: '',
    };

    const defaultJvm = [
      `-Xmx${ram}m`,
      `-Xms${Math.min(512, Math.floor(ram / 4))}m`,
      `-Djava.library.path=${nativesDir}`,
      `-Dminecraft.launcher.brand=MCLauncher`,
      `-Dminecraft.launcher.version=1.0.0`,
      // Note: -cp is intentionally omitted here. Modern version JSONs (vanilla 1.13+
      // and all loader profiles) supply -cp via their arguments.jvm block with the
      // full resolved ${classpath} variable. Adding a second -cp here with only the
      // vanilla classpath would shadow the complete one that includes loader libs.
    ];

    let versionJvm: string[] = [];
    if (mergedVersionJson.arguments?.jvm) {
      versionJvm = this.resolveArguments(mergedVersionJson.arguments.jvm, vars);
    }

    // Fallback: if the merged JSON produced no -cp at all (very old format), add it now
    if (!versionJvm.some(a => a === '-cp' || a === '-classpath')) {
      versionJvm = ['-cp', classpath, ...versionJvm];
    }

    const customJvm = jvmArgs
      ? jvmArgs.trim().split(/\s+/).filter(Boolean)
      : [];
    const allJvm = [...defaultJvm, ...versionJvm, ...customJvm];

    const mainClass = mergedVersionJson.mainClass;
    let rawGame: string[] = [];
    if (mergedVersionJson.arguments?.game) {
      rawGame = this.resolveArguments(mergedVersionJson.arguments.game, vars);
    } else if (mergedVersionJson.minecraftArguments) {
      rawGame = this.resolveArguments(
        mergedVersionJson.minecraftArguments.split(' '),
        vars,
      );
    }

    const STRIP = new Set([
      '--demo',
      '--quickPlayPath',
      '--quickPlaySingleplayer',
      '--quickPlayMultiplayer',
      '--quickPlayRealms',
    ]);
    const gameArgs: string[] = [];
    for (let i = 0; i < rawGame.length; i++) {
      if (STRIP.has(rawGame[i])) {
        i++;
        continue;
      }
      gameArgs.push(rawGame[i]);
    }

    const finalArgs = [...allJvm, mainClass, ...gameArgs];

    this.onLog(`[LAUNCHER] Starting Minecraft ${mcVersion}`);
    this.onLog(`[LAUNCHER] User: ${username} | UUID: ${resolvedUuid}`);
    this.onLog(`[LAUNCHER] CMD: ${javaPath} ${finalArgs.join(' ')}`);

    const gameProcess = spawn(javaPath, finalArgs, {
      cwd: gameDirPath,
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this.activeProcess = gameProcess;
    const startTime = Date.now();

    gameProcess.stdout?.on('data', (d: Buffer) =>
      d
        .toString()
        .split('\n')
        .filter(Boolean)
        .forEach((l) => this.onLog(`[OUT] ${l}`)),
    );
    gameProcess.stderr?.on('data', (d: Buffer) =>
      d
        .toString()
        .split('\n')
        .filter(Boolean)
        .forEach((l) => this.onLog(`[ERR] ${l}`)),
    );

    gameProcess.on('close', (code) => {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      this.activeProcess = null;
      this.onLog(`[LAUNCHER] Exited with code ${code} after ${duration}s`);
      this.onClose({ code: code ?? undefined, duration });
    });

    gameProcess.on('error', (err) => {
      this.activeProcess = null;
      this.onLog(`[LAUNCHER] Error: ${err.message}`);
      this.onClose({ error: err.message });
    });

    return { pid: gameProcess.pid!, version: mcVersion, username, uuid: resolvedUuid };
  }

  killGame(): void {
    if (this.activeProcess) {
      this.activeProcess.kill('SIGTERM');
      setTimeout(() => {
        if (this.activeProcess) this.activeProcess.kill('SIGKILL');
      }, 3000);
    }
  }

  isRunning(): boolean {
    return this.activeProcess !== null;
  }

  _osName(): string {
    return process.platform === 'win32'
      ? 'windows'
      : process.platform === 'darwin'
        ? 'osx'
        : 'linux';
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
