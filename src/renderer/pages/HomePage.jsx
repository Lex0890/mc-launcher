// src/renderer/pages/HomePage.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Plus, User, AlertTriangle, Loader2, StopCircle, Terminal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLauncherStore } from '../store';
import Modal from '../components/Modal';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export default function HomePage() {
  const navigate = useNavigate();
  const {
    activeProfile,
    instances,
    selectedInstanceId,
    setSelectedInstance,
    gameRunning,
    gameStatus,
    setGameRunning,
    showToast,
    setInstances,
    setProfiles,
    setActiveProfile,
    consoleOpen,
    setConsoleOpen,
  } = useLauncherStore();

  const [launching, setLaunching] = useState(false);
  const [loginModal, setLoginModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [creatingProfile, setCreatingProfile] = useState(false);

  const selectedInstance = instances.find((i) => i.id === selectedInstanceId);
  const canPlay = selectedInstance?.isInstalled && activeProfile && !gameRunning && !launching;

  // Auto-select first instance
  useEffect(() => {
    if (!selectedInstanceId && instances.length > 0) {
      setSelectedInstance(instances[0].id);
    }
  }, [instances]);

  // Show login modal if no profile
  useEffect(() => {
    if (!activeProfile && !loginModal) {
      setLoginModal(true);
    }
  }, [activeProfile]);

  async function handlePlay() {
    if (!canPlay) return;
    setLaunching(true);
    try {
      await window.electronAPI.game.launch({ instanceId: selectedInstance.id });
    } catch (err) {
      showToast(err.message, 'error');
      setLaunching(false);
    }
    setLaunching(false);
  }

  async function handleStop() {
    await window.electronAPI.game.kill();
  }

  async function handleCreateProfile() {
    if (!newUsername.trim() || newUsername.trim().length < 3) {
      showToast('Username must be at least 3 characters', 'error');
      return;
    }
    setCreatingProfile(true);
    try {
      const profile = await window.electronAPI.profiles.create({ username: newUsername.trim() });
      const profiles = await window.electronAPI.profiles.list();
      setProfiles(profiles);
      setActiveProfile(profile);
      setLoginModal(false);
      showToast(`Welcome, ${profile.username}!`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
    setCreatingProfile(false);
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="h-full flex flex-col overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-accent/5 rounded-full blur-[80px]" />
        <div className="absolute top-1/4 right-0 w-[300px] h-[300px] bg-info/3 rounded-full blur-[100px]" />
      </div>

      <div className="relative flex-1 flex flex-col overflow-y-auto p-6 gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-2xl text-text">
              {activeProfile ? (
                <>Hello, <span className="text-accent">{activeProfile.username}</span></>
              ) : (
                'Welcome to MCLauncher'
              )}
            </h1>
            <p className="text-sm text-text-muted mt-1">
              {instances.length === 0
                ? 'Create an instance to get started'
                : `${instances.length} instance${instances.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          {/* Profile button */}
          <button
            onClick={() => setLoginModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-bg-elevated hover:bg-bg-overlay border border-bg-border rounded-xl text-sm font-display font-medium transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent/40 to-accent/10 flex items-center justify-center text-xs font-bold text-accent">
              {activeProfile?.username?.[0]?.toUpperCase() || '?'}
            </div>
            {activeProfile?.username || 'Set up profile'}
          </button>
        </div>

        {/* Instance list */}
        {instances.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center gap-4 text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-bg-elevated border border-bg-border flex items-center justify-center">
              <Plus size={32} className="text-text-muted" />
            </div>
            <div>
              <p className="font-display font-semibold text-text">No instances yet</p>
              <p className="text-sm text-text-muted mt-1">Create your first Minecraft instance to start playing</p>
            </div>
            <button onClick={() => navigate('/instances')} className="btn-primary">
              <Plus size={15} /> Create Instance
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {instances.map((instance) => (
              <InstanceRow
                key={instance.id}
                instance={instance}
                isSelected={selectedInstanceId === instance.id}
                onSelect={() => setSelectedInstance(instance.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom play bar */}
      {instances.length > 0 && (
        <div className="relative border-t border-bg-border bg-bg-surface px-6 py-4 flex items-center gap-4">
          {/* Selected instance info */}
          <div className="flex-1 min-w-0">
            {selectedInstance ? (
              <div>
                <p className="font-display font-semibold text-sm text-text truncate">{selectedInstance.name}</p>
                <p className="text-xs text-text-muted font-mono">
                  {selectedInstance.mcVersion}
                  {selectedInstance.loader !== 'vanilla' && ` · ${selectedInstance.loader}`}
                </p>
              </div>
            ) : (
              <p className="text-sm text-text-muted">Select an instance</p>
            )}
          </div>

          {/* Game status */}
          {gameStatus && (
            <span className="text-xs text-text-secondary font-body">{gameStatus.message}</span>
          )}

          {/* Console toggle */}
          <button
            onClick={() => setConsoleOpen(!consoleOpen)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-display font-medium border transition-colors
              ${consoleOpen ? 'bg-info/10 text-info border-info/20' : 'bg-bg-elevated text-text-secondary border-bg-border hover:text-text'}`}
          >
            <Terminal size={13} />
            Console
          </button>

          {/* Play / Stop button */}
          {gameRunning ? (
            <button
              onClick={handleStop}
              className="flex items-center gap-2 px-6 py-2.5 bg-danger/20 hover:bg-danger/30 text-danger border border-danger/30 rounded-xl font-display font-bold text-sm transition-all"
            >
              <StopCircle size={16} />
              Stop Game
            </button>
          ) : (
            <button
              onClick={handlePlay}
              disabled={!canPlay}
              className={`flex items-center gap-2 px-8 py-2.5 rounded-xl font-display font-bold text-sm transition-all duration-200
                ${canPlay
                  ? 'bg-accent hover:bg-accent-hover text-white shadow-glow hover:shadow-glow-lg active:scale-95'
                  : 'bg-bg-elevated text-text-muted border border-bg-border cursor-not-allowed'
                }`}
            >
              {launching ? (
                <><Loader2 size={16} className="animate-spin" /> Launching...</>
              ) : (
                <><Play size={16} fill="currentColor" /> Play</>
              )}
            </button>
          )}
        </div>
      )}

      {/* Login / Profile modal */}
      <Modal open={loginModal} onClose={() => activeProfile && setLoginModal(false)} title="Player Profile">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            MCLauncher uses offline (non-premium) authentication. Your username is saved locally and used to generate a unique player ID.
          </p>

          {/* Existing profiles */}
          {useLauncherStore.getState().profiles.length > 0 && (
            <ExistingProfiles onClose={() => setLoginModal(false)} />
          )}

          {/* New profile */}
          <div className="space-y-3 pt-2 border-t border-bg-border">
            <p className="text-xs font-display font-semibold text-text-secondary uppercase tracking-wider">New Profile</p>
            <input
              type="text"
              placeholder="Enter username..."
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProfile()}
              className="input"
              maxLength={16}
            />
            <p className="text-xs text-text-muted">3–16 characters, letters and numbers only (Minecraft rules)</p>
            <button
              onClick={handleCreateProfile}
              disabled={creatingProfile || newUsername.trim().length < 3}
              className="btn-primary w-full justify-center"
            >
              {creatingProfile ? <><Loader2 size={14} className="animate-spin" /> Creating...</> : <>Create Profile</>}
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function InstanceRow({ instance, isSelected, onSelect }) {
  const loaderColors = {
    vanilla: 'bg-bg-overlay text-text-muted',
    fabric: 'bg-yellow-400/10 text-yellow-400',
    forge: 'bg-orange-400/10 text-orange-400',
    quilt: 'bg-purple-400/10 text-purple-400',
    neoforge: 'bg-blue-400/10 text-blue-400',
  };

  return (
    <motion.div
      whileHover={{ x: 2 }}
      onClick={onSelect}
      className={`flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition-all duration-150
        ${isSelected ? 'bg-accent/5 border-accent/30' : 'bg-bg-surface border-bg-border hover:border-bg-overlay hover:bg-bg-elevated'}`}
    >
      {/* Selected indicator */}
      <div className={`w-1 h-8 rounded-full transition-all ${isSelected ? 'bg-accent' : 'bg-bg-border'}`} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-display font-semibold text-sm text-text truncate">{instance.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs font-mono text-text-muted">{instance.mcVersion}</span>
          <span className={`text-[10px] font-display font-bold px-1.5 py-0.5 rounded capitalize ${loaderColors[instance.loader] || loaderColors.vanilla}`}>
            {instance.loader}
          </span>
        </div>
      </div>

      {/* Status */}
      {!instance.isInstalled && (
        <span className="flex items-center gap-1 text-[11px] text-warn">
          <AlertTriangle size={11} />
          Not installed
        </span>
      )}

      {isSelected && instance.isInstalled && (
        <div className="w-2 h-2 rounded-full bg-accent" />
      )}
    </motion.div>
  );
}

function ExistingProfiles({ onClose }) {
  const { profiles, activeProfile, setActiveProfile, showToast } = useLauncherStore();

  async function switchProfile(profile) {
    await window.electronAPI.profiles.setActive({ profileId: profile.id });
    setActiveProfile(profile);
    showToast(`Switched to ${profile.username}`, 'success');
    onClose();
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-display font-semibold text-text-secondary uppercase tracking-wider">Existing Profiles</p>
      {profiles.map((p) => (
        <button
          key={p.id}
          onClick={() => switchProfile(p)}
          className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all
            ${activeProfile?.id === p.id
              ? 'bg-accent/10 border-accent/30 text-accent'
              : 'bg-bg-overlay border-bg-border hover:border-accent/20 text-text'}`}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/30 to-accent/5 flex items-center justify-center text-sm font-bold text-accent">
            {p.username[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-display font-semibold">{p.username}</p>
            <p className="text-[11px] text-text-muted font-mono">{p.uuid.slice(0, 13)}...</p>
          </div>
          {activeProfile?.id === p.id && (
            <span className="ml-auto text-[10px] font-display font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded">
              ACTIVE
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
