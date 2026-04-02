// src/renderer/pages/SettingsPage.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, Cpu, Trash2, User, Plus, CheckCircle, AlertTriangle,
  Loader2, FolderOpen, RefreshCw, Info, HardDrive, Monitor
} from 'lucide-react';
import { useLauncherStore } from '../store';
import Modal from '../components/Modal';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const SECTIONS = [
  { id: 'java', label: 'Java', icon: Cpu },
  { id: 'profiles', label: 'Profiles', icon: User },
  { id: 'launcher', label: 'Launcher', icon: Settings },
  { id: 'about', label: 'About', icon: Info },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('java');

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="h-full flex overflow-hidden"
    >
      {/* Settings nav */}
      <aside className="w-44 border-r border-bg-border bg-bg-surface p-3 flex-shrink-0">
        <p className="text-xs font-display font-semibold text-text-muted uppercase tracking-wider px-2 mb-2">
          Settings
        </p>
        <nav className="space-y-1">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-body transition-all
                ${activeSection === id ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-bg-elevated hover:text-text'}`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Section content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeSection === 'java' && <JavaSection />}
        {activeSection === 'profiles' && <ProfilesSection />}
        {activeSection === 'launcher' && <LauncherSection />}
        {activeSection === 'about' && <AboutSection />}
      </div>
    </motion.div>
  );
}

// ─── Java Section ─────────────────────────────────────────────────────────────

