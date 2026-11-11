import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  Circle,
  Cpu,
  FileText,
  Loader2,
  MessageSquare,
  Monitor,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Wand2,
  XCircle,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import {
  applyOps,
  describeEditOp,
  generateEditOps,
  generateWebsite,
  type AIStage,
} from '../lib/ai';
import { generatePageHtml } from '../lib/codegen';
import { countElements } from '../lib/docEngine';
import { bridge } from '../lib/bridge';
import { clone, timeAgo } from '../lib/utils';
import { Button, ConfirmDialog, Textarea } from '../components/ui';
import { cn } from '../lib/utils';

const EXAMPLES = [
  {
    label: 'Cyberpunk gaming portal',
    prompt:
      'Create a futuristic gaming website with a dark background, neon blue accents, animated hero section, navigation bar, game cards, season rewards section and footer.',
  },
  {
    label: 'Product designer portfolio',
    prompt:
      'Create a minimal portfolio website for a product designer. Include a strong hero with an introduction, a grid of four selected projects, an about section, and a contact call to action.',
  },
  {
    label: 'SaaS landing page',
    prompt:
      'Create a professional SaaS landing page for a team workspace product. Include a hero with two call-to-action buttons, a three-column feature grid, social proof metrics, three pricing plans, an FAQ and a footer.',
  },
  {
    label: 'Bold creative agency',
    prompt:
      'Create a bold creative agency website with oversized typography, warm orange accents, a services list, selected work gallery, a process section and a contact CTA.',
  },
];

const FOLLOW_UPS = [
  'Add an About page with a team section',
  'Add a YouTube video section below the hero',
  'Add a contact form and a Gmail button',
  'Make the palette warmer and more premium',
  'Add a three-tier pricing section',
  'Rewrite the copy to be shorter and more confident',
];

type ConnState = { status: 'idle' | 'checking' | 'ok' | 'error'; message: string; models?: string[] };

