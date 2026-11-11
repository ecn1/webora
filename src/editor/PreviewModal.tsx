import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Clipboard,
  ExternalLink,
  Monitor,
  RefreshCw,
  Save,
  Smartphone,
  Tablet,
  X,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { generatePageHtml } from '../lib/codegen';
import { bridge } from '../lib/bridge';
import { cn, slugify } from '../lib/utils';
import { Button } from '../components/ui';
import type { FormSubmission } from '../types';

type Device = 'desktop' | 'tablet' | 'mobile';

const WIDTHS: Record<Device, number | null> = { desktop: null, tablet: 834, mobile: 390 };

function newToken() {
  return `wprev-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function normalizeTarget(target: string): string {
  const normalized = target
    .trim()
    .replace(/^#\/?/, '/')
    .split('#')[0]
    .split('?')[0]
    .replace(/^\.\//, '')
    .replace(/\.html$/i, '')
    .replace(/\/+$/, '')
    .toLowerCase();
  // Root must stay "/" — an empty string makes every path end with it.
  return normalized === '' ? '/' : normalized;
}

export function PreviewModal() {
  const current = useStore((s) => s.current);
  const selectedPageId = useStore((s) => s.selectedPageId);
  const setUI = useStore((s) => s.setUI);
  const toast = useStore((s) => s.toast);
  const addSubmission = useStore((s) => s.addSubmission);

  const [pageId, setPageId] = useState(selectedPageId ?? current?.pages[0]?.id ?? '');
  const [device, setDevice] = useState<Device>('desktop');
  const [nonce, setNonce] = useState(0);
  const [copied, setCopied] = useState(false);
  const [token] = useState(newToken);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const page = current?.pages.find((p) => p.id === pageId) ?? current?.pages[0] ?? null;
  const html = useMemo(
    () => (current && page ? generatePageHtml(current, page, { inline: true, mode: 'preview', token }) : ''),
    [current, page, token]
  );

  const resolvePage = (target: string) => {
    if (!current) return null;
    const raw = (target || '').trim();
    if (!raw || /^(https?:|mailto:|tel:)/i.test(raw)) return null;
    const normalized = normalizeTarget(raw);
    const wantsHome = normalized === '/' || normalized === 'index';
    const find = current.pages.find((candidate) => {
      const path = normalizeTarget(candidate.path || '/');
      const nameSlug = normalizeTarget(`/${slugify(candidate.name)}`);
      return (
        (wantsHome && path === '/') ||
        path === normalized ||
        nameSlug === normalized ||
        (path !== '/' && normalized !== '/' && normalized.endsWith(path))
      );
    });
    return find ?? null;
  };

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as
        | {
            source?: string;
            token?: string;
            type?: string;
            payload?: Record<string, unknown>;
          }
        | null;
      if (!data || data.source !== 'webora-preview' || data.token !== token) return;

      if (data.type === 'navigate') {
        const target = String(data.payload?.target ?? '');
        const nextPage = resolvePage(target);
        if (nextPage) {
          setPageId(nextPage.id);
          if (iframeRef.current) iframeRef.current.scrollTop = 0;
        } else {
          toast(`No page matches “${target}”. Add that page or use a full https:// URL.`, 'error');
        }
        return;
      }

      if (data.type === 'open-external') {
        const url = String(data.payload?.url ?? '');
        if (!url) return;
        if (bridge.isDesktop && bridge.openExternal) {
          void bridge.openExternal(url).catch(() => toast('Could not open that link.', 'error'));
        } else if (/^(mailto:|tel:)/i.test(url)) {
          window.location.href = url;
        } else {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
        return;
      }

      if (data.type === 'form-submit' && current) {
        const payload = data.payload ?? {};
        const submission: Omit<FormSubmission, 'id' | 'submittedAt'> = {
          formId: String(payload.formId ?? ''),
          formName: String(payload.formName ?? 'Form'),
          pageId: String(payload.pageId ?? page?.id ?? ''),
          pageName: String(payload.pageName ?? page?.name ?? 'Page'),
          respondentName: String(payload.respondentName ?? ''),
          respondentEmail: String(payload.respondentEmail ?? ''),
          values: Array.isArray(payload.values)
            ? (payload.values as Array<{ label?: unknown; value?: unknown }>).map((item) => ({
                label: String(item.label ?? 'Field'),
                value: String(item.value ?? ''),
              }))
            : [],
        };
        addSubmission(current.id, submission);
        toast(`New response saved to Forms · ${submission.formName}`, 'success');
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [current, page, token, addSubmission, toast]);

  if (!current || !page) return null;

  const close = () => setUI({ previewOpen: false });

  const copyHtml = async () => {
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast('Standalone HTML copied to clipboard', 'success');
    } catch {
      toast('Could not access the clipboard', 'error');
    }
  };

  const saveHtml = async () => {
    try {
      const bytes = new TextEncoder().encode(
        generatePageHtml(current, page, { inline: true, mode: 'export' })
      );
      const name = `${slugify(page.name === 'Home' ? current.name : page.name)}.html`;
      const result = await bridge.saveFile(name, bytes, 'html');
      if (result) toast('Page HTML saved', 'success');
    } catch {
      toast('Could not save the HTML file', 'error');
    }
  };

  const width = WIDTHS[device];

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-[#07070b]">
      <header className="flex h-[52px] shrink-0 items-center gap-3 border-b border-white/[0.07] bg-[#0a0a11] px-4">
        <button
          onClick={close}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9a9ab2] transition hover:bg-white/[0.06] hover:text-white"
          aria-label="Close preview"
        >
          <X size={16} />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11.5px] font-semibold text-white">
            Live preview
            <span className="rounded border border-emerald-400/20 bg-emerald-400/10 px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-wider text-emerald-300">
              interactive
            </span>
          </div>
          <div className="truncate text-[9.5px] text-[#5f5f78]">
            {current.name} · {page.name} · links, forms and media work here before export
          </div>
        </div>

        <div className="mx-auto flex items-center gap-1 rounded-lg border border-white/10 bg-ink-900/70 p-0.5">
          {(
            [
              { id: 'desktop' as Device, icon: Monitor, label: 'Desktop' },
              { id: 'tablet' as Device, icon: Tablet, label: 'Tablet' },
              { id: 'mobile' as Device, icon: Smartphone, label: 'Mobile' },
            ]
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setDevice(item.id)}
              title={item.label}
              className={cn(
                'flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[10.5px] font-medium transition',
                device === item.id ? 'bg-white/[0.09] text-white' : 'text-[#7d7d96] hover:text-white'
              )}
            >
              <item.icon size={12} />
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {current.pages.length > 1 ? (
            <select
              value={page.id}
              onChange={(e) => setPageId(e.target.value)}
              className="h-8 rounded-lg border border-white/10 bg-ink-900/80 px-2 text-[11px] text-[#d2d2e2] outline-none"
            >
              {current.pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          ) : null}
          <Button variant="ghost" size="sm" icon={RefreshCw} onClick={() => setNonce((n) => n + 1)}>
            Reload
          </Button>
          <Button variant="ghost" size="sm" icon={Save} onClick={saveHtml}>
            Save HTML
          </Button>
          <Button variant="secondary" size="sm" icon={copied ? Check : Clipboard} onClick={copyHtml}>
            {copied ? 'Copied' : 'Copy HTML'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={ExternalLink}
            onClick={() => {
              const win = window.open('', '_blank');
              if (win) {
                win.document.open();
                win.document.write(html);
                win.document.close();
                toast('Preview opened in a new window', 'success');
              } else {
                toast('The browser blocked the new window', 'error');
              }
            }}
            className={bridge.isDesktop ? 'hidden' : undefined}
          >
            Open window
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden dotgrid">
        <div className="flex h-full min-h-0 justify-center p-6">
          <div
            className="relative flex h-full min-h-0 flex-col transition-[width] duration-300"
            style={{ width: width ?? '100%', maxWidth: width ? undefined : 1440 }}
          >
            <div className="mb-2 flex items-center justify-between px-1 text-[9px] text-[#4f4f66]">
              <span className="font-mono">
                {page.path === '/' ? 'index.html' : `${page.path.replace(/^\//, '')}.html`}
              </span>
              <span>{width ? `${width}px viewport` : 'Responsive desktop viewport'}</span>
            </div>
            <div
              className={cn(
                'relative min-h-0 flex-1 overflow-hidden bg-[#0a0a12] shadow-[0_30px_90px_-25px_rgba(0,0,0,0.9)]',
                width ? 'rounded-[28px] border-[7px] border-[#1a1a27]' : 'rounded-xl border border-white/[0.08]'
              )}
            >
              <iframe
                ref={iframeRef}
                key={`${page.id}:${device}:${nonce}`}
                title={`${page.name} preview`}
                srcDoc={html}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-downloads"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write"
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
