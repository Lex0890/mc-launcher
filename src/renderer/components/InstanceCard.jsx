// src/renderer/components/InstanceCard.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Play, Layers, Clock, MoreVertical, Trash2, FolderOpen, Edit3 } from 'lucide-react';
import { useState } from 'react';

const LOADER_COLORS = {
  vanilla: 'text-text-secondary bg-bg-overlay',
  fabric: 'text-yellow-400 bg-yellow-400/10',
  forge: 'text-orange-400 bg-orange-400/10',
  quilt: 'text-purple-400 bg-purple-400/10',
  neoforge: 'text-blue-400 bg-blue-400/10',
};

const LOADER_LABELS = {
  vanilla: 'Vanilla',
  fabric: 'Fabric',
  forge: 'Forge',
  quilt: 'Quilt',
  neoforge: 'NeoForge',
};

function formatDuration(seconds) {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(iso) {
  if (!iso) return 'Never';
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}

export default function InstanceCard({ instance, isSelected, onSelect, onPlay, onDelete, onOpenFolder, gameRunning }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const loaderStyle = LOADER_COLORS[instance.loader] || LOADER_COLORS.vanilla;
  const loaderLabel = LOADER_LABELS[instance.loader] || instance.loader;
  const playTime = formatDuration(instance.totalTimePlayed);

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onSelect(instance.id)}
      className={`relative rounded-xl border p-4 cursor-pointer transition-all duration-200 select-none
        ${isSelected
          ? 'bg-accent/5 border-accent/40 shadow-glow'
          : 'bg-bg-surface border-bg-border hover:border-bg-overlay hover:bg-bg-elevated'
        }`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Icon */}
          <div className="w-10 h-10 rounded-lg bg-bg-overlay flex items-center justify-center flex-shrink-0 border border-bg-border">
            <Layers size={18} className={isSelected ? 'text-accent' : 'text-text-muted'} />
          </div>

          <div className="min-w-0">
            <h3 className="font-display font-semibold text-sm text-text truncate">{instance.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-text-muted font-mono">{instance.mcVersion}</span>
              <span className={`text-[11px] font-display font-semibold px-1.5 py-0.5 rounded ${loaderStyle}`}>
                {loaderLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Menu button */}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="w-7 h-7 rounded flex items-center justify-center text-text-muted hover:text-text hover:bg-bg-overlay transition-colors"
          >
            <MoreVertical size={14} />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
              <div className="absolute right-0 top-8 z-20 bg-bg-elevated border border-bg-border rounded-xl shadow-panel overflow-hidden w-44">
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onOpenFolder?.(instance); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text hover:bg-bg-overlay transition-colors"
                >
                  <FolderOpen size={13} /> Open Folder
                </button>
                <div className="h-px bg-bg-border mx-2" />
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete?.(instance); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-danger hover:bg-danger/10 transition-colors"
                >
                  <Trash2 size={13} /> Delete Instance
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Last played */}
          <div className="flex items-center gap-1 text-[11px] text-text-muted">
            <Clock size={11} />
            <span>{formatDate(instance.lastPlayed)}</span>
          </div>
          {/* Play time */}
          {playTime && (
            <span className="text-[11px] text-text-muted">{playTime} played</span>
          )}
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2">
          {!instance.isInstalled && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-warn/10 text-warn font-display font-semibold">
              Not installed
            </span>
          )}
          {instance.isInstalled && isSelected && !gameRunning && (
            <button
              onClick={(e) => { e.stopPropagation(); onPlay?.(instance); }}
              className="flex items-center gap-1.5 px-3 py-1 bg-accent hover:bg-accent-hover rounded-full text-xs font-display font-semibold text-white transition-all hover:shadow-glow"
            >
              <Play size={11} fill="currentColor" />
              Play
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
