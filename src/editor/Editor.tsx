import React, { useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Code2,
  Download,
  Eye,
  Loader2,
  Monitor,
  Redo2,
  Save,
  Smartphone,
  Sparkles,
  Tablet,
  Undo2,
} from 'lucide-react';
import { useStore, selectedElementOf } from '../store/useStore';
import type { Breakpoint, WebElement } from '../types';
import { clone, cn } from '../lib/utils';
import { WeboraMark } from '../components/ui';
import { Canvas } from './Canvas';
import { LeftPanel } from './LeftPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { AIAssistant } from './AIAssistant';
import { CodeStudio } from './CodeStudio';
import { PreviewModal } from './PreviewModal';
import { ExportModal } from './ExportModal';

const DEVICES: Array<{ id: Breakpoint; icon: typeof Monitor; label: string }> = [
  { id: 'desktop', icon: Monitor, label: 'Desktop' },
  { id: 'tablet', icon: Tablet, label: 'Tablet' },
  { id: 'mobile', icon: Smartphone, label: 'Mobile' },
];

export function Editor() {
  const current = useStore((s) => s.current);
  const view = useStore((s) => s.view);
  const device = useStore((s) => s.device);
  const zoom = useStore((s) => s.zoom);
  const historyIndex = useStore((s) => s.historyIndex);
  const historyLength = useStore((s) => s.history.length);
  const saveState = useStore((s) => s.saveState);
  const aiOpen = useStore((s) => s.aiOpen);
  const codeOpen = useStore((s) => s.codeOpen);
  const previewOpen = useStore((s) => s.previewOpen);
  const exportOpen = useStore((s) => s.exportOpen);

  const setView = useStore((s) => s.setView);
  const setDevice = useStore((s) => s.setDevice);
  const setZoom = useStore((s) => s.setZoom);
  const setUI = useStore((s) => s.setUI);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const saveNow = useStore((s) => s.saveNow);
  const updateCurrentName = useStore((s) => s.updateCurrentName);
  const duplicateSelected = useStore((s) => s.duplicateSelected);
  const deleteSelected = useStore((s) => s.deleteSelected);
  const moveSelected = useStore((s) => s.moveSelected);
  const pasteElement = useStore((s) => s.pasteElement);
  const selectElement = useStore((s) => s.selectElement);

  const clipboard = useRef<WebElement | null>(null);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyLength - 1;
  const modalOpen = codeOpen || previewOpen || exportOpen;

  useEffect(() => {
    if (view !== 'editor') return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        !!target?.closest('input, textarea, select, [contenteditable="true"], .monaco-editor') ||
        target?.isContentEditable;
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (mod && key === 's') {
        event.preventDefault();
        void saveNow();
        return;
      }
      if (mod && key === 'z') {
        if (typing) return;
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && key === 'y') {
        if (typing) return;
        event.preventDefault();
        redo();
        return;
      }
      if (mod && key === 'k') {
        event.preventDefault();
        setUI({ aiOpen: !useStore.getState().aiOpen });
        return;
      }
      if (event.key === 'Escape') {
        if (modalOpen) return;
        if (useStore.getState().aiOpen) {
          setUI({ aiOpen: false });
          return;
        }
        selectElement(null);
        return;
      }
      if (typing) return;
      const state = useStore.getState();
      if (!state.current) return;

      if (mod && key === 'd') {
        event.preventDefault();
        duplicateSelected();
        return;
      }
      if (mod && key === 'c') {
        const el = selectedElementOf(state);
        if (el) {
          clipboard.current = clone(el);
          event.preventDefault();
        }
        return;
      }
      if (mod && key === 'v') {
        if (clipboard.current) {
          event.preventDefault();
          pasteElement(clipboard.current);
        }
        return;
      }
      if ((key === 'delete' || key === 'backspace') && state.selectedId) {
        event.preventDefault();
        deleteSelected();
        return;
      }
      if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        event.preventDefault();
        moveSelected(event.key === 'ArrowUp' ? 'up' : 'down');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    view,
    modalOpen,
    saveNow,
    undo,
    redo,
    setUI,
    selectElement,
    duplicateSelected,
    deleteSelected,
    moveSelected,
    pasteElement,
  ]);

  if (!current) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-ink-950 text-[12px] text-[#7f7f98]">
        <WeboraMark size={42} />
        <p>No project is open.</p>
        <button
          onClick={() => setView('projects')}
          className="rounded-lg border border-white/10 px-3 py-1.5 font-medium text-white hover:bg-white/[0.06]"
        >
          Back to projects
        </button>
      </div>
    );
  }

  const back = async () => {
    if (saveState === 'unsaved') {
      await saveNow().catch(() => {});
    }
    setView('projects');
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#07070c] text-[#e8e8f2]">
      <header className="relative z-[60] flex h-[52px] shrink-0 items-center gap-2 border-b border-white/[0.07] bg-[#0a0a11] px-3">
        <button
          onClick={() => void back()}
          title="Back to projects"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9a9ab2] transition hover:bg-white/[0.06] hover:text-white"
        >
          <ArrowLeft size={15} />
        </button>
        <WeboraMark size={24} glow />
        <div className="ml-1 flex min-w-0 items-center gap-2">
          <input
            value={current.name}
            onChange={(e) => updateCurrentName(e.target.value)}
            title="Project name"
            className="h-7 w-[180px] rounded-md border border-transparent bg-transparent px-1.5 text-[12px] font-semibold text-white outline-none transition hover:border-white/10 focus:border-accent/50"
          />
          <span className="hidden items-center gap-1 text-[9.5px] text-[#5c5c74] sm:flex">
            {saveState === 'saving' ? (
              <>
                <Loader2 size={10} className="animate-spin" /> Saving
              </>
            ) : saveState === 'unsaved' ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Unsaved
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Saved
              </>
            )}
          </span>
        </div>

        <span className="mx-1 h-5 w-px bg-white/[0.08]" />

        <div className="flex items-center gap-0.5">
          <ToolButton label="Undo (Ctrl+Z)" icon={Undo2} onClick={undo} disabled={!canUndo} />
          <ToolButton label="Redo (Ctrl+Y)" icon={Redo2} onClick={redo} disabled={!canRedo} />
          <ToolButton
            label="Save (Ctrl+S)"
            icon={saveState === 'saving' ? Loader2 : Save}
            onClick={() => void saveNow()}
            spin={saveState === 'saving'}
          />
        </div>

        <div className="mx-1 h-5 w-px bg-white/[0.08]" />

        <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-ink-900/70 p-0.5">
          {DEVICES.map((item) => (
            <button
              key={item.id}
              onClick={() => setDevice(item.id)}
              title={`${item.label} viewport`}
              className={cn(
                'flex h-7 items-center gap-1.5 rounded-md px-2 text-[10.5px] font-medium transition',
                device === item.id ? 'bg-white/[0.09] text-white' : 'text-[#7d7d96] hover:text-white'
              )}
            >
              <item.icon size={12} />
              <span className="hidden lg:inline">{item.label}</span>
            </button>
          ))}
        </div>

        <select
          value={String(zoom)}
          onChange={(e) => setZoom(Number(e.target.value))}
          title="Canvas zoom"
          className="ml-1 h-7 rounded-lg border border-white/10 bg-ink-900/70 px-1.5 text-[10px] font-medium text-[#a4a4bb] outline-none hover:text-white"
        >
          {[0.5, 0.75, 1, 1.25].map((value) => (
            <option key={value} value={value}>
              {Math.round(value * 100)}%
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => setUI({ aiOpen: !aiOpen })}
            className={cn(
              'flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-medium transition',
              aiOpen
                ? 'border-accent/40 bg-accent/15 text-[#d8ccff]'
                : 'border-white/10 text-[#b4b4c9] hover:border-accent/30 hover:text-white'
            )}
            title="AI Assistant (Ctrl+K)"
          >
            <Sparkles size={13} className="text-accent-soft" />
            <span className="hidden md:inline">AI</span>
          </button>
          <button
            onClick={() => setUI({ codeOpen: true })}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-[11px] font-medium text-[#b4b4c9] transition hover:border-white/20 hover:text-white"
            title="Code Studio"
          >
            <Code2 size={13} />
            <span className="hidden md:inline">Code</span>
          </button>
          <button
            onClick={() => setUI({ previewOpen: true })}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-[11px] font-medium text-[#b4b4c9] transition hover:border-white/20 hover:text-white"
            title="Preview generated site"
          >
            <Eye size={13} />
            <span className="hidden md:inline">Preview</span>
          </button>
          <button
            onClick={() => setUI({ exportOpen: true })}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-[11px] font-semibold text-white shadow-[0_8px_24px_-10px_rgba(124,92,255,0.9)] transition hover:bg-accent-soft"
            title="Export website ZIP"
          >
            <Download size={13} />
            Export
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <LeftPanel />
        <Canvas />
        <PropertiesPanel />
      </div>

      {aiOpen ? <AIAssistant /> : null}
      {codeOpen ? <CodeStudio /> : null}
      {previewOpen ? <PreviewModal /> : null}
      {exportOpen ? <ExportModal /> : null}
    </div>
  );
}

function ToolButton({
  label,
  icon: Icon,
  onClick,
  disabled,
  spin,
}: {
  label: string;
  icon: typeof Undo2;
  onClick: () => void;
  disabled?: boolean;
  spin?: boolean;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9292aa] transition hover:bg-white/[0.07] hover:text-white disabled:pointer-events-none disabled:opacity-30"
    >
      <Icon size={14} className={spin ? 'animate-spin' : undefined} />
    </button>
  );
}
