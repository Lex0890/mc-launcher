# MCLauncher

A modern, offline (non-premium) Minecraft launcher built with Electron 28, React 18, and Vite.

> **Not affiliated with Mojang Studios or Microsoft.** Minecraft® is a trademark of Mojang Studios.

---

## ✨ Features

- 🔓 **Offline authentication** — play without a Microsoft/Mojang account
- 🗂️ **Isolated instances** — each instance has its own mods, config, saves
- ☕ **Auto Java management** — detects or downloads the right JDK from Adoptium
- 🧩 **Modrinth integration** — search and install mods directly
- 📦 **Mod loaders** — Vanilla, Fabric, Forge, Quilt, NeoForge
- 📊 **Real-time progress** — download progress + game console log
- 🖥️ **Cross-platform** — Windows, macOS, Linux

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+ or yarn 3+
- Git

### Development

```bash
git clone https://github.com/yourname/mc-launcher.git
cd mc-launcher

npm install
npm run dev
```

This starts:
1. Vite dev server on `http://localhost:5173`
2. Electron app (waits for Vite to be ready first)

### Build distributables

```bash
# All platforms (current OS)
npm run build

# Windows .exe
npm run build:win

# Linux .AppImage
npm run build:linux

# macOS .dmg
npm run build:mac
```

Output is placed in `dist-electron/`.

---

## 📁 Project Structure

```
mc-launcher/
├── src/
│   ├── main/                    # Electron main process (Node.js)
│   │   ├── index.js             # Entry: creates window, registers IPC
│   │   ├── store.js             # electron-store schema + initialization
│   │   ├── downloader.js        # Downloads: client JAR, libraries, assets
│   │   ├── javaManager.js       # Java detection + Adoptium auto-download
│   │   ├── launcher.js          # Builds classpath + spawns java process
│   │   └── ipcHandlers.js       # All IPC: profiles, instances, game, mods
│   │
│   ├── preload.js               # contextBridge → window.electronAPI
│   │
│   ├── renderer/                # React app (Vite)
│   │   ├── index.html
│   │   ├── main.jsx             # ReactDOM.createRoot
│   │   ├── index.css            # Tailwind + global styles
│   │   ├── App.jsx              # Router + event bus + bootstrap
│   │   ├── store/index.js       # Zustand global state
│   │   ├── pages/
│   │   │   ├── HomePage.jsx     # Instance selector + play button
│   │   │   ├── InstancesPage.jsx # CRUD + version/loader picker
│   │   │   ├── ModsPage.jsx     # Modrinth browser + installed list
│   │   │   └── SettingsPage.jsx # Java, profiles, launcher prefs
│   │   └── components/
│   │       ├── Titlebar.jsx     # Custom window frame
│   │       ├── Sidebar.jsx      # Animated nav
│   │       ├── Console.jsx      # Scrollable game log terminal
│   │       ├── DownloadProgress.jsx  # Floating progress bar
│   │       ├── Toast.jsx        # Notification system
│   │       ├── InstanceCard.jsx # Instance list item
│   │       ├── ModCard.jsx      # Modrinth search result card
│   │       └── Modal.jsx        # Reusable dialog
│   │
│   └── shared/
│       └── constants.js         # API URLs, IPC channels, enums
│
├── assets/
│   └── icon.png                 # 256×256 app icon
│
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── electron-builder.yml
```

---

## 🔒 Security Model

- **contextIsolation: true** — renderer never accesses Node.js directly
- All IPC goes through `window.electronAPI` (exposed via `contextBridge` in `preload.js`)
- No `nodeIntegration` in renderer
- External navigation is blocked; only `shell.openExternal` is used for links

---

## ☕ Java Version Mapping

| Minecraft Version | Java Required |
|---|---|
| ≤ 1.16.x | Java 8 |
| 1.17 | Java 16 |
| 1.18 – 1.20.x | Java 17 |
| 1.21+ | Java 21 |

---

## 📜 Data Storage

All launcher data lives in:
- **Windows:** `%APPDATA%\.mclauncher\`
- **macOS:** `~/Library/Application Support/.mclauncher/`
- **Linux:** `~/.config/.mclauncher/`

Directory layout:
```
.mclauncher/
├── instances/       # One folder per instance
├── versions/        # Downloaded version JARs and JSON
├── assets/          # Game assets (shared)
├── libraries/       # Shared Java libraries
└── java/            # Managed JDK installations
```

---

## 🛠️ Adding a New Feature

1. **Main process logic** → `src/main/` (Node.js)
2. **Expose it** → `ipcHandlers.js` + `preload.js`
3. **UI** → `src/renderer/pages/` or `src/renderer/components/`
4. **State** → `src/renderer/store/index.js`

---

## 📄 License

MIT — see `LICENSE` for details.
