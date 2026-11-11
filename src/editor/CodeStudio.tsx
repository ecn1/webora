import React, { useEffect, useMemo, useRef, useState } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';import {
  ArrowLeft,
  Check,
  Code2,
  Eye,
  EyeOff,
  FileCode2,
  RotateCcw,
  Save,
  X,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { generateElementsHtml, generatePageHtml } from '../lib/codegen';
import { clone, cn } from '../lib/utils';
import { Button, ConfirmDialog, Select } from '../components/ui';
import { THEME } from './monaco';

type Kind = 'html' | 'css' | 'js';

const TABS: Array<{ id: Kind; label: string; language: string }> = [
  { id: 'html', label: 'HTML', language: 'html' },
  { id: 'css', label: 'CSS', language: 'css' },
  { id: 'js', label: 'JS', language: 'javascript' },
];

const STARTER_CSS = `/* Page-specific styles.
   These rules are appended after the generated stylesheet,
   so they win on equal specificity.

   Target any element by its generated class, for example:
   .w-el_abc123 { letter-spacing: -0.01em; }

   Or use Custom CSS elements from the Add panel. */
`;

const STARTER_JS = `// Page-specific JavaScript.
// Runs after the base script on this page only.
`;

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function CodeStudio() {
  const current = useStore((s) => s.current);
  const pageId = useStore((s) => s.selectedPageId);
  const setPage = useStore((s) => s.setPage);
  const setUI = useStore((s) => s.setUI);
  const commit = useStore((s) => s.commit);
  const toast = useStore((s) => s.toast);

  const page = current?.pages.find((p) => p.id === pageId) ?? current?.pages[0] ?? null;

  const generatedHtml = useMemo(
    () => (page ? generateElementsHtml(page) : ''),
    [page]
  );

  const [tab, setTab] = useState<Kind>('html');
  const [drafts, setDrafts] = useState<{ html: string; css: string; js: string }>({
    html: '',
    css: '',
    js: '',
  });
  const [baseline, setBaseline] = useState<{ html: string; css: string; js: string }>({
    html: '',
    css: '',
    js: '',
  });
  const [showPreview, setShowPreview] = useState(true);
  const [confirmClose, setConfirmClose] = useState(false);
  const [pendingPage, setPendingPage] = useState<string | null>(null);
  const loadedPageRef = useRef<string | null>(null);
  const saveRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!page) return;
    if (loadedPageRef.current === page.id) return;
    const initial = {
      html: page.custom?.html ?? current?.custom.html ?? generatedHtml,
      css: page.custom?.css ?? STARTER_CSS,
      js: page.custom?.js ?? STARTER_JS,
    };
    setDrafts(initial);
    setBaseline(initial);
    loadedPageRef.current = page.id;
    setTab('html');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page?.id]);

  const dirty =
    drafts.html !== baseline.html || drafts.css !== baseline.css || drafts.js !== baseline.js;

  const debouncedDrafts = useDebounced(drafts, 550);
  const previewProject = useMemo(() => {
    if (!current || !page) return null;
    const project = clone(current);
    const target = project.pages.find((p) => p.id === page.id);
    if (!target) return null;
    const custom: NonNullable<typeof target.custom> = { ...(target.custom ?? {}) };
    if (debouncedDrafts.html.trim() && debouncedDrafts.html !== generatedHtml) custom.html = debouncedDrafts.html;
    else delete custom.html;
    if (debouncedDrafts.css.trim() && debouncedDrafts.css !== STARTER_CSS) custom.css = debouncedDrafts.css;
    else delete custom.css;
    if (debouncedDrafts.js.trim() && debouncedDrafts.js !== STARTER_JS) custom.js = debouncedDrafts.js;
    else delete custom.js;
    target.custom = Object.keys(custom).length ? custom : undefined;
    return project;
  }, [current, page, debouncedDrafts, generatedHtml]);

  const previewHtml = useMemo(
    () =>
      previewProject && page
        ? generatePageHtml(previewProject, previewProject.pages.find((p) => p.id === page.id) ?? page, {
            inline: true,
          })
        : '',
    [previewProject, page]
  );

  const save = () => {
    if (!page) return;
    const targetId = page.id;
    const next = { ...drafts };
    const fallbackFor = (kind: Kind) =>
      kind === 'html' ? generatedHtml : kind === 'css' ? STARTER_CSS : STARTER_JS;
    commit((p) => {
      const pg = p.pages.find((x) => x.id === targetId);
      if (!pg) return;
      const custom: NonNullable<typeof pg.custom> = { ...(pg.custom ?? {}) };
      (['html', 'css', 'js'] as Kind[]).forEach((kind) => {
        if (next[kind] === baseline[kind]) return;
        const value = next[kind];
        if (!value.trim() || value === fallbackFor(kind)) delete custom[kind];
        else custom[kind] = value;
      });
      pg.custom = Object.keys(custom).length ? custom : undefined;
    });
    setBaseline({ ...next });
    toast(`Code saved for ${page.name}`, 'success');
  };
  saveRef.current = save;

  const resetTab = () => {
    if (!page) return;
    const targetId = page.id;
    const fallback = tab === 'html' ? generatedHtml : tab === 'css' ? STARTER_CSS : STARTER_JS;
    setDrafts((prev) => ({ ...prev, [tab]: fallback }));
    setBaseline((prev) => ({ ...prev, [tab]: fallback }));
    commit((p) => {
      const pg = p.pages.find((x) => x.id === targetId);
      if (!pg || !pg.custom) return;
      delete pg.custom[tab];
      if (!Object.keys(pg.custom).length) pg.custom = undefined;
    });
    toast(`${tab.toUpperCase()} override cleared`, 'info');
  };

  const close = () => {
    if (dirty) {
      setConfirmClose(true);
      return;
    }
    setUI({ codeOpen: false });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const inEditor = !!(event.target as HTMLElement | null)?.closest?.('.monaco-editor');
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveRef.current();
      }
      if (event.key === 'Escape' && !inEditor) {
        event.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drafts, page?.id]);

  const onMount: OnMount = (editor, api) => {
    editor.addCommand(api.KeyMod.CtrlCmd | api.KeyCode.KeyS, () => saveRef.current());
    editor.focus();
  };

  if (!current || !page) return null;

  const activeTab = TABS.find((t) => t.id === tab)!;
  const hasOverride = !!page.custom?.[tab];

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#08080e]">
      <header className="flex h-[54px] shrink-0 items-center gap-3 border-b border-white/[0.07] bg-[#0a0a11] px-4">
        <button
          onClick={close}
          className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11.5px] font-medium text-[#9a9ab2] transition hover:bg-white/[0.06] hover:text-white"
        >
          <ArrowLeft size={14} /> Canvas
        </button>
        <span className="h-4 w-px bg-white/[0.08]" />
        <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-white">
          <Code2 size={14} className="text-accent-soft" /> Code Studio
        </span>

        <Select
          value={page.id}
          onChange={(e) => {
            const id = e.target.value;
            if (id === page.id) return;
            if (dirty) setPendingPage(id);
            else switchPage(id);
          }}
          className="ml-1 h-7 w-[150px] py-0 text-[11px]"
        >
          {current.pages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>

        <div className="ml-2 flex items-center gap-0.5 rounded-lg border border-white/10 bg-ink-900/70 p-0.5">
          {TABS.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                'flex h-6 items-center gap-1 rounded-md px-2.5 font-mono text-[10.5px] font-medium transition',
                tab === item.id ? 'bg-white/[0.09] text-white' : 'text-[#7d7d96] hover:text-white'
              )}
            >
              {item.label}
              {page.custom?.[item.id] ? <span className="h-1 w-1 rounded-full bg-accent-soft" /> : null}
            </button>
          ))}
        </div>

        <span
          className={cn(
            'ml-1 flex items-center gap-1 text-[10px]',
            dirty ? 'text-amber-300' : 'text-[#5c5c74]'
          )}
        >
          {dirty ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Unsaved changes
            </>
          ) : (
            <>
              <Check size={11} className="text-emerald-400" /> Saved
            </>
          )}
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            icon={showPreview ? EyeOff : Eye}
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview ? 'Hide preview' : 'Preview'}
          </Button>
          <Button variant="ghost" size="sm" icon={RotateCcw} onClick={resetTab} disabled={!hasOverride && !dirty}>
            Reset tab
          </Button>
          <Button variant="primary" size="sm" icon={Save} onClick={save} disabled={!dirty}>
            Save
          </Button>
          <button
            onClick={close}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#7d7d96] transition hover:bg-white/[0.07] hover:text-white"
            aria-label="Close code studio"
          >
            <X size={14} />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-8 shrink-0 items-center gap-2 border-b border-white/[0.05] bg-[#0a0a11] px-3">
            <FileCode2 size={12} className="text-[#6f6f88]" />
            <span className="font-mono text-[10.5px] text-[#9a9ab2]">
              {page.path === '/' ? 'index' : page.path.replace(/^\//, '')}.{tab === 'js' ? 'js' : tab}
            </span>
            <span className="text-[9.5px] text-[#4f4f66]">
              {tab === 'html'
                ? 'Body markup for this page'
                : tab === 'css'
                ? 'Appended after the generated stylesheet'
                : 'Runs after the base script'}
            </span>
            <span className="ml-auto text-[9.5px] text-[#4f4f66]">
              {hasOverride ? (
                <span className="text-emerald-400/80">override active</span>
              ) : (
                'editing generated output'
              )}
            </span>
          </div>

          <div className="relative min-h-0 flex-1">
            <Editor
              key={`${page.id}:${tab}`}
              language={activeTab.language}
              theme={THEME}
              value={drafts[tab]}
              onChange={(value) => setDrafts((prev) => ({ ...prev, [tab]: value ?? '' }))}
              onMount={onMount}
              loading={
                <div className="flex h-full items-center justify-center text-[11px] text-[#5f5f78]">
                  Loading editor…
                </div>
              }
              options={{
                minimap: { enabled: false },
                fontSize: 12.5,
                lineHeight: 20,
                fontFamily:
                  "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                padding: { top: 12, bottom: 12 },
                renderLineHighlight: 'line',
                cursorBlinking: 'smooth',
                smoothScrolling: true,
                tabSize: 2,
                automaticLayout: true,
                scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
                stickyScroll: { enabled: false },
                overviewRulerLanes: 0,
                hideCursorInOverviewRuler: true,
              }}
            />
          </div>

          {tab === 'html' ? (
            <div className="shrink-0 border-t border-white/[0.06] bg-[#0a0a11] px-3 py-2 text-[10px] leading-relaxed text-[#5f5f78]">
              Saving HTML replaces the generated body for this page. The visual canvas keeps its element document, so
              you can clear the override at any time without losing layout data.
            </div>
          ) : null}
        </div>

        {showPreview ? (
          <div className="flex w-[44%] min-w-[360px] max-w-[720px] shrink-0 flex-col border-l border-white/[0.07] bg-[#07070c]">
            <div className="flex h-8 shrink-0 items-center gap-2 border-b border-white/[0.06] px-3">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] font-medium text-[#8f8fa9]">Live preview</span>
              <span className="ml-auto truncate font-mono text-[9px] text-[#4f4f66]">
                {page.name} · sandboxed
              </span>
            </div>
            <div className="min-h-0 flex-1 p-3">
              <div className="h-full overflow-hidden rounded-lg border border-white/10 bg-[#0a0a12]">
                <iframe
                  title="Code studio preview"
                  srcDoc={previewHtml}
                  sandbox="allow-scripts allow-forms"
                  className="h-full w-full border-0"
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmClose}
        title="Discard unsaved code?"
        message="You have unsaved changes in Code Studio. Closing now will discard them."
        confirmLabel="Discard and close"
        onClose={() => setConfirmClose(false)}
        onConfirm={() => {
          setConfirmClose(false);
          setUI({ codeOpen: false });
        }}
      />

      <ConfirmDialog
        open={!!pendingPage}
        title="Discard unsaved code?"
        message="Switching pages will discard the unsaved changes in this editor."
        confirmLabel="Discard and switch"
        onClose={() => setPendingPage(null)}
        onConfirm={() => {
          const id = pendingPage;
          setPendingPage(null);
          if (id) switchPage(id);
        }}
      />
    </div>
  );

  function switchPage(id: string) {
    loadedPageRef.current = null;
    setPage(id);
  }
}
