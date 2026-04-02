// src/renderer/components/Console.jsx
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, X, Trash2, ChevronDown, Copy } from 'lucide-react';
import { useLauncherStore } from '../store';

const LOG_COLORS = {
  '[STDOUT]': 'text-text-secondary',
  '[STDERR]': 'text-warn',
  '[LAUNCHER]': 'text-info',
  'FATAL': 'text-danger font-semibold',
  'ERROR': 'text-danger',
  'WARN': 'text-warn',
  'INFO': 'text-text-secondary',
};

function colorize(line) {
  for (const [key, cls] of Object.entries(LOG_COLORS)) {
    if (line.includes(key)) return cls;
  }
  return 'text-text-muted';
}

export default function Console() {
  const { consoleOpen, setConsoleOpen, gameLogs, clearGameLogs, gameRunning } = useLauncherStore();
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState('');
  const bottomRef = useRef(null);
  const scrollRef = useRef(null);

  // Auto-scroll on new logs
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [gameLogs, autoScroll]);

  // Detect manual scroll up → disable auto-scroll
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setAutoScroll(nearBottom);
  };

  const filteredLogs = filter
    ? gameLogs.filter((l) => l.line.toLowerCase().includes(filter.toLowerCase()))
    : gameLogs;

  const copyAll = () => {
    const text = filteredLogs.map((l) => l.line).join('\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <AnimatePresence>
      {consoleOpen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 35 }}
          className="fixed bottom-0 left-16 right-0 z-40 h-72 bg-bg-base border-t border-bg-border flex flex-col"
        >
          {/* Console header */}
          <div className="flex items-center gap-2 px-4 h-9 border-b border-bg-border bg-bg-surface flex-shrink-0">
            <Terminal size={13} className="text-info" />
            <span className="text-xs font-display font-semibold text-text-secondary uppercase tracking-wider">
              Console
            </span>
            {gameRunning && (
              <span className="flex items-center gap-1 text-xs text-accent">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                Running
              </span>
            )}
            <div className="flex-1" />

            {/* Filter */}
            <input
              type="text"
              placeholder="Filter logs..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-6 px-2 bg-bg-elevated border border-bg-border rounded text-xs font-mono text-text placeholder:text-text-muted focus:outline-none focus:border-accent w-36"
            />

            {/* Scroll to bottom */}
            {!autoScroll && (
              <button
                onClick={() => {
                  setAutoScroll(true);
                  bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-text-muted hover:text-text transition-colors"
                title="Scroll to bottom"
              >
                <ChevronDown size={14} />
              </button>
            )}

            <button onClick={copyAll} className="text-text-muted hover:text-text transition-colors" title="Copy all">
              <Copy size={13} />
            </button>
            <button onClick={clearGameLogs} className="text-text-muted hover:text-danger transition-colors" title="Clear">
              <Trash2 size={13} />
            </button>
            <button onClick={() => setConsoleOpen(false)} className="text-text-muted hover:text-text transition-colors">
              <X size={14} />
            </button>
          </div>

          {/* Log output */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-4 py-2 font-mono text-xs leading-relaxed"
          >
            {filteredLogs.length === 0 ? (
              <p className="text-text-muted italic mt-4 text-center">No logs yet. Launch a game to see output here.</p>
            ) : (
              filteredLogs.map((entry, i) => (
                <div key={i} className={`whitespace-pre-wrap break-all ${colorize(entry.line)}`}>
                  {entry.line}
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
