// src/renderer/components/Sidebar.jsx
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Layers, Package, Settings, Terminal, User } from 'lucide-react';
import { useLauncherStore } from '../store';

const NAV_ITEMS = [
  { path: '/home', icon: Home, label: 'Home' },
  { path: '/instances', icon: Layers, label: 'Instances' },
  { path: '/mods', icon: Package, label: 'Mods' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeProfile, gameRunning, consoleOpen, setConsoleOpen } = useLauncherStore();

  return (
    <aside className="w-16 flex flex-col items-center py-4 gap-1 bg-bg-surface border-r border-bg-border flex-shrink-0">
      {/* Nav items */}
      <nav className="flex flex-col items-center gap-1 flex-1">
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
          const active = location.pathname.startsWith(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              title={label}
              className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 group ${
                active
                  ? 'bg-accent/15 text-accent'
                  : 'text-text-muted hover:bg-bg-elevated hover:text-text'
              }`}
            >
              <Icon size={18} />
              {active && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent rounded-r-full"
                  style={{ left: '-4px' }}
                />
              )}
              {/* Tooltip */}
              <span className="absolute left-full ml-2 px-2 py-1 bg-bg-overlay rounded text-xs font-display font-medium text-text opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Bottom: Console & Profile */}
      <div className="flex flex-col items-center gap-2">
        {/* Console button */}
        <button
          onClick={() => setConsoleOpen(!consoleOpen)}
          title="Console"
          className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 group ${
            consoleOpen ? 'bg-info/15 text-info' : 'text-text-muted hover:bg-bg-elevated hover:text-text'
          }`}
        >
          <Terminal size={18} />
          {gameRunning && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full animate-pulse" />
          )}
          <span className="absolute left-full ml-2 px-2 py-1 bg-bg-overlay rounded text-xs font-display font-medium text-text opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            Console
          </span>
        </button>

        {/* Profile avatar */}
        <button
          onClick={() => navigate('/settings')}
          title={activeProfile?.username || 'No profile'}
          className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/40 to-accent/10 border border-accent/30 flex items-center justify-center hover:border-accent/60 transition-colors group relative"
        >
          <span className="text-xs font-display font-bold text-accent">
            {activeProfile?.username?.[0]?.toUpperCase() || '?'}
          </span>
          <span className="absolute left-full ml-2 px-2 py-1 bg-bg-overlay rounded text-xs font-display font-medium text-text opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            {activeProfile?.username || 'No profile'}
          </span>
        </button>
      </div>
    </aside>
  );
}
