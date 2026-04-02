// src/renderer/pages/InstancesPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Layers,
  Loader2,
  Download,
  Trash2,
  FolderOpen,
  Filter,
  ChevronDown,
  Check,
} from "lucide-react";
import { useLauncherStore } from "../store";
import InstanceCard from "../components/InstanceCard";
import Modal from "../components/Modal";
const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const LOADERS = [
  { id: "vanilla", label: "Vanilla", color: "text-text-secondary" },
  { id: "fabric", label: "Fabric", color: "text-yellow-400" },
  { id: "forge", label: "Forge", color: "text-orange-400" },
  { id: "quilt", label: "Quilt", color: "text-purple-400" },
  { id: "neoforge", label: "NeoForge", color: "text-blue-400" },
];

const VERSION_FILTERS = ["release", "snapshot", "old_beta", "old_alpha"];

export default function InstancesPage() {
  const {
    instances,
    setInstances,
    selectedInstanceId,
    setSelectedInstance,
    showToast,
    gameRunning,
  } = useLauncherStore();

  const [search, setSearch] = useState("");
  const [createModal, setCreateModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [installModal, setInstallModal] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [launching, setLaunching] = useState(false);

  const selectedInstance = instances.find((i) => i.id === selectedInstanceId);
  const canPlay =
    selectedInstance && selectedInstance.isInstalled && !gameRunning;

  async function handlePlay(instance) {
    if (!canPlay) return;
    setLaunching(true);
    try {
      await window.electronAPI.game.launch({ instanceId: selectedInstance.id });
    } catch (err) {
      showToast(err.message, "error");
      setLaunching(false);
    }
    setLaunching(false);
  }

  const filtered = instances.filter(
    (i) =>
      !search ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.mcVersion.includes(search),
  );

  async function handleDelete(instance) {
    setIsDeleting(true);
    try {
      await window.electronAPI.instances.delete({ instanceId: instance.id });
      const updated = await window.electronAPI.instances.list();
      setInstances(updated);
      showToast(`Deleted "${instance.name}"`, "success");
      setDeleteModal(null);
    } catch (err) {
      showToast(err.message, "error");
    }
    setIsDeleting(false);
  }

  async function handleOpenFolder(instance) {
    const folderPath = instance.path + "/.minecraft";
    await window.electronAPI.system.openFolder({ folderPath });
  }

  async function handleInstall(instance) {
    setInstallModal(instance);
  }

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
          <h1 className="font-display font-bold text-xl text-text">
            Instances
          </h1>
          <p className="text-sm text-text-muted">
            {instances.length} instance{instances.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={() => setCreateModal(true)} className="btn-primary">
          <Plus size={15} /> New Instance
        </button>
      </div>

      {/* Search */}
      <div className="relative flex-shrink-0">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <input
          type="text"
          placeholder="Search instances..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-9"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        <AnimatePresence initial={false}>
          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center gap-3 py-16 text-center"
            >
              <Layers size={36} className="text-text-muted" />
              <p className="font-display font-semibold text-text">
                {search ? "No results found" : "No instances yet"}
              </p>
              <p className="text-sm text-text-muted">
                {search
                  ? "Try a different search"
                  : "Create your first instance to play Minecraft"}
              </p>
              {!search && (
                <button
                  onClick={() => setCreateModal(true)}
                  className="btn-secondary mt-2"
                >
                  <Plus size={14} /> Create Instance
                </button>
              )}
            </motion.div>
          ) : (
            filtered.map((instance) => (
              <motion.div
                key={instance.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <InstanceCard
                  instance={instance}
                  isSelected={selectedInstanceId === instance.id}
                  onSelect={() => setSelectedInstance(instance.id)}
                  onPlay={() => handlePlay(instance)}
                  onDelete={(i) => setDeleteModal(i)}
                  onOpenFolder={handleOpenFolder}
                  gameRunning={gameRunning}
                />
                {/* Install button for uninstalled instances */}
                {!instance.isInstalled &&
                  selectedInstanceId === instance.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-2 pl-2"
                    >
                      <button
                        onClick={() => handleInstall(instance)}
                        className="btn-primary text-sm"
                      >
                        <Download size={14} /> Install Minecraft{" "}
                        {instance.mcVersion}
                      </button>
                    </motion.div>
                  )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Create Instance Modal */}
      <CreateInstanceModal
        open={createModal}
        onClose={() => setCreateModal(false)}
        onCreated={async () => {
          const updated = await window.electronAPI.instances.list();
          setInstances(updated);
          setCreateModal(false);
        }}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Delete Instance"
        width="max-w-sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Are you sure you want to delete{" "}
            <strong className="text-text">"{deleteModal?.name}"</strong>? This
            will permanently remove all worlds, mods, and config for this
            instance.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteModal(null)}
              className="btn-secondary flex-1 justify-center"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDelete(deleteModal)}
              disabled={isDeleting}
              className="btn-danger flex-1 justify-center"
            >
              {isDeleting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Install Modal */}
      {installModal && (
        <InstallModal
          instance={installModal}
          onClose={() => setInstallModal(null)}
          onInstalled={async () => {
            const updated = await window.electronAPI.instances.list();
            setInstances(updated);
            setInstallModal(null);
          }}
        />
      )}
    </motion.div>
  );
}

// ─── Create Instance Modal ─────────────────────────────────────────────────────

function CreateInstanceModal({ open, onClose, onCreated }) {
  const { showToast, versionManifest, setVersionManifest } = useLauncherStore();
  const [step, setStep] = useState(1); // 1: name, 2: version, 3: loader
  const [name, setName] = useState("");
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [selectedLoader, setSelectedLoader] = useState("vanilla");
  const [loaderVersions, setLoaderVersions] = useState([]);
  const [selectedLoaderVersion, setSelectedLoaderVersion] = useState(null);
  const [loadingLoaderVersions, setLoadingLoaderVersions] = useState(false);
  const [versionFilter, setVersionFilter] = useState("release");
  const [versionSearch, setVersionSearch] = useState("");
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [ram, setRam] = useState(2048);
  const [creating, setCreating] = useState(false);

  // Fetch manifest when modal opens
  useEffect(() => {
    if (open && !versionManifest) {
      setLoadingVersions(true);
      window.electronAPI.versions
        .fetchManifest()
        .then((m) => {
          setVersionManifest(m);
          setLoadingVersions(false);
        })
        .catch((e) => {
          showToast(e.message, "error");
          setLoadingVersions(false);
        });
    }
  }, [open]);

  // Fetch loader versions when loader or MC version changes (on step 3)
  useEffect(() => {
    if (step !== 3 || selectedLoader === "vanilla" || !selectedVersion) {
      setLoaderVersions([]);
      setSelectedLoaderVersion(null);
      return;
    }
    setLoadingLoaderVersions(true);
    setLoaderVersions([]);
    setSelectedLoaderVersion(null);
    window.electronAPI.loaders
      .getVersions({ loader: selectedLoader, mcVersion: selectedVersion.id })
      .then((versions) => {
        setLoaderVersions(versions);
        const stable = versions.find((v) => v.stable) || versions[0];
        setSelectedLoaderVersion(stable?.version || null);
        setLoadingLoaderVersions(false);
      })
      .catch((e) => {
        showToast(`Could not fetch ${selectedLoader} versions: ${e.message}`, "error");
        setLoadingLoaderVersions(false);
      });
  }, [step, selectedLoader, selectedVersion?.id]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep(1);
      setName("");
      setSelectedVersion(null);
      setSelectedLoader("vanilla");
      setLoaderVersions([]);
      setSelectedLoaderVersion(null);
      setVersionSearch("");
    }
  }, [open]);

  const filteredVersions = (versionManifest?.versions || [])
    .filter((v) => v.type === versionFilter || versionFilter === "all")
    .filter((v) => !versionSearch || v.id.includes(versionSearch))
    .slice(0, 100);

  async function handleCreate() {
    if (!selectedVersion) return;
    setCreating(true);
    try {
      const instance = await window.electronAPI.instances.create({
        name: name || `Minecraft ${selectedVersion.id}`,
        mcVersion: selectedVersion.id,
        loader: selectedLoader,
        loaderVersion: selectedLoaderVersion,
        ram,
      });
      showToast(`Created "${instance.name}"`, "success");
      onCreated();
    } catch (err) {
      showToast(err.message, "error");
    }
    setCreating(false);
  }

  return (
    <Modal open={open} onClose={onClose} title="New Instance" width="max-w-xl">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <button
              onClick={() => s < step && setStep(s)}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-bold transition-all
                ${step === s ? "bg-accent text-white" : step > s ? "bg-accent/20 text-accent cursor-pointer" : "bg-bg-overlay text-text-muted"}`}
            >
              {step > s ? <Check size={12} /> : s}
            </button>
            {s < 3 && (
              <div
                className={`flex-1 h-px ${step > s ? "bg-accent/40" : "bg-bg-border"}`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Name & RAM */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-display font-semibold text-text-secondary uppercase tracking-wider block mb-2">
              Instance Name
            </label>
            <input
              type="text"
              placeholder="My Survival World"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-display font-semibold text-text-secondary uppercase tracking-wider block mb-2">
              RAM: {ram} MB
            </label>
            <input
              type="range"
              min={512}
              max={16384}
              step={512}
              value={ram}
              onChange={(e) => setRam(Number(e.target.value))}
              className="w-full accent-accent"
            />
            <div className="flex justify-between text-xs text-text-muted mt-1">
              <span>512 MB</span>
              <span>16 GB</span>
            </div>
          </div>
          <button
            onClick={() => setStep(2)}
            className="btn-primary w-full justify-center"
          >
            Next: Choose Version
          </button>
        </div>
      )}

      {/* Step 2: Version */}
      {step === 2 && (
        <div className="space-y-3">
          {/* Filter tabs */}
          <div className="flex gap-1 bg-bg-overlay rounded-lg p-1">
            {VERSION_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setVersionFilter(f)}
                className={`flex-1 px-2 py-1 rounded text-xs font-display font-semibold transition-all capitalize
                  ${versionFilter === f ? "bg-bg-elevated text-text shadow" : "text-text-muted hover:text-text"}`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Version search */}
          <div className="relative">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              placeholder="Search versions..."
              value={versionSearch}
              onChange={(e) => setVersionSearch(e.target.value)}
              className="input pl-8 text-sm"
            />
          </div>

          {/* Version list */}
          <div className="h-56 overflow-y-auto space-y-1 pr-1">
            {loadingVersions ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-text-muted" />
              </div>
            ) : filteredVersions.length === 0 ? (
              <p className="text-center text-sm text-text-muted py-8">
                No versions found
              </p>
            ) : (
              filteredVersions.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVersion(v)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all
                    ${
                      selectedVersion?.id === v.id
                        ? "bg-accent/10 text-accent border border-accent/30"
                        : "hover:bg-bg-overlay text-text border border-transparent"
                    }`}
                >
                  <span className="font-mono font-medium">{v.id}</span>
                  <span
                    className={`text-[10px] font-display font-bold px-1.5 py-0.5 rounded capitalize
                    ${
                      v.type === "release"
                        ? "bg-accent/10 text-accent"
                        : v.type === "snapshot"
                          ? "bg-warn/10 text-warn"
                          : "bg-bg-overlay text-text-muted"
                    }`}
                  >
                    {v.type}
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="flex gap-3 pt-2 border-t border-bg-border">
            <button
              onClick={() => setStep(1)}
              className="btn-secondary flex-1 justify-center"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!selectedVersion}
              className="btn-primary flex-1 justify-center"
            >
              Next: Mod Loader
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Mod Loader */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Select a mod loader for{" "}
            <strong className="text-text font-mono">
              {selectedVersion?.id}
            </strong>
          </p>

          <div className="grid grid-cols-1 gap-2">
            {LOADERS.map((loader) => (
              <button
                key={loader.id}
                onClick={() => setSelectedLoader(loader.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all
                  ${
                    selectedLoader === loader.id
                      ? "border-accent/40 bg-accent/5"
                      : "border-bg-border bg-bg-elevated hover:border-bg-overlay"
                  }`}
              >
                <div
                  className={`w-2 h-2 rounded-full transition-all ${selectedLoader === loader.id ? "bg-accent" : "bg-bg-border"}`}
                />
                <span
                  className={`font-display font-semibold text-sm ${loader.color}`}
                >
                  {loader.label}
                </span>
                {selectedLoader === loader.id && (
                  <Check size={14} className="ml-auto text-accent" />
                )}
              </button>
            ))}
          </div>

          {/* Loader version selector */}
          {selectedLoader !== "vanilla" && (
            <div className="space-y-2">
              <label className="text-xs text-text-muted font-display font-semibold uppercase tracking-wider">
                {selectedLoader} version
              </label>
              {loadingLoaderVersions ? (
                <div className="flex items-center gap-2 text-sm text-text-muted py-2">
                  <Loader2 size={14} className="animate-spin" />
                  Fetching versions...
                </div>
              ) : loaderVersions.length === 0 ? (
                <p className="text-xs text-red-400">
                  No versions found for {selectedLoader} + {selectedVersion?.id}
                </p>
              ) : (
                <select
                  value={selectedLoaderVersion || ""}
                  onChange={(e) => setSelectedLoaderVersion(e.target.value)}
                  className="w-full bg-bg-elevated border border-bg-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                >
                  {loaderVersions.map((v) => (
                    <option key={v.version} value={v.version}>
                      {v.version}{v.stable ? "" : " (unstable)"}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2 border-t border-bg-border">
            <button
              onClick={() => setStep(2)}
              className="btn-secondary flex-1 justify-center"
            >
              Back
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || (selectedLoader !== "vanilla" && loadingLoaderVersions)}
              className="btn-primary flex-1 justify-center"
            >
              {creating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}
              Create Instance
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── Install Modal ─────────────────────────────────────────────────────────────

function InstallModal({ instance, onClose, onInstalled }) {
  const { showToast, isDownloading } = useLauncherStore();
  const [installing, setInstalling] = useState(false);

  async function handleInstall() {
    setInstalling(true);
    try {
      await window.electronAPI.versions.install({
        instanceId: instance.id,
        mcVersion: instance.mcVersion,
        loader: instance.loader || "vanilla",
        loaderVersion: instance.loaderVersion || null,
      });
      const loaderLabel = instance.loader && instance.loader !== "vanilla"
        ? ` + ${instance.loader}`
        : "";
      showToast(`Minecraft ${instance.mcVersion}${loaderLabel} installed!`, "success");
      onInstalled();
    } catch (err) {
      showToast(err.message, "error");
      setInstalling(false);
    }
  }

  return (
    <Modal
      open
      onClose={!installing ? onClose : undefined}
      title="Install Minecraft"
    >
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          This will download and install{" "}
          <strong className="text-text font-mono">{instance.mcVersion}</strong>{" "}
          for instance <strong className="text-text">"{instance.name}"</strong>.
        </p>
        <p className="text-xs text-text-muted">
          This includes the client JAR, all required libraries, and game assets.
          The download size may be up to ~400MB for assets.
        </p>

        {installing ? (
          <div className="flex items-center gap-3 text-sm text-accent">
            <Loader2 size={16} className="animate-spin" />
            <span>Downloading... check the progress bar</span>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="btn-secondary flex-1 justify-center"
            >
              Cancel
            </button>
            <button
              onClick={handleInstall}
              className="btn-primary flex-1 justify-center"
            >
              <Download size={14} /> Install
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}