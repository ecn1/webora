import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, Download, Info, Loader2, RotateCw, Sparkles, X } from 'lucide-react';
import { useStore } from './store/useStore';
import { bridge, type UpdateInfo } from './lib/bridge';
import { cn } from './lib/utils';
import { WeboraMark } from './components/ui';
import { Sidebar } from './components/Sidebar';
import { NewProjectModal } from './components/NewProjectModal';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { Templates } from './pages/Templates';
import { AIStudio } from './pages/AIStudio';
import { AssetsPage } from './pages/AssetsPage';
import { Forms } from './pages/Forms';
import { Settings } from './pages/Settings';
import { Editor } from './editor/Editor';

export default function App() {
  const ready = useStore((s) => s.ready);
  const view = useStore((s) => s.view);
  const init = useStore((s) => s.init);
  const flushSave = useStore((s) => s.flushSave);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [booted, setBooted] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updateBusy, setUpdateBusy] = useState<'download' | 'install' | null>(null);
  const [updateError, setUpdateError] = useState('');

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    const off = bridge.onUpdateAvailable((info) => {
      if (info.available) {
        setUpdateInfo(info);
        setUpdateError('');
      }
    });
    return off;
  }, []);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => setBooted(true), 900);
    return () => clearTimeout(timer);
  }, [ready]);

  useEffect(() => {
    const offFlush = bridge.onFlushRequest(async () => {
      try {
        await flushSave();
      } finally {
        bridge.flushDone();
      }
    });
    const beforeUnload = () => {
      void flushSave();
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      offFlush();
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [flushSave]);

  if (!ready || !booted) return <Splash ready={ready} />;

  if (view === 'editor') {
    return (
      <>
        <Editor />
        <Toasts />
      </>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-ink-950 text-[#e8e8f2]">
      <Sidebar onNewProject={() => setNewProjectOpen(true)} />
      <main key={view} className="min-w-0 flex-1 animate-fade overflow-y-auto">
        {view === 'dashboard' ? <Dashboard onNewProject={() => setNewProjectOpen(true)} /> : null}
        {view === 'projects' ? <Projects onNewProject={() => setNewProjectOpen(true)} /> : null}
        {view === 'templates' ? <Templates onNewProject={() => setNewProjectOpen(true)} /> : null}
        {view === 'aistudio' ? <AIStudio /> : null}
        {view === 'assets' ? <AssetsPage /> : null}
        {view === 'forms' ? <Forms /> : null}
        {view === 'settings' ? <Settings /> : null}
      </main>
      <NewProjectModal open={newProjectOpen} onClose={() => setNewProjectOpen(false)} />
      <UpdateBanner
        info={updateInfo}
        busy={updateBusy}
        error={updateError}
        onDismiss={() => setUpdateInfo(null)}
        onInstall={async () => {
          if (!updateInfo?.url) {
            setUpdateError('The release feed did not include an installer link.');
            return;
          }
          setUpdateError('');
          setUpdateBusy('download');
          try {
            const path = await bridge.downloadUpdate(updateInfo.url);
            setUpdateBusy('install');
            await bridge.installUpdate(path);
          } catch (error: any) {
            setUpdateError(error?.message || 'The update could not be installed.');
            setUpdateBusy(null);
          }
        }}
      />
      <Toasts />
    </div>
  );
}

function UpdateBanner({
  info,
  busy,
  error,
  onInstall,
  onDismiss,
}: {
  info: UpdateInfo | null;
  busy: 'download' | 'install' | null;
  error: string;
  onInstall: () => void;
  onDismiss: () => void;
}) {
  if (!info) return null;
  return (
    <div className="pointer-events-none fixed bottom-5 left-5 z-[210] w-[360px] max-w-[calc(100vw-2.5rem)]">
      <div className="pointer-events-auto animate-pop overflow-hidden rounded-2xl border border-accent/30 bg-[#12121d]/95 shadow-[0_24px_70px_-16px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        <div className="flex items-start gap-3 px-4 py-3.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent-soft">
            <Sparkles size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-semibold text-white">Webora {info.version} is available</div>
            <div className="mt-0.5 text-[10.5px] text-[#8b8ba4]">
              You are on v{info.currentVersion}. {info.publishedAt ? `Published ${info.publishedAt}.` : ''}
            </div>
            {info.notes ? (
              <p className="mt-1.5 max-h-16 overflow-hidden whitespace-pre-wrap text-[10px] leading-relaxed text-[#71718a]">
                {info.notes}
              </p>
            ) : null}
            {error ? (
              <div className="mt-2 rounded-md border border-red-500/20 bg-red-500/[0.07] px-2 py-1.5 text-[9.5px] leading-relaxed text-red-300">
                {error}
              </div>
            ) : null}
            <div className="mt-2.5 flex items-center gap-2">
              <button
                onClick={onInstall}
                disabled={!!busy}
                className="flex h-7 items-center gap-1.5 rounded-lg bg-accent px-2.5 text-[10.5px] font-semibold text-white transition hover:bg-accent-soft disabled:opacity-60"
              >
                {busy ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                {busy === 'download' ? 'Downloading…' : busy === 'install' ? 'Installing…' : 'Update and restart'}
              </button>
              <button
                onClick={onDismiss}
                disabled={!!busy}
                className="h-7 rounded-lg px-2 text-[10.5px] font-medium text-[#8b8ba4] transition hover:text-white disabled:opacity-50"
              >
                Later
              </button>
            </div>
          </div>
          <button
            onClick={onDismiss}
            disabled={!!busy}
            aria-label="Dismiss update"
            className="rounded p-1 text-[#5f5f78] transition hover:text-white disabled:opacity-50"
          >
            <X size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Splash({ ready }: { ready: boolean }) {
  return (
    <div className="splash-screen" aria-busy="true">
      <div className="splash-grid" />
      <div className="splash-glow" />
      <div className="splash-stage">
        <div className="splash-mark">
          <span className="splash-ring splash-ring-outer" />
          <span className="splash-ring splash-ring-inner" />
          <span className="splash-mark-core">
            <WeboraMark size={58} glow />
          </span>
        </div>
        <div className="splash-wordmark font-display">Webora</div>
        <div className="splash-tagline">AI Website Builder</div>
        <div className="splash-progress">
          <span className={ready ? 'splash-progress-fill is-ready' : 'splash-progress-fill'} />
        </div>
        <div className="splash-status">
          <span className={ready ? 'splash-dot is-ready' : 'splash-dot'} />
          {ready ? 'Workspace ready' : 'Loading your workspace'}
        </div>
      </div>
      <div className="splash-footer">
        <span>Projects, assets and keys stay on this device</span>
        <span className="splash-version">v1.2</span>
      </div>
    </div>
  );
}

function Toasts() {
  const toasts = useStore((s) => s.toasts);
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[200] flex w-[320px] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto flex animate-pop items-start gap-2.5 rounded-xl border px-3.5 py-3 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl',
            toast.kind === 'success'
              ? 'border-emerald-400/25 bg-[#0e1a16]/95 text-emerald-200'
              : toast.kind === 'error'
              ? 'border-red-500/25 bg-[#1b0f13]/95 text-red-200'
              : 'border-white/[0.09] bg-[#12121d]/95 text-[#d2d2e2]'
          )}
        >
          <span
            className={cn(
              'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
              toast.kind === 'success'
                ? 'bg-emerald-400/15 text-emerald-400'
                : toast.kind === 'error'
                ? 'bg-red-500/15 text-red-400'
                : 'bg-accent/15 text-accent-soft'
            )}
          >
            {toast.kind === 'success' ? (
              <Check size={10} />
            ) : toast.kind === 'error' ? (
              <AlertCircle size={10} />
            ) : (
              <Info size={10} />
            )}
          </span>
          <span className="min-w-0 flex-1 text-[11.5px] leading-relaxed">{toast.message}</span>
          <button
            onClick={() => useStore.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== toast.id) }))}
            className="mt-0.5 shrink-0 rounded p-0.5 opacity-50 transition hover:opacity-100"
            aria-label="Dismiss notification"
          >
            <X size={11} />
          </button>
        </div>
      ))}
    </div>
  );
}

interface BoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-ink-950 px-8 text-center">
        <WeboraMark size={46} />
        <div>
          <h1 className="font-display text-[18px] font-semibold text-white">Webora hit an unexpected error</h1>
          <p className="mt-1.5 max-w-lg text-[12px] leading-relaxed text-[#7f7f98]">
            Your saved projects are unaffected. Reload the interface to keep working.
          </p>
        </div>
        <pre className="max-h-40 max-w-xl overflow-auto whitespace-pre-wrap rounded-xl border border-red-500/20 bg-red-500/[0.06] p-3 text-left font-mono text-[10px] leading-relaxed text-red-300/80">
          {this.state.error.message}
        </pre>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-[12px] font-semibold text-white hover:bg-accent-soft"
        >
          <RotateCw size={13} /> Reload Webora
        </button>
      </div>
    );
  }
}
