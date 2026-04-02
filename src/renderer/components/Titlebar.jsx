// src/renderer/components/Titlebar.jsx
import React, { useState, useEffect } from 'react';
import { Minus, Square, X, Maximize2 } from 'lucide-react';

export default function Titlebar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    window.electronAPI.window.isMaximized().then(setIsMaximized);
  }, []);

  const handleMaximize = async () => {
    window.electronAPI.window.maximize();
    const max = await window.electronAPI.window.isMaximized();
    setIsMaximized(!max); // toggle optimistically
  };

  return (
    <div className="drag-region flex items-center justify-between h-10 bg-bg-base border-b border-bg-border px-4 flex-shrink-0 z-50">
      {/* Left: App identity */}
      <div className="flex items-center gap-2 no-drag">
        <div className="w-4 h-4 rounded bg-accent flex items-center justify-center">
          <span className="text-[8px] font-black text-bg-base">MC</span>
        </div>
        <span className="text-xs font-display font-semibold text-text-secondary tracking-wider uppercase">
          MCLauncher
        </span>
      </div>

      {/* Center: Drag area (empty, serves as drag target) */}
      <div className="flex-1" />

      {/* Right: Window controls */}
      <div className="flex items-center no-drag">
        <button
          onClick={() => window.electronAPI.window.minimize()}
          className="w-10 h-10 flex items-center justify-center hover:bg-bg-elevated text-text-muted hover:text-text transition-colors"
        >
          <Minus size={13} />
        </button>
        <button
          onClick={handleMaximize}
          className="w-10 h-10 flex items-center justify-center hover:bg-bg-elevated text-text-muted hover:text-text transition-colors"
        >
          {isMaximized ? <Square size={12} /> : <Maximize2 size={12} />}
        </button>
        <button
          onClick={() => window.electronAPI.window.close()}
          className="w-10 h-10 flex items-center justify-center hover:bg-danger/80 text-text-muted hover:text-white transition-colors"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
