// src/renderer/App.jsx
import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import Titlebar from './components/Titlebar';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import DownloadProgress from './components/DownloadProgress';
import Console from './components/Console';

import HomePage from './pages/HomePage';
import InstancesPage from './pages/InstancesPage';
import ModsPage from './pages/ModsPage';
import SettingsPage from './pages/SettingsPage';

import { useLauncherStore } from './store';

export default function App() {
  const { setProfiles, setActiveProfile, setInstances, setSettings, setSystemInfo, showToast } =
    useLauncherStore();

  // ── Bootstrap: load initial data ─────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        const [profiles, activeProfile, instances, settings, sysInfo] = await Promise.all([
          window.electronAPI.profiles.list(),
          window.electronAPI.profiles.getActive(),
          window.electronAPI.instances.list(),
          window.electronAPI.settings.get(),
          window.electronAPI.system.info(),
        ]);

        setProfiles(profiles);
        setActiveProfile(activeProfile);
        setInstances(instances);
        setSettings(settings);
        setSystemInfo(sysInfo);
      } catch (err) {
        console.error('Init error:', err);
        showToast('Failed to load launcher data', 'error');
      }
    }

    init();
  }, []);

  // ── Subscribe to main process events ─────────────────────────────────────────
  useEffect(() => {
    const { events } = window.electronAPI;
    const { setDownloadProgress, setGameRunning, setGameStatus, addGameLog, showToast, setJavaProgress } =
      useLauncherStore.getState();

    const unsubDownload = events.onDownloadProgress((p) => setDownloadProgress(p));
    const unsubDownloadErr = events.onDownloadError((e) => showToast(e.message, 'error'));
    const unsubJava = events.onJavaProgress((p) => setJavaProgress(p));
    const unsubStatus = events.onGameStatus((s) => {
      setGameStatus(s);
      if (s.status === 'running') setGameRunning(true);
      if (s.status === 'launching') setGameRunning(false);
    });
    const unsubLog = events.onGameLog(({ line }) => addGameLog(line));
    const unsubClosed = events.onGameClosed((info) => {
      setGameRunning(false);
      setGameStatus(null);
      if (info.code !== 0 && info.code !== null) {
        showToast(`Game crashed (exit code ${info.code})`, 'error');
      } else {
        showToast('Game closed', 'info');
      }
    });

    return () => {
      unsubDownload();
      unsubDownloadErr();
      unsubJava();
      unsubStatus();
      unsubLog();
      unsubClosed();
    };
  }, []);

  return (
    <div className="flex flex-col h-screen bg-bg-base text-text overflow-hidden">
      {/* Custom Titlebar */}
      <Titlebar />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/instances" element={<InstancesPage />} />
              <Route path="/mods" element={<ModsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>

      {/* Global overlays */}
      <DownloadProgress />
      <Console />
      <Toast />
    </div>
  );
}
