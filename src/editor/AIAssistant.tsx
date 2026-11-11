import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronRight,
  Circle,
  Loader2,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import type { EditOp } from '../lib/ai';
import { applyOps, describeEditOp, generateEditOps } from '../lib/ai';
import { generatePageHtml } from '../lib/codegen';
import { findElement } from '../lib/docEngine';
import { clone } from '../lib/utils';
import { cn } from '../lib/utils';
import { Button, Textarea } from '../components/ui';

const PROMPTS = [
  'Add a page called Services with a hero, three service cards and a contact form',
  'Add a YouTube video section below the hero',
  'Add a Gmail contact button and a working contact form',
  'Make this page feel warmer and more premium',
  'Add a three-tier pricing section',
  'Rewrite the copy so it is concise and confident',
];

export function AIAssistant() {
  const current = useStore((s) => s.current);
  const pageId = useStore((s) => s.selectedPageId);
  const selectedId = useStore((s) => s.selectedId);
  const settings = useStore((s) => s.settings);
  const apiKey = useStore((s) => s.apiKey);
  const setUI = useStore((s) => s.setUI);
  const applyAIOps = useStore((s) => s.applyAIOps);
  const appendProjectAIChat = useStore((s) => s.appendProjectAIChat);
  const toast = useStore((s) => s.toast);
  const setView = useStore((s) => s.setView);
  const aiBusy = useStore((s) => s.aiBusy);

  const [instruction, setInstruction] = useState('');
  const [streaming, setStreaming] = useState('');
  const [result, setResult] = useState<{ ops: EditOp[]; raw?: string; error?: string; warnings?: string[]; applied?: number } | null>(null);
  const [applied, setApplied] = useState<{ count: number; pageCreated: boolean } | null>(null);
  const chatEnd = useRef<HTMLDivElement>(null);

  const page = current?.pages.find((p) => p.id === pageId) ?? current?.pages[0] ?? null;
  const selected = useMemo(() => {
    if (!page || !selectedId) return null;
    return findElement(page.elements, selectedId)?.el ?? null;
  }, [page, selectedId]);
  const chat = current?.aiChat ?? [];

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: 'end' });
  }, [chat.length, aiBusy, result]);

  const preview = useMemo(() => {
    if (!current || !page || !result?.ops.length) return null;
    const copy = clone(current);
    const outcome = applyOps(copy, result.ops, page.id);
    const target =
      copy.pages.find((item) => outcome.pageIds.includes(item.id)) ??
      copy.pages.find((item) => item.id === page.id) ??
      copy.pages[0];
    if (!target) return null;
    return {
      html: generatePageHtml(copy, target, { inline: true }),
      name: target.name,
      pageCount: copy.pages.length,
    };
  }, [current, page, result]);

  if (!current || !page) return null;

  const close = () => setUI({ aiOpen: false });

  const run = async () => {
    const text = instruction.trim();
    if (!text) {
      toast('Describe the change you want first', 'info');
      return;
    }
    if (settings.ai.provider === 'openai' && !apiKey) {
      setResult({ ops: [], error: 'No API key stored. Add one in Settings → AI Providers, or switch to Ollama.' });
      return;
    }
    const history = current.aiChat ?? [];
    appendProjectAIChat(current.id, { role: 'user', content: text });
    setUI({ aiBusy: true });
    setStreaming('');
    setResult(null);
    setApplied(null);
    try {
      const res = await generateEditOps(
        settings.ai,
        apiKey,
        text,
        selected,
        current,
        (delta) => setStreaming((prev) => (prev + delta).slice(-8000)),
        { history, focusPageId: page.id }
      );
      setResult(res);
      if (res.error) {
        appendProjectAIChat(current.id, {
          role: 'assistant',
          content: res.error,
          kind: 'error',
        });
        toast('The assistant could not produce a valid edit', 'error');
      }
    } catch (err: any) {
      const message = err?.message || 'Unexpected AI error.';
      setResult({ ops: [], error: message });
      appendProjectAIChat(current.id, { role: 'assistant', content: message, kind: 'error' });
    } finally {
      setUI({ aiBusy: false });
    }
  };

  const apply = () => {
    if (!result?.ops.length) return;
    const outcome = applyAIOps(result.ops);
    setApplied({ count: outcome.applied, pageCreated: outcome.createdPageIds.length > 0 });
    appendProjectAIChat(current.id, {
      role: 'assistant',
      content:
        outcome.applied > 0
          ? `Applied ${outcome.applied} change${outcome.applied === 1 ? '' : 's'} to your website.`
          : 'No changes could be applied.',
      kind: outcome.applied > 0 ? 'result' : 'error',
      changeCount: outcome.applied,
    });
    setResult(null);
    setStreaming('');
    setInstruction('');
  };

  return (
    <div className="fixed inset-y-0 right-0 z-[75] flex w-[452px] max-w-[92vw] flex-col border-l border-white/[0.08] bg-[#0a0a11] shadow-[-30px_0_80px_-20px_rgba(0,0,0,0.8)]">
      <header className="flex h-[52px] shrink-0 items-center gap-2.5 border-b border-white/[0.07] px-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent-soft">
          <Sparkles size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold text-white">AI Assistant</div>
          <div className="truncate text-[9.5px] text-[#5f5f78]">
            Reads every page · edits with real document operations
          </div>
        </div>
        <button
          onClick={close}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[#7d7d96] transition hover:bg-white/[0.07] hover:text-white"
          aria-label="Close AI assistant"
        >
          <X size={14} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="border-b border-white/[0.06] px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[#5f5f78]">Context</div>
            <span className="text-[9px] text-[#4f4f66]">
              {current.pages.length} page{current.pages.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.025] px-2.5 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <div className="min-w-0 flex-1 text-[11px]">
              <div className="truncate font-medium text-[#c8c8da]">
                {selected ? selected.name : 'Whole website'}
              </div>
              <div className="truncate text-[9.5px] text-[#5f5f78]">
                {page.name} · {selected ? `${selected.type} selected` : 'all pages and elements visible to the model'}
              </div>
            </div>
            <ChevronRight size={12} className="text-[#4f4f66]" />
          </div>
          <p className="mt-2 text-[9.5px] leading-relaxed text-[#515168]">
            Select an element to scope the edit. With nothing selected, ask for changes to any page, new pages,
            videos, forms or mail actions.
          </p>
        </div>

        {chat.length ? (
          <div className="border-b border-white/[0.06] px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[#5f5f78]">
                Chat history
              </div>
              <span className="text-[9px] text-[#4f4f66]">{chat.length} messages</span>
            </div>
            <div className="max-h-[230px] space-y-2 overflow-y-auto pr-1">
              {chat.slice(-14).map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    'rounded-lg px-2.5 py-2 text-[10.5px] leading-relaxed',
                    entry.role === 'user'
                      ? 'ml-7 border border-accent/20 bg-accent/[0.08] text-[#d5cdf2]'
                      : entry.kind === 'error'
                      ? 'mr-4 border border-red-500/20 bg-red-500/[0.05] text-red-300'
                      : 'mr-4 border border-white/[0.06] bg-white/[0.025] text-[#a4a4bc]'
                  )}
                >
                  {entry.content}
                  {entry.role === 'assistant' && entry.changeCount ? (
                    <span className="mt-1 block text-[9px] text-emerald-300/80">
                      {entry.changeCount} document change{entry.changeCount === 1 ? '' : 's'}
                    </span>
                  ) : null}
                </div>
              ))}
              <div ref={chatEnd} />
            </div>
          </div>
        ) : null}

        <div className="space-y-3 p-4">
          <Textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Ask for any change, e.g. “Add an About page with a team section, a YouTube video and a contact form”…"
            className="min-h-[96px] text-[12px]"
            disabled={aiBusy}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                void run();
              }
            }}
          />

          <div className="flex flex-wrap gap-1.5">
            {PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => setInstruction(prompt)}
                disabled={aiBusy}
                className="rounded-md border border-white/[0.08] bg-white/[0.02] px-2 py-1 text-left text-[9.5px] font-medium text-[#8b8ba4] transition hover:border-accent/30 hover:text-white disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          <Button
            variant="primary"
            className="w-full"
            icon={aiBusy ? undefined : Wand2}
            loading={aiBusy}
            onClick={run}
            disabled={aiBusy}
          >
            {aiBusy ? 'Asking the model…' : 'Ask for changes'}
          </Button>
          <p className="text-center text-[9px] text-[#4f4f66]">
            Ctrl+Enter to run. {settings.ai.provider === 'ollama' ? 'Running locally via Ollama.' : 'Using your configured API.'}
          </p>

          {settings.ai.provider === 'openai' && !apiKey ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2 text-[10px] leading-relaxed text-amber-200/80">
              <AlertCircle size={12} className="mt-0.5 shrink-0" />
              <span>
                No API key stored.{' '}
                <button
                  onClick={() => {
                    close();
                    setView('settings');
                  }}
                  className="underline hover:text-white"
                >
                  Open settings
                </button>
              </span>
            </div>
          ) : null}
        </div>

        {aiBusy || streaming ? (
          <div className="border-t border-white/[0.06] px-4 py-3">
            <div className="flex items-center gap-2 text-[10px] font-medium text-[#9a9ab2]">
              {aiBusy ? <Loader2 size={12} className="animate-spin text-accent-soft" /> : <Check size={12} className="text-emerald-400" />}
              {aiBusy ? 'Receiving model output' : 'Model response received'}
              <span className="ml-auto font-mono text-[9px] text-[#4f4f66]">{streaming.length} chars</span>
            </div>
            <pre className="mt-2 max-h-[150px] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-white/[0.06] bg-[#07070c] p-2 font-mono text-[9px] leading-relaxed text-[#77778f]">
              {streaming.slice(-3000) || 'Waiting for the first token…'}
            </pre>
          </div>
        ) : null}

        {result && !aiBusy ? (
          <div className="border-t border-white/[0.06] px-4 py-3">
            {result.error ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] p-3">
                <div className="flex items-start gap-2 text-[11px] leading-relaxed text-red-300">
                  <AlertCircle size={13} className="mt-0.5 shrink-0" />
                  <span>{result.error}</span>
                </div>
                {result.raw ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[9.5px] text-red-300/70 hover:text-red-200">
                      Show raw model response
                    </summary>
                    <pre className="mt-1.5 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-black/30 p-2 font-mono text-[9px] leading-relaxed text-red-200/70">
                      {result.raw}
                    </pre>
                  </details>
                ) : null}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[#5f5f78]">
                    Proposed changes
                  </div>
                  <span className="rounded bg-accent/15 px-1.5 py-0.5 font-mono text-[9px] text-[#c8baff]">
                    {result.ops.length} op{result.ops.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="mt-2 max-h-[190px] space-y-1 overflow-y-auto pr-1">
                  {result.ops.map((op, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[10.5px] text-[#a4a4bc]"
                    >
                      <Circle size={7} className="mt-1 shrink-0 fill-accent/60 text-accent/60" />
                      <span className="min-w-0 flex-1 break-words">{describeEditOp(op)}</span>
                    </div>
                  ))}
                </div>

                {result.warnings?.length ? (
                  <div className="mt-2 text-[9.5px] leading-relaxed text-amber-300/70">
                    {result.warnings.length} operation{result.warnings.length === 1 ? '' : 's'} will be skipped.
                  </div>
                ) : null}

                {preview ? (
                  <div className="mt-3">
                    <div className="mb-1.5 flex items-center justify-between text-[9px] text-[#4f4f66]">
                      <span>Preview after applying · {preview.name}</span>
                      <span>{preview.pageCount} pages</span>
                    </div>
                    <div className="checker overflow-hidden rounded-lg border border-white/[0.08]">
                      <iframe
                        title="AI edit preview"
                        srcDoc={preview.html}
                        sandbox="allow-scripts allow-forms"
                        className="h-[200px] w-full border-0 bg-[#0a0a12]"
                      />
                    </div>
                  </div>
                ) : null}

                <div className="mt-3 flex items-center gap-2">
                  <Button variant="primary" size="sm" icon={Check} onClick={apply} className="flex-1">
                    Apply {result.ops.length} change{result.ops.length === 1 ? '' : 's'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setResult(null)}>
                    Discard
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : null}

        {applied ? (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2 text-[10.5px] text-emerald-300">
            <Check size={12} />
            Applied {applied.count} change{applied.count === 1 ? '' : 's'}
            {applied.pageCreated ? ' · new page added' : ''}. Undo with Ctrl+Z.
          </div>
        ) : null}
      </div>

      <footer className="shrink-0 border-t border-white/[0.06] px-4 py-2.5 text-[9px] leading-relaxed text-[#4f4f66]">
        The model sees every page and only returns structured operations. Changes are validated against the current site
        before they are applied, and can be undone.
      </footer>
    </div>
  );
}