function JavaSection() {
  const { showToast, systemInfo, setJavaProgress, javaProgress } = useLauncherStore();
  const [detectedJava, setDetectedJava] = useState(null);
  const [managedJava, setManagedJava] = useState([]);
  const [detecting, setDetecting] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [customPath, setCustomPath] = useState('');

  useEffect(() => {
    loadJavaInfo();
  }, []);

  async function loadJavaInfo() {
    setDetecting(true);
    try {
      const [detected, managed] = await Promise.all([
        window.electronAPI.java.detect(),
        window.electronAPI.java.listManaged(),
      ]);
      setDetectedJava(detected);
      setManagedJava(managed);
    } catch (err) {
      console.error(err);
    }
    setDetecting(false);
  }

  async function downloadJava(version) {
    setDownloading(version);
    try {
      const result = await window.electronAPI.java.download({ majorVersion: version });
      showToast(`Java ${version} installed!`, 'success');
      await loadJavaInfo();
    } catch (err) {
      showToast(err.message, 'error');
    }
    setDownloading(null);
  }

  const JAVA_VERSIONS = [8, 17, 21];

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="font-display font-bold text-lg text-text mb-1">Java</h2>
        <p className="text-sm text-text-muted">Configure the Java runtime used to run Minecraft.</p>
      </div>

      {/* System Java detection */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-display font-semibold text-text">System Java</p>
          <button
            onClick={loadJavaInfo}
            disabled={detecting}
            className="text-text-muted hover:text-text transition-colors"
          >
            <RefreshCw size={14} className={detecting ? 'animate-spin' : ''} />
          </button>
        </div>

        {detecting ? (
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Loader2 size={14} className="animate-spin" />
            Detecting...
          </div>
        ) : detectedJava ? (
          <div className="flex items-center gap-3 p-3 bg-accent/5 border border-accent/20 rounded-xl">
            <CheckCircle size={16} className="text-accent flex-shrink-0" />
            <div>
              <p className="text-sm font-display font-semibold text-text">Java {detectedJava.version} detected</p>
              <p className="text-xs text-text-muted font-mono">{detectedJava.path}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-warn/5 border border-warn/20 rounded-xl">
            <AlertTriangle size={16} className="text-warn flex-shrink-0" />
            <p className="text-sm text-warn">No Java found on system PATH</p>
          </div>
        )}
      </div>

      {/* Managed Java installations */}
      <div className="card">
        <p className="text-sm font-display font-semibold text-text mb-3">Managed Java</p>
        <div className="space-y-2 mb-4">
          {JAVA_VERSIONS.map((v) => {
            const installed = managedJava.find((j) => j.major === v);
            const isDownloading = downloading === v;

            return (
              <div key={v} className="flex items-center justify-between p-3 bg-bg-elevated rounded-xl border border-bg-border">
                <div>
                  <p className="text-sm font-display font-semibold text-text">
                    Java {v}
                    {v === 8 && <span className="ml-2 text-[10px] text-text-muted">(MC ≤ 1.16)</span>}
                    {v === 17 && <span className="ml-2 text-[10px] text-text-muted">(MC 1.18–1.20)</span>}
                    {v === 21 && <span className="ml-2 text-[10px] text-text-muted">(MC 1.21+)</span>}
                  </p>
                  {installed && (
                    <p className="text-xs text-text-muted font-mono truncate mt-0.5">{installed.path}</p>
                  )}
                </div>

                {installed ? (
                  <span className="badge-green">
                    <CheckCircle size={10} /> Installed
                  </span>
                ) : (
                  <button
                    onClick={() => downloadJava(v)}
                    disabled={!!downloading}
                    className="btn-secondary text-xs py-1 px-3"
                  >
                    {isDownloading ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <HardDrive size={12} />
                    )}
                    {isDownloading ? 'Downloading...' : 'Download'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Java path */}
      <div className="card">
        <p className="text-sm font-display font-semibold text-text mb-3">Custom Java Path</p>
        <p className="text-xs text-text-muted mb-3">
          Override the default Java detection with a specific executable path.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="/usr/lib/jvm/java-21/bin/java"
            value={customPath}
            onChange={(e) => setCustomPath(e.target.value)}
            className="input text-sm font-mono"
          />
          <button className="btn-secondary px-3 flex-shrink-0">
            <FolderOpen size={14} />
          </button>
        </div>
        <button
          onClick={async () => {
            const store = await window.electronAPI.settings.get();
            await window.electronAPI.settings.set({ ...store, customJavaPath: customPath });
            showToast('Custom Java path saved', 'success');
          }}
          className="btn-primary mt-3"
        >
          Save Path
        </button>
      </div>

      {/* Java progress (if downloading) */}
      {javaProgress && (
        <div className="flex items-center gap-3 p-3 bg-bg-elevated border border-bg-border rounded-xl">
          <Loader2 size={14} className="animate-spin text-accent" />
          <div>
            <p className="text-sm text-text">{javaProgress.status}</p>
            {javaProgress.fileName && (
              <p className="text-xs text-text-muted font-mono">{javaProgress.fileName}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Profiles Section ──────────────────────────────────────────────────────────

function ProfilesSection() {
  const { profiles, activeProfile, setProfiles, setActiveProfile, showToast } = useLauncherStore();
  const [newUsername, setNewUsername] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);

  async function createProfile() {
    if (newUsername.trim().length < 3) return;
    setCreating(true);
    try {
      const profile = await window.electronAPI.profiles.create({ username: newUsername.trim() });
      const updated = await window.electronAPI.profiles.list();
      setProfiles(updated);
      setActiveProfile(profile);
      setNewUsername('');
      showToast(`Created profile "${profile.username}"`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
    setCreating(false);
  }

  async function deleteProfile(profile) {
    try {
      await window.electronAPI.profiles.delete({ profileId: profile.id });
      const updated = await window.electronAPI.profiles.list();
      setProfiles(updated);
      const active = await window.electronAPI.profiles.getActive();
      setActiveProfile(active);
      setDeleteModal(null);
      showToast(`Deleted "${profile.username}"`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function switchProfile(profile) {
    await window.electronAPI.profiles.setActive({ profileId: profile.id });
    setActiveProfile(profile);
    showToast(`Switched to ${profile.username}`, 'info');
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="font-display font-bold text-lg text-text mb-1">Profiles</h2>
        <p className="text-sm text-text-muted">Manage offline player accounts. No Microsoft login required.</p>
      </div>

      {/* Profile list */}
      <div className="card space-y-2">
        {profiles.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-4">No profiles yet</p>
        ) : (
          profiles.map((p) => (
            <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all
              ${activeProfile?.id === p.id ? 'bg-accent/5 border-accent/30' : 'bg-bg-elevated border-bg-border'}`}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent/40 to-accent/10 border border-accent/20 flex items-center justify-center text-sm font-display font-bold text-accent flex-shrink-0">
                {p.username[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-display font-semibold text-text">{p.username}</p>
                <p className="text-xs text-text-muted font-mono truncate">{p.uuid}</p>
              </div>
              <div className="flex items-center gap-1.5">
                {activeProfile?.id !== p.id && (
                  <button
                    onClick={() => switchProfile(p)}
                    className="text-xs px-2 py-1 bg-bg-overlay hover:bg-accent/10 hover:text-accent text-text-secondary border border-bg-border hover:border-accent/20 rounded-lg font-display font-medium transition-all"
                  >
                    Switch
                  </button>
                )}
                {activeProfile?.id === p.id && (
                  <span className="badge-green text-[10px]">Active</span>
                )}
                <button
                  onClick={() => setDeleteModal(p)}
                  className="text-text-muted hover:text-danger transition-colors p-1 rounded"
                  disabled={profiles.length === 1}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New profile */}
      <div className="card space-y-3">
        <p className="text-sm font-display font-semibold text-text">Add Profile</p>
        <input
          type="text"
          placeholder="Username (3–16 chars)"
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createProfile()}
          className="input"
          maxLength={16}
        />
        <button
          onClick={createProfile}
          disabled={creating || newUsername.trim().length < 3}
          className="btn-primary"
        >
          {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Create Profile
        </button>
      </div>

      {/* Delete confirm */}
      <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete Profile" width="max-w-sm">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Delete profile <strong className="text-text">"{deleteModal?.username}"</strong>? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteModal(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button onClick={() => deleteProfile(deleteModal)} className="btn-danger flex-1 justify-center">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Launcher Settings ─────────────────────────────────────────────────────────

function LauncherSection() {
  const { settings, setSettings, showToast } = useLauncherStore();
  const [local, setLocal] = useState({ ...settings });

  const update = (key, value) => setLocal((s) => ({ ...s, [key]: value }));

  async function save() {
    const saved = await window.electronAPI.settings.set(local);
    setSettings(saved);
    showToast('Settings saved', 'success');
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="font-display font-bold text-lg text-text mb-1">Launcher</h2>
        <p className="text-sm text-text-muted">Configure launcher behavior and appearance.</p>
      </div>

      <div className="card space-y-5">
        {/* Close on launch */}
        <ToggleSetting
          label="Close launcher when game starts"
          description="Minimizes the launcher window when Minecraft launches"
          value={local.closeLauncherOnStart ?? false}
          onChange={(v) => update('closeLauncherOnStart', v)}
        />

        {/* Show console */}
        <ToggleSetting
          label="Show game console by default"
          description="Automatically open the log console when a game starts"
          value={local.showGameConsole ?? true}
          onChange={(v) => update('showGameConsole', v)}
        />

        {/* Download parallelism */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-display font-semibold text-text">Download threads</p>
              <p className="text-xs text-text-muted">Parallel downloads. More = faster but uses more bandwidth.</p>
            </div>
            <span className="text-sm font-display font-bold text-accent w-6 text-right">
              {local.downloadParallelism ?? 4}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={12}
            value={local.downloadParallelism ?? 4}
            onChange={(e) => update('downloadParallelism', Number(e.target.value))}
            className="w-full accent-accent"
          />
        </div>
      </div>

      <button onClick={save} className="btn-primary">
        <CheckCircle size={14} /> Save Settings
      </button>
    </div>
  );
}

// ─── About Section ─────────────────────────────────────────────────────────────

function AboutSection() {
  const { systemInfo } = useLauncherStore();

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="font-display font-bold text-lg text-text mb-1">About</h2>
        <p className="text-sm text-text-muted">MCLauncher — offline Minecraft launcher</p>
      </div>

      <div className="card space-y-4">
        <div>
          <p className="text-xs font-display font-semibold text-text-secondary uppercase tracking-wider mb-3">
            System Info
          </p>
          {systemInfo ? (
            <div className="space-y-2 font-mono text-sm">
              <InfoRow label="Platform" value={systemInfo.platform} />
              <InfoRow label="Architecture" value={systemInfo.arch} />
              <InfoRow label="Total RAM" value={`${systemInfo.totalMemMB} MB`} />
              <InfoRow label="Free RAM" value={`${systemInfo.freeMemMB} MB`} />
              <InfoRow label="CPU Cores" value={systemInfo.cpus} />
              <InfoRow label="Data Path" value={systemInfo.appDataPath} truncate />
            </div>
          ) : (
            <Loader2 size={16} className="animate-spin text-text-muted" />
          )}
        </div>

        {systemInfo && (
          <button
            onClick={() => window.electronAPI.system.openFolder({ folderPath: systemInfo.appDataPath })}
            className="btn-secondary text-sm"
          >
            <FolderOpen size={14} /> Open Data Folder
          </button>
        )}
      </div>

      <div className="card">
        <p className="text-xs font-display font-semibold text-text-secondary uppercase tracking-wider mb-3">
          Launcher
        </p>
        <div className="space-y-2 font-mono text-sm">
          <InfoRow label="Version" value="1.0.0" />
          <InfoRow label="Electron" value={process?.versions?.electron || 'N/A'} />
          <InfoRow label="Node" value={process?.versions?.node || 'N/A'} />
        </div>
      </div>

      <div className="p-4 bg-bg-elevated border border-bg-border rounded-xl">
        <p className="text-xs text-text-muted leading-relaxed">
          MCLauncher is an unofficial, open-source Minecraft launcher for offline (non-premium) play.
          It is not affiliated with Mojang Studios or Microsoft.
          Minecraft® is a trademark of Mojang Studios.
        </p>
      </div>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function ToggleSetting({ label, description, value, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-display font-semibold text-text">{label}</p>
        {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0 mt-0.5
          ${value ? 'bg-accent' : 'bg-bg-overlay border border-bg-border'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200
          ${value ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

function InfoRow({ label, value, truncate }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-text-muted text-xs flex-shrink-0">{label}</span>
      <span className={`text-text text-xs text-right ${truncate ? 'truncate max-w-[240px]' : ''}`}>{value}</span>
    </div>
  );
}