export function AIStudio() {
  const settings = useStore((s) => s.settings);
  const apiKey = useStore((s) => s.apiKey);
  const setView = useStore((s) => s.setView);
  const toast = useStore((s) => s.toast);
  const projects = useStore((s) => s.projects);

  const aiSessions = useStore((s) => s.aiSessions);
  const activeAISessionId = useStore((s) => s.activeAISessionId);
  const newAISession = useStore((s) => s.newAISession);
  const selectAISession = useStore((s) => s.selectAISession);
  const renameAISession = useStore((s) => s.renameAISession);
  const deleteAISession = useStore((s) => s.deleteAISession);
  const appendAISessionMessage = useStore((s) => s.appendAISessionMessage);
  const setAISessionProject = useStore((s) => s.setAISessionProject);
  const applyAISessionProject = useStore((s) => s.applyAISessionProject);

  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'generate' | 'edit' | null>(null);
  const [stages, setStages] = useState<AIStage[]>([]);
  const [error, setError] = useState('');
  const [raw, setRaw] = useState('');
  const [streamed, setStreamed] = useState('');
  const [previewPageId, setPreviewPageId] = useState<string | null>(null);
  const [conn, setConn] = useState<ConnState>({ status: 'idle', message: 'Not tested yet.' });
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const transcriptEnd = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const session = useMemo(
    () => aiSessions.find((item) => item.id === activeAISessionId) ?? null,
    [aiSessions, activeAISessionId]
  );
  const project = session?.project ?? null;
  const previewPage = useMemo(
    () => project?.pages.find((page) => page.id === previewPageId) ?? project?.pages[0] ?? null,
    [project, previewPageId]
  );
  const previewHtml = useMemo(
    () => (project && previewPage ? generatePageHtml(project, previewPage, { inline: true }) : ''),
    [project, previewPage]
  );

  const providerLabel = settings.ai.provider === 'ollama' ? 'Ollama (local)' : 'OpenAI-compatible';
  const modelLabel = settings.ai.provider === 'ollama' ? settings.ai.ollamaModel : settings.ai.apiModel;

  const buildRequest = (messages: Array<{ role: 'user' | 'system' | 'assistant'; content: string }>) => ({
    provider: settings.ai.provider,
    ollamaUrl: settings.ai.ollamaUrl,
    ollamaModel: settings.ai.ollamaModel,
    apiBaseUrl: settings.ai.apiBaseUrl,
    apiModel: settings.ai.apiModel,
    apiKey: apiKey || undefined,
    temperature: settings.ai.temperature,
    maxTokens: settings.ai.maxTokens,
    messages,
  });

  const checkConnection = async (silent = false) => {
    setConn({ status: 'checking', message: 'Testing provider…' });
    try {
      if (settings.ai.provider === 'ollama') {
        const models = await bridge.ollamaTags(settings.ai.ollamaUrl);
        if (!models.length) {
          setConn({
            status: 'error',
            message: 'Ollama is running but has no installed models. Run “ollama pull llama3.2”.',
            models,
          });
          return;
        }
        setConn({
          status: 'ok',
          message: `Connected · ${models.length} model${models.length === 1 ? '' : 's'} available`,
          models,
        });
      } else {
        const reply = await bridge.aiChat({
          ...buildRequest([{ role: 'user', content: 'Reply with the single word: OK' }]),
          maxTokens: 12,
          temperature: 0,
        });
        setConn({
          status: 'ok',
          message: `Connected · provider replied “${reply.trim().slice(0, 40) || 'OK'}”`,
        });
      }
    } catch (err: any) {
      setConn({
        status: 'error',
        message: err?.message || 'Could not reach the AI provider.',
      });
      if (!silent) toast('Provider connection failed', 'error');
    }
  };

  useEffect(() => {
    if (settings.ai.provider === 'ollama') void checkConnection(true);
    else setConn({ status: 'idle', message: 'Not tested yet — use Test connection.' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.ai.provider, settings.ai.ollamaUrl, settings.ai.apiBaseUrl]);

  // When a draft has already been opened in the editor, pick up later editor
  // changes so the assistant never edits a stale copy of the website.
  useEffect(() => {
    if (busy || !session?.project || !session.projectApplied) return;
    const saved = projects.find((item) => item.id === session.project!.id);
    if (saved && saved.updatedAt > session.project.updatedAt) {
      setAISessionProject(session.id, saved);
    }
  }, [busy, projects, session, setAISessionProject]);

  useEffect(() => {
    setError('');
    setRaw('');
    setStreamed('');
    setStages([]);
    setPreviewPageId(null);
    setPrompt('');
  }, [activeAISessionId]);

  useEffect(() => {
    if (previewPageId && previewPage?.id === previewPageId) return;
    if (project?.pages[0] && previewPageId !== project.pages[0].id) {
      setPreviewPageId(project.pages[0].id);
    }
  }, [project, previewPageId, previewPage]);

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ block: 'end' });
  }, [session?.messages.length, busy, mode]);

  const startNewChat = () => {
    if (busy) return;
    if (session && !session.project && session.messages.length === 0) {
      composerRef.current?.focus();
      return;
    }
    newAISession();
    setPrompt('');
    window.setTimeout(() => composerRef.current?.focus(), 30);
  };

  const beginRename = (id: string, title: string) => {
    setRenamingId(id);
    setRenameValue(title);
  };

  const commitRename = () => {
    if (!renamingId) return;
    renameAISession(renamingId, renameValue);
    setRenamingId(null);
    setRenameValue('');
  };

  const generate = async (id: string, text: string) => {
    setMode('generate');
    const res = await generateWebsite(settings.ai, apiKey, text, setStages, (delta) =>
      setStreamed((prev) => (prev + delta).slice(-12000))
    );
    if (res.error || !res.project) {
      setError(res.error || 'Generation failed.');
      setRaw(res.raw || '');
      appendAISessionMessage(id, {
        role: 'assistant',
        content: res.error || 'The website could not be generated.',
        kind: 'error',
      });
      return;
    }
    const generated = res.project;
    setAISessionProject(id, generated);
    setPreviewPageId(generated.pages[0]?.id ?? null);
    const elements = generated.pages.reduce((total, page) => total + countElements(page.elements), 0);
    appendAISessionMessage(id, {
      role: 'assistant',
      content: `Created “${generated.name}” with ${generated.pages.length} page${
        generated.pages.length === 1 ? '' : 's'
      } and ${elements} element${elements === 1 ? '' : 's'}. Ask for any change in this chat — the same site stays open, and nothing is replaced.`,
      kind: 'result',
      changeCount: elements,
    });
    toast('Website generated successfully', 'success');
  };

  const edit = async (id: string, text: string, draft: NonNullable<typeof project>) => {
    setMode('edit');
    const history = session?.messages ?? [];
    const focusId = previewPage?.id ?? draft.pages[0]?.id ?? null;
    const res = await generateEditOps(
      settings.ai,
      apiKey,
      text,
      null,
      draft,
      (delta) => setStreamed((prev) => (prev + delta).slice(-12000)),
      { history, focusPageId: focusId }
    );
    if (res.error || !res.ops.length) {
      setError(res.error || 'The assistant could not turn that request into document changes.');
      setRaw(res.raw || '');
      appendAISessionMessage(id, {
        role: 'assistant',
        content: res.error || 'The assistant could not turn that request into document changes.',
        kind: 'error',
      });
      return;
    }

    const next = clone(draft);
    const outcome = applyOps(next, res.ops, focusId);
    if (!outcome.applied) {
      const message =
        outcome.errors[0] ??
        'Those changes no longer match the website. Try naming the page or section you want changed.';
      setError(message);
      setRaw(res.raw || '');
      appendAISessionMessage(id, { role: 'assistant', content: message, kind: 'error' });
      return;
    }

    setAISessionProject(id, next);
    if (outcome.createdPageIds.length) {
      setPreviewPageId(outcome.createdPageIds[0]);
    }
    const summary = res.ops.slice(0, 5).map((op) => `• ${describeEditOp(op)}`);
    if (res.ops.length > 5) summary.push(`• …and ${res.ops.length - 5} more`);
    if (res.warnings?.length) {
      summary.push(`Skipped ${res.warnings.length} operation${res.warnings.length === 1 ? '' : 's'}: ${res.warnings[0]}`);
    }
    appendAISessionMessage(id, {
      role: 'assistant',
      content: `Applied ${outcome.applied} change${outcome.applied === 1 ? '' : 's'}.\n${summary.join('\n')}`,
      kind: 'result',
      changeCount: outcome.applied,
    });
    toast(`AI updated ${outcome.applied} element${outcome.applied === 1 ? '' : 's'}`, 'success');
  };

  const run = async () => {
    const text = prompt.trim();
    if (!text || busy) {
      if (!text) composerRef.current?.focus();
      return;
    }
    if (settings.ai.provider === 'openai' && !apiKey) {
      setError('No API key is stored. Add one in Settings → AI Providers, or switch to Ollama.');
      return;
    }

    let id = activeAISessionId;
    if (!id) id = newAISession(text.replace(/\s+/g, ' ').slice(0, 60));
    const draft = session?.project ?? null;
    appendAISessionMessage(id, { role: 'user', content: text });
    setPrompt('');
    setBusy(true);
    setError('');
    setRaw('');
    setStreamed('');
    setStages([]);
    try {
      if (draft) await edit(id, text, draft);
      else await generate(id, text);
    } catch (err: any) {
      const message = err?.message || 'Unexpected AI error.';
      setError(message);
      appendAISessionMessage(id, { role: 'assistant', content: message, kind: 'error' });
    } finally {
      setBusy(false);
      setMode(null);
    }
  };

  const typed = session?.messages ?? [];

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-7 py-3.5">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-medium text-[#5f5f78]">
            <span className="text-[#8c8ca6]">Workspace</span>
            <span className="text-[#33334a]">/</span>
            <span>AI Studio</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-2.5">
            <h1 className="font-display text-[22px] font-bold tracking-tight text-white">AI Studio</h1>
            <p className="text-[11px] text-[#6b6b84]">
              One site per chat. <span className="text-[#8f8fa8]">Follow-ups keep editing it.</span>
            </p>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2">
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                conn.status === 'ok'
                  ? 'bg-emerald-400'
                  : conn.status === 'checking'
                  ? 'bg-amber-400'
                  : conn.status === 'error'
                  ? 'bg-red-400'
                  : 'bg-[#55556e]'
              )}
            />
            <div className="text-[10.5px] leading-tight">
              <div className="font-medium text-[#d7d7e6]">{providerLabel}</div>
              <div className="text-[9.5px] text-[#6d6d86]" title={conn.message}>
                {conn.status === 'ok'
                  ? `Connected · ${modelLabel || 'no model'}`
                  : conn.status === 'checking'
                  ? 'Checking connection…'
                  : modelLabel || 'No model set'}
              </div>
            </div>
            <button
              onClick={() => checkConnection()}
              disabled={conn.status === 'checking'}
              className="ml-1 flex h-7 items-center gap-1 rounded-md border border-white/10 px-2 text-[9.5px] font-medium text-[#9a9ab2] transition hover:text-white disabled:opacity-50"
            >
              {conn.status === 'checking' ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <RefreshCw size={10} />
              )}
              Test
            </button>
          </div>
          <button
            onClick={() => setView('settings')}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-[10px] font-medium text-[#9a9ab2] transition hover:border-accent/30 hover:text-white"
          >
            <Cpu size={12} /> Configure
          </button>
        </div>
      </header>

      {conn.status === 'error' ? (
        <div className="flex shrink-0 items-start gap-2 border-b border-red-500/15 bg-red-500/[0.05] px-7 py-2 text-[10.5px] leading-relaxed text-red-300">
          <AlertCircle size={12} className="mt-0.5 shrink-0" />
          <span>{conn.message}</span>
          <button onClick={() => setView('settings')} className="ml-1 underline hover:text-white">
            Open settings
          </button>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[204px] shrink-0 flex-col border-r border-white/[0.07] bg-[#08080e]">
          <div className="flex shrink-0 items-center justify-between px-3 pb-2 pt-3">
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#5f5f78]">Chats</span>
            <button
              onClick={startNewChat}
              disabled={busy}
              className="flex h-6 items-center gap-1 rounded-md border border-white/10 px-1.5 text-[9.5px] font-medium text-[#9a9ab2] transition hover:border-accent/30 hover:text-white disabled:opacity-40"
            >
              <Plus size={10} /> New
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
            {aiSessions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/10 px-2.5 py-4 text-[10px] leading-relaxed text-[#5b5b72]">
                No chats yet. Describe a website and it will appear here with its own draft.
              </div>
            ) : null}
            {aiSessions.map((item) => {
              const active = item.id === activeAISessionId;
              if (renamingId === item.id) {
                return (
                  <div key={item.id} className="rounded-lg border border-accent/30 bg-accent/[0.06] p-1.5">
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') commitRename();
                        if (event.key === 'Escape') {
                          setRenamingId(null);
                          setRenameValue('');
                        }
                      }}
                      maxLength={80}
                      className="w-full rounded border border-white/10 bg-[#0b0b14] px-1.5 py-1 text-[10.5px] text-white outline-none focus:border-accent/60"
                      aria-label="Chat title"
                    />
                  </div>
                );
              }
              return (
                <div key={item.id} className="group relative">
                  <button
                    onClick={() => selectAISession(item.id)}
                    disabled={busy && !active}
                    className={cn(
                      'w-full rounded-lg border px-2.5 py-2 text-left transition disabled:opacity-40',
                      active
                        ? 'border-accent/30 bg-accent/[0.09]'
                        : 'border-transparent hover:border-white/[0.07] hover:bg-white/[0.03]'
                    )}
                  >
                    <div
                      className={cn(
                        'truncate pr-8 text-[10.5px] font-medium leading-snug',
                        active ? 'text-[#e6e0ff]' : 'text-[#b3b3c8]'
                      )}
                    >
                      {item.title}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[8.5px] text-[#5f5f78]">
                      <span>{item.project ? `${item.project.pages.length} page${item.project.pages.length === 1 ? '' : 's'}` : 'No site yet'}</span>
                      <span className="text-[#34344a]">·</span>
                      <span>{timeAgo(item.updatedAt)}</span>
                      {item.projectApplied ? <span className="ml-auto text-emerald-400/80">saved</span> : null}
                    </div>
                  </button>
                  <div className="absolute right-1 top-1.5 hidden items-center gap-0.5 rounded-md bg-[#0d0d16]/90 p-0.5 group-hover:flex">
                    <button
                      onClick={() => beginRename(item.id, item.title)}
                      aria-label={`Rename chat ${item.title}`}
                      className="flex h-5 w-5 items-center justify-center rounded text-[#77778f] transition hover:bg-white/10 hover:text-white"
                    >
                      <Pencil size={9} />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(item.id)}
                      aria-label={`Delete chat ${item.title}`}
                      className="flex h-5 w-5 items-center justify-center rounded text-[#77778f] transition hover:bg-red-500/20 hover:text-red-300"
                    >
                      <Trash2 size={9} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="shrink-0 border-t border-white/[0.06] px-3 py-2 text-[8.5px] leading-relaxed text-[#4d4d63]">
            Drafts stay in AI Studio. Open one in the editor to save it to My Projects.
          </div>
        </aside>

        <section className="flex w-[402px] shrink-0 flex-col border-r border-white/[0.07] bg-[#0a0a11]">
          <div className="flex h-[46px] shrink-0 items-center gap-2 border-b border-white/[0.06] px-4">
            <MessageSquare size={12} className="text-accent-soft" />
            <div className="min-w-0 flex-1 truncate text-[11px] font-medium text-[#d7d7e6]">
              {session?.title ?? 'New chat'}
            </div>
            <span className="rounded bg-white/[0.05] px-1.5 py-0.5 font-mono text-[8.5px] text-[#6d6d86]">
              {typed.length} msg
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {!session || (!session.project && typed.length === 0) ? (
              <div className="space-y-4">
                <div>
                  <h2 className="font-display text-[15px] font-semibold text-white">Describe a site. Then keep editing it.</h2>
                  <p className="mt-1.5 text-[10.5px] leading-relaxed text-[#6f6f88]">
                    Every chat owns one website. Follow-ups change pages, sections, copy, media and forms without
                    replacing the rest of the site.
                  </p>
                </div>
                <div className="space-y-1.5">
                  {EXAMPLES.map((example) => (
                    <button
                      key={example.label}
                      onClick={() => {
                        setPrompt(example.prompt);
                        composerRef.current?.focus();
                      }}
                      className="flex w-full items-start gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-2 text-left transition hover:border-accent/30 hover:bg-accent/[0.05]"
                    >
                      <Sparkles size={11} className="mt-0.5 shrink-0 text-accent-soft" />
                      <span>
                        <span className="block text-[10.5px] font-medium text-[#c8c8da]">{example.label}</span>
                        <span className="mt-0.5 block line-clamp-2 text-[9px] leading-relaxed text-[#66667f]">
                          {example.prompt}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {typed.map((entry) => (
                  <div key={entry.id}>
                    {entry.role === 'user' ? (
                      <div className="flex justify-end">
                        <div className="max-w-[86%] rounded-xl rounded-br-sm border border-accent/25 bg-accent/[0.12] px-3 py-2 text-[11px] leading-relaxed text-[#e3dcff] whitespace-pre-wrap">
                          {entry.content}
                        </div>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          'max-w-[92%] rounded-xl rounded-bl-sm border px-3 py-2 text-[10.5px] leading-relaxed whitespace-pre-wrap',
                          entry.kind === 'error'
                            ? 'border-red-500/20 bg-red-500/[0.05] text-red-300'
                            : entry.kind === 'result'
                            ? 'border-emerald-400/15 bg-emerald-400/[0.045] text-[#b8c9c1]'
                            : 'border-white/[0.07] bg-white/[0.025] text-[#a4a4bc]'
                        )}
                      >
                        {entry.kind === 'result' ? (
                          <span className="mb-1 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-emerald-300/80">
                            <Check size={9} /> Site updated
                          </span>
                        ) : null}
                        {entry.content}
                      </div>
                    )}
                  </div>
                ))}
                {busy ? (
                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
                    <div className="flex items-center gap-2 text-[10.5px] font-medium text-[#b8b8cc]">
                      <Loader2 size={12} className="animate-spin text-accent-soft" />
                      {mode === 'generate' ? 'Building the first version…' : 'Editing the current site…'}
                      <span className="ml-auto font-mono text-[8.5px] text-[#4f4f66]">{streamed.length} chars</span>
                    </div>
                    {mode === 'generate' && stages.length ? (
                      <div className="mt-2 space-y-1">
                        {stages.map((stage) => (
                          <div key={stage.id} className="flex items-center gap-1.5 text-[9px]">
                            {stage.status === 'done' ? (
                              <Check size={9} className="text-emerald-400" />
                            ) : stage.status === 'active' ? (
                              <Loader2 size={9} className="animate-spin text-accent-soft" />
                            ) : stage.status === 'error' ? (
                              <XCircle size={9} className="text-red-400" />
                            ) : (
                              <Circle size={9} className="text-[#3d3d54]" />
                            )}
                            <span
                              className={cn(
                                stage.status === 'active' || stage.status === 'error'
                                  ? stage.status === 'error'
                                    ? 'text-red-300'
                                    : 'text-white'
                                  : 'text-[#66667f]'
                              )}
                            >
                              {stage.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {streamed ? (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-[8.5px] text-[#5f5f78] hover:text-[#9a9ab2]">
                          Live model output
                        </summary>
                        <pre className="mt-1.5 max-h-[110px] overflow-auto whitespace-pre-wrap break-words rounded bg-[#07070c] p-2 font-mono text-[8.5px] leading-relaxed text-[#6f6f88]">
                          {streamed.slice(-2000)}
                        </pre>
                      </details>
                    ) : null}
                  </div>
                ) : null}
                <div ref={transcriptEnd} />
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-white/[0.06] px-3.5 py-3">
            {error ? (
              <div className="mb-2 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-2.5 py-2 text-[10px] leading-relaxed text-red-300">
                <div className="flex items-start gap-1.5">
                  <AlertCircle size={11} className="mt-0.5 shrink-0" />
                  <span className="min-w-0 flex-1">{error}</span>
                  <button onClick={() => setError('')} className="shrink-0 text-red-300/60 hover:text-red-200" aria-label="Dismiss error">
                    ×
                  </button>
                </div>
                {raw ? (
                  <details className="mt-1.5">
                    <summary className="cursor-pointer text-[8.5px] text-red-300/60 hover:text-red-200">
                      Show raw model response
                    </summary>
                    <pre className="mt-1 max-h-36 overflow-auto whitespace-pre-wrap break-words rounded bg-black/30 p-2 font-mono text-[8.5px] leading-relaxed text-red-200/70">
                      {raw}
                    </pre>
                  </details>
                ) : null}
              </div>
            ) : null}

            {project ? (
              <div className="mb-1.5 flex gap-1 overflow-x-auto pb-1">
                {FOLLOW_UPS.map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      setPrompt(item);
                      composerRef.current?.focus();
                    }}
                    disabled={busy}
                    className="shrink-0 rounded-md border border-white/[0.08] bg-white/[0.02] px-1.5 py-1 text-[8.5px] font-medium text-[#8b8ba4] transition hover:border-accent/30 hover:text-white disabled:opacity-40"
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="relative">
              <Textarea
                ref={composerRef}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={
                  project
                    ? 'Ask for any change — add a page, a video, a form, or restyle a section…'
                    : 'Create a modern architecture studio website with a project gallery, team section and contact form…'
                }
                className="min-h-[78px] resize-none pr-11 text-[11.5px]"
                disabled={busy}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void run();
                  }
                }}
              />
              <button
                onClick={() => void run()}
                disabled={busy || !prompt.trim()}
                aria-label={project ? 'Send edit request' : 'Generate website'}
                className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white transition hover:bg-accent-soft disabled:opacity-35"
              >
                {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              </button>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[8.5px] text-[#4f4f66]">
              <span>Enter to send · Shift+Enter for a new line</span>
              <span className="truncate">
                {project ? 'Edits the open draft' : 'Creates a new draft'} · {modelLabel || 'no model'}
              </span>
            </div>
            {settings.ai.provider === 'openai' && !apiKey ? (
              <button
                onClick={() => setView('settings')}
                className="mt-2 flex w-full items-center gap-1.5 rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-2.5 py-1.5 text-left text-[9.5px] leading-relaxed text-amber-200/80 transition hover:text-amber-100"
              >
                <AlertCircle size={11} className="shrink-0" /> No API key stored. Open Settings → AI Providers.
              </button>
            ) : null}
          </div>
        </section>

        <section className="flex min-w-0 flex-1 flex-col bg-[#07070c]">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] px-5 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/[0.05] text-[#9a9ab2]">
                <Monitor size={12} />
              </span>
              <div className="min-w-0">
                <div className="truncate text-[11.5px] font-semibold text-white">
                  {project ? project.name : 'Live preview'}
                </div>
                <div className="truncate text-[9px] text-[#61617a]">
                  {project
                    ? `${project.pages.length} page${project.pages.length === 1 ? '' : 's'} · ${
                        session?.projectApplied ? 'saved in My Projects' : 'draft, not in My Projects yet'
                      }`
                    : 'The generated website will render here'}
                </div>
              </div>
            </div>
            {project && session ? (
              <Button
                variant="primary"
                size="sm"
                icon={ArrowRight}
                onClick={() => applyAISessionProject(session.id)}
                disabled={busy}
              >
                Open in editor
              </Button>
            ) : null}
          </div>

          {project && previewPage ? (
            <>
              {project.pages.length > 1 ? (
                <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-white/[0.06] bg-ink-900/50 px-5 py-1.5">
                  {project.pages.map((page) => (
                    <button
                      key={page.id}
                      onClick={() => setPreviewPageId(page.id)}
                      className={cn(
                        'shrink-0 rounded-md px-2.5 py-1 text-[10px] font-medium transition',
                        previewPage.id === page.id
                          ? 'bg-accent/15 text-[#d4c9ff]'
                          : 'text-[#71718a] hover:bg-white/[0.05] hover:text-white'
                      )}
                    >
                      {page.name}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="checker min-h-0 flex-1 p-4">
                <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#07070c]">
                  <div className="flex h-8 shrink-0 items-center gap-1.5 border-b border-white/[0.06] bg-[#0d0d16] px-3">
                    <span className="h-2 w-2 rounded-full bg-[#ff5f57]/70" />
                    <span className="h-2 w-2 rounded-full bg-[#febc2e]/70" />
                    <span className="h-2 w-2 rounded-full bg-[#28c840]/70" />
                    <span className="ml-3 truncate rounded bg-white/[0.04] px-2 py-0.5 text-[9px] text-[#6d6d86]">
                      {previewPage.path} · {previewPage.name}
                    </span>
                    <span className="ml-auto flex items-center gap-1 text-[8.5px] text-[#4f4f66]">
                      <FileText size={9} /> {countElements(previewPage.elements)} elements
                    </span>
                  </div>
                  <iframe
                    key={previewPage.id}
                    title="Generated website preview"
                    srcDoc={previewHtml}
                    sandbox="allow-scripts allow-forms"
                    className="min-h-0 w-full flex-1 border-0"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-8 py-16">
              <div className="absolute left-1/2 top-1/3 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/[0.09] blur-[100px]" />
              <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035]">
                <Sparkles size={26} className="text-accent-soft" />
              </div>
              <h3 className="relative font-display text-[17px] font-semibold text-white">
                {busy ? 'Building your website…' : 'Your next site starts with a sentence'}
              </h3>
              <p className="relative mt-2 max-w-sm text-center text-[11px] leading-relaxed text-[#70708a]">
                {busy
                  ? 'The provider is generating a structured document. The preview updates the moment it validates.'
                  : 'Describe the site in this chat. Follow up in the same chat to change pages, content, media and forms — the site is never replaced by a follow-up.'}
              </p>
              <div className="relative mt-7 grid w-full max-w-sm grid-cols-3 gap-2">
                {[
                  { icon: Wand2, label: 'Structured edits' },
                  { icon: MessageSquare, label: 'Chat history' },
                  { icon: Monitor, label: 'Live preview' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-2 py-3 text-center"
                  >
                    <item.icon size={14} className="text-[#7f7f9c]" />
                    <span className="text-[9px] font-medium text-[#6d6d86]">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete this chat?"
        message="The conversation and its unsaved draft will be removed. Websites already opened in the editor are kept in My Projects."
        confirmLabel="Delete chat"
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (confirmDeleteId) deleteAISession(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
      />
    </div>
  );
}
