// src/renderer/components/Toast.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';
import { useLauncherStore } from '../store';

const ICONS = {
  success: <CheckCircle size={16} className="text-accent" />,
  error: <AlertCircle size={16} className="text-danger" />,
  warning: <AlertTriangle size={16} className="text-warn" />,
  info: <Info size={16} className="text-info" />,
};

const BORDERS = {
  success: 'border-accent/30',
  error: 'border-danger/30',
  warning: 'border-warn/30',
  info: 'border-info/30',
};

export default function Toast() {
  const { toast, clearToast } = useLauncherStore();

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 
                      px-4 py-3 rounded-xl bg-bg-elevated border shadow-panel
                      min-w-[260px] max-w-[400px] ${BORDERS[toast.type] || BORDERS.info}`}
        >
          {ICONS[toast.type] || ICONS.info}
          <span className="flex-1 text-sm font-body text-text">{toast.message}</span>
          <button
            onClick={clearToast}
            className="text-text-muted hover:text-text transition-colors ml-1"
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
