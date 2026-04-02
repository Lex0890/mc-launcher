// src/renderer/components/ModCard.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, CheckCircle, ExternalLink, Package, Star, TrendingDown } from 'lucide-react';

function formatDownloads(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export default function ModCard({ mod, isInstalled, onInstall, isInstalling }) {
  const [imgError, setImgError] = useState(false);

  const categoryBadges = (mod.categories || []).slice(0, 3);

  return (
    <motion.div
      whileHover={{ scale: 1.01, y: -1 }}
      className="bg-bg-surface border border-bg-border rounded-xl p-4 flex gap-4 hover:border-bg-overlay transition-all duration-200 cursor-default group"
    >
      {/* Icon */}
      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-bg-overlay border border-bg-border">
        {mod.icon_url && !imgError ? (
          <img
            src={mod.icon_url}
            alt={mod.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={20} className="text-text-muted" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display font-semibold text-sm text-text truncate">{mod.title}</h3>
            <p className="text-xs text-text-muted truncate mt-0.5">{mod.description}</p>
          </div>

          {/* Install button */}
          <div className="flex-shrink-0">
            {isInstalled ? (
              <span className="flex items-center gap-1 text-xs font-display font-semibold text-accent px-2 py-1 bg-accent/10 rounded-lg border border-accent/20">
                <CheckCircle size={12} />
                Installed
              </span>
            ) : (
              <button
                onClick={() => onInstall?.(mod)}
                disabled={isInstalling}
                className="flex items-center gap-1.5 text-xs font-display font-semibold px-3 py-1.5
                           bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 hover:border-accent/40
                           rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isInstalling ? (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    ↻
                  </motion.span>
                ) : (
                  <Download size={12} />
                )}
                Install
              </button>
            )}
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {/* Downloads */}
          {mod.downloads > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-text-muted">
              <Download size={10} />
              {formatDownloads(mod.downloads)}
            </span>
          )}

          {/* Follows */}
          {mod.follows > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-text-muted">
              <Star size={10} />
              {formatDownloads(mod.follows)}
            </span>
          )}

          {/* Categories */}
          {categoryBadges.map((cat) => (
            <span key={cat} className="text-[10px] px-1.5 py-0.5 rounded bg-bg-overlay text-text-muted font-mono capitalize">
              {cat}
            </span>
          ))}

          {/* Game versions preview */}
          {mod.game_versions?.length > 0 && (
            <span className="text-[11px] text-text-muted font-mono">
              {mod.game_versions.slice(-1)[0]}
              {mod.game_versions.length > 1 && ` +${mod.game_versions.length - 1}`}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
