// src/renderer/components/DownloadProgress.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';
import { useLauncherStore } from '../store';

const STAGE_LABELS = {
  manifest: 'Fetching manifest',
  client: 'Downloading client',
  libraries: 'Downloading libraries',
  assets: 'Downloading assets',
  java: 'Setting up Java',
  mod: 'Installing mod',
  done: 'Complete',
};

export default function DownloadProgress() {
  const { downloadProgress, isDownloading, clearDownload } = useLauncherStore();

  const show = isDownloading || (downloadProgress && downloadProgress.percent >= 100);

  return (
    <AnimatePresence>
      {show && downloadProgress && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[480px] max-w-[90vw]
                     bg-bg-elevated border border-bg-border rounded-2xl shadow-panel overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-2">
            <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Download size={14} className="text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-display font-semibold text-text uppercase tracking-wider">
                {STAGE_LABELS[downloadProgress.stage] || 'Downloading'}
              </p>
              <p className="text-xs text-text-muted truncate mt-0.5">
                {downloadProgress.message || downloadProgress.currentFile || '...'}
              </p>
            </div>
            <span className="text-sm font-display font-bold text-accent tabular-nums">
              {downloadProgress.percent ?? 0}%
            </span>
            {downloadProgress.percent >= 100 && (
              <button
                onClick={clearDownload}
                className="text-text-muted hover:text-text transition-colors ml-1"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-bg-overlay mx-4 mb-4 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-accent rounded-full"
              animate={{ width: `${downloadProgress.percent ?? 0}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>

          {/* File count if available */}
          {downloadProgress.total > 0 && (
            <div className="px-4 pb-3 flex items-center justify-between">
              <span className="text-xs text-text-muted font-mono">
                {downloadProgress.completed} / {downloadProgress.total} files
              </span>
              {downloadProgress.errors > 0 && (
                <span className="text-xs text-danger font-mono">
                  {downloadProgress.errors} errors
                </span>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
