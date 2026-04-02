// src/renderer/pages/ModsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Package, Loader2, ToggleLeft, ToggleRight,
  Trash2, Download, RefreshCw, AlertTriangle, ExternalLink
} from 'lucide-react';
import { useLauncherStore } from '../store';
import ModCard from '../components/ModCard';
import Modal from '../components/Modal';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const TABS = ['browse', 'installed'];

export default function ModsPage() {
  const { instances, selectedInstanceId, setSelectedInstance, showToast } = useLauncherStore();
  const [tab, setTab] = useState('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [installedMods, setInstalledMods] = useState([]);
  const [installingMod, setInstallingMod] = useState(null);
  const [versionModal, setVersionModal] = useState(null);
  const [searchOffset, setSearchOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const selectedInstance = instances.find((i) => i.id === selectedInstanceId);

  // Load installed mods
  useEffect(() => {
    if (selectedInstanceId) {
      loadInstalledMods();
    }
  }, [selectedInstanceId]);

  async function loadInstalledMods() {
    if (!selectedInstanceId) return;
    try {
      const mods = await window.electronAPI.instances.getMods({ instanceId: selectedInstanceId });
      setInstalledMods(mods);
    } catch (err) {
      console.error(err);
    }
  }

  // Search Modrinth
  const handleSearch = useCallback(async (reset = true) => {
    if (!selectedInstance) {
      showToast('Select an instance first', 'warning');
      return;
    }

    const offset = reset ? 0 : searchOffset;
    if (reset) setSearchResults([]);
    setSearching(true);

    try {
      const result = await window.electronAPI.modrinth.search({
        query: searchQuery,
        mcVersion: selectedInstance.mcVersion,
        loader: selectedInstance.loader,
        offset,
        limit: 20,
      });

      const hits = result.hits || [];
      setSearchResults((prev) => reset ? hits : [...prev, ...hits]);
      setHasMore(hits.length === 20);
      if (!reset) setSearchOffset(offset + 20);
      else setSearchOffset(20);
    } catch (err) {
      showToast('Failed to search Modrinth', 'error');
    }
    setSearching(false);
  }, [searchQuery, selectedInstance, searchOffset]);

  // Auto-search on query change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (tab === 'browse') handleSearch(true);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedInstance?.id]);

  // Load default results when switching to browse
  useEffect(() => {
    if (tab === 'browse' && searchResults.length === 0) {
      handleSearch(true);
    }
  }, [tab]);

  async function handleInstallVersion(mod, version) {
    setInstallingMod(mod.project_id || mod.id);
    setVersionModal(null);
    try {
      await window.electronAPI.modrinth.installMod({
        instanceId: selectedInstanceId,
        versionData: version,
      });
      await loadInstalledMods();
      showToast(`Installed ${mod.title}!`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
    setInstallingMod(null);
  }

  async function handleInstallMod(mod) {
    // Fetch available versions first
    try {
      const versions = await window.electronAPI.modrinth.getVersions({
        projectId: mod.project_id || mod.slug,
        mcVersion: selectedInstance?.mcVersion,
        loader: selectedInstance?.loader,
      });

      if (versions.length === 0) {
        showToast('No compatible versions found', 'warning');
        return;
      }

      if (versions.length === 1) {
        // Auto-install if only one version
        await handleInstallVersion(mod, versions[0]);
      } else {
        setVersionModal({ mod, versions });
      }
    } catch (err) {
      showToast('Failed to fetch mod versions', 'error');
    }
  }

  async function handleToggleMod(mod) {
    try {
      const result = await window.electronAPI.instances.toggleMod({
        instanceId: selectedInstanceId,
        filename: mod.filename,
      });
      await loadInstalledMods();
      showToast(
        result.enabled ? `Enabled ${mod.filename}` : `Disabled ${mod.filename}`,
        'info'
      );
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function handleDeleteMod(mod) {
    try {
      await window.electronAPI.instances.deleteMod({
        instanceId: selectedInstanceId,
        filename: mod.filename,
      });
      await loadInstalledMods();
      showToast(`Deleted ${mod.filename}`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  const isInstalled = (mod) => {
    const name = (mod.title || mod.slug || '').toLowerCase();
    return installedMods.some((m) => m.filename.toLowerCase().includes(name));
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="h-full flex flex-col overflow-hidden p-6 gap-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="font-display font-bold text-xl text-text">Mods</h1>
          <p className="text-sm text-text-muted">Powered by Modrinth</p>
        </div>

        {/* Instance selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Instance:</span>
          <select
            value={selectedInstanceId || ''}
            onChange={(e) => setSelectedInstance(e.target.value)}
            className="input w-48 text-sm py-1.5"
          >
            <option value="">Select instance...</option>
            {instances.map((i) => (
              <option key={i.id} value={i.id}>{i.name} ({i.mcVersion})</option>
            ))}
          </select>
        </div>
      </div>

      {/* No instance warning */}
      {!selectedInstance && (
        <div className="flex items-center gap-3 p-4 bg-warn/10 border border-warn/20 rounded-xl">
          <AlertTriangle size={16} className="text-warn flex-shrink-0" />
          <p className="text-sm text-warn">Select an instance to browse and manage mods.</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-bg-elevated rounded-xl p-1 flex-shrink-0 w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-display font-semibold capitalize transition-all
              ${tab === t ? 'bg-bg-overlay text-text shadow' : 'text-text-muted hover:text-text'}`}
          >
            {t}
            {t === 'installed' && installedMods.length > 0 && (
              <span className="ml-2 text-xs bg-accent/20 text-accent px-1.5 py-0.5 rounded-full">
                {installedMods.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Browse tab */}
      {tab === 'browse' && (
        <div className="flex-1 flex flex-col gap-3 overflow-hidden">
          {/* Search bar */}
          <div className="relative flex-shrink-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder={selectedInstance ? `Search mods for ${selectedInstance.mcVersion}...` : 'Search mods...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-9"
            />
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {searching && searchResults.length === 0 ? (
              <div className="flex justify-center py-12">
                <Loader2 size={24} className="animate-spin text-text-muted" />
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-12">
                <Package size={32} className="text-text-muted mx-auto mb-3" />
                <p className="text-sm text-text-muted">
                  {selectedInstance ? 'Search for mods above' : 'Select an instance first'}
                </p>
              </div>
            ) : (
              <>
                {searchResults.map((mod) => (
                  <ModCard
                    key={mod.project_id || mod.slug}
                    mod={mod}
                    isInstalled={isInstalled(mod)}
                    isInstalling={installingMod === (mod.project_id || mod.id)}
                    onInstall={() => handleInstallMod(mod)}
                  />
                ))}
                {hasMore && (
                  <button
                    onClick={() => handleSearch(false)}
                    disabled={searching}
                    className="btn-secondary w-full justify-center mt-2"
                  >
                    {searching ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    Load more
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Installed tab */}
      {tab === 'installed' && (
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-text-muted">{installedMods.length} mods</span>
            <button onClick={loadInstalledMods} className="text-xs text-text-muted hover:text-text flex items-center gap-1">
              <RefreshCw size={11} /> Refresh
            </button>
          </div>

          {installedMods.length === 0 ? (
            <div className="text-center py-12">
              <Package size={32} className="text-text-muted mx-auto mb-3" />
              <p className="text-sm text-text-muted">
                {selectedInstance ? 'No mods installed' : 'Select an instance first'}
              </p>
            </div>
          ) : (
            installedMods.map((mod) => (
              <InstalledModRow
                key={mod.filename}
                mod={mod}
                onToggle={() => handleToggleMod(mod)}
                onDelete={() => handleDeleteMod(mod)}
              />
            ))
          )}
        </div>
      )}

      {/* Version selection modal */}
      {versionModal && (
        <Modal
          open
          onClose={() => setVersionModal(null)}
          title={`Select Version — ${versionModal.mod.title}`}
          width="max-w-lg"
        >
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {versionModal.versions.map((v) => (
              <button
                key={v.id}
                onClick={() => handleInstallVersion(versionModal.mod, v)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-bg-elevated hover:bg-bg-overlay border border-bg-border hover:border-accent/20 transition-all text-left"
              >
                <div>
                  <p className="text-sm font-display font-semibold text-text">{v.name}</p>
                  <p className="text-xs text-text-muted font-mono mt-0.5">
                    {v.game_versions?.join(', ')} · {v.loaders?.join(', ')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {v.version_type === 'release' && (
                    <span className="badge-green">Release</span>
                  )}
                  {v.version_type === 'beta' && (
                    <span className="badge-yellow">Beta</span>
                  )}
                  {v.version_type === 'alpha' && (
                    <span className="badge-gray">Alpha</span>
                  )}
                  <Download size={14} className="text-text-muted" />
                </div>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </motion.div>
  );
}

// ─── Installed mod row ─────────────────────────────────────────────────────────

function InstalledModRow({ mod, onToggle, onDelete }) {
  const isEnabled = mod.enabled;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all
      ${isEnabled ? 'bg-bg-surface border-bg-border' : 'bg-bg-surface/50 border-bg-border/50 opacity-60'}`}
    >
      <Package size={16} className={isEnabled ? 'text-accent' : 'text-text-muted'} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-mono text-text truncate">{mod.filename}</p>
        <p className="text-xs text-text-muted">
          {(mod.size / 1024 / 1024).toFixed(2)} MB
        </p>
      </div>

      {/* Toggle */}
      <button
        onClick={onToggle}
        className="transition-colors"
        title={isEnabled ? 'Disable' : 'Enable'}
      >
        {isEnabled
          ? <ToggleRight size={22} className="text-accent" />
          : <ToggleLeft size={22} className="text-text-muted" />
        }
      </button>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="text-text-muted hover:text-danger transition-colors"
        title="Delete mod"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
