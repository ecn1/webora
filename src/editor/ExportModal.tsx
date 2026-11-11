import React, { useMemo, useState } from 'react';
import JSZip from 'jszip';
import {
  Archive,
  Check,
  FileCode2,
  FileJson,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Package,
  Plus,
  X,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { generateExport, generatePageHtml } from '../lib/codegen';
import { bridge } from '../lib/bridge';
import { cn, slugify } from '../lib/utils';
import { Button, Toggle } from '../components/ui';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function ExportModal() {
  const current = useStore((s) => s.current);
  const setUI = useStore((s) => s.setUI);
  const toast = useStore((s) => s.toast);

  const [includeAssets, setIncludeAssets] = useState(true);
  const [includeProject, setIncludeProject] = useState(true);
  const [minify, setMinify] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savedPath, setSavedPath] = useState<string | null>(null);

  const files = useMemo(
    () =>
      current
        ? generateExport(current, { includeAssets, includeProject, minify })
        : [],
    [current, includeAssets, includeProject, minify]
  );

  const totalBytes = useMemo(
    () =>
      files.reduce(
        (acc, file) =>
          acc + (typeof file.content === 'string' ? new TextEncoder().encode(file.content).length : file.content.length),
        0
      ),
    [files]
  );

  if (!current) return null;

  const close = () => setUI({ exportOpen: false });

  const doExport = async () => {
    setBusy(true);
    setSavedPath(null);
    try {
      const zip = new JSZip();
      for (const file of files) {
        zip.file(file.path, file.content);
      }
      const data = await zip.generateAsync({
        type: 'uint8array',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });
      const result = await bridge.saveZip(`${slugify(current.name)}.zip`, data);
      if (result) {
        setSavedPath(result);
        toast('Website exported as a ZIP', 'success');
      } else {
        toast('Export cancelled', 'info');
      }
    } catch (err: any) {
      toast(err?.message || 'Export failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const exportStandalone = async () => {
    const page = current.pages[0];
    if (!page) return;
    try {
      const html = generatePageHtml(current, page, { inline: true });
      const bytes = new TextEncoder().encode(html);
      const result = await bridge.saveFile(`${slugify(current.name)}.html`, bytes, 'html');
      if (result) toast('Standalone HTML saved', 'success');
    } catch {
      toast('Could not save the HTML file', 'error');
    }
  };

  const groups = useMemo(() => {
    const map = new Map<string, typeof files>();
    for (const file of files) {
      const parts = file.path.split('/');
      const key = parts.length > 1 ? parts[0] : 'root';
      const list = map.get(key) ?? [];
      list.push(file);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [files]);

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-6">
      <div className="absolute inset-0 animate-fade bg-black/75 backdrop-blur-[6px]" onClick={close} />
      <div className="relative flex max-h-[90vh] w-full max-w-4xl animate-pop flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-ink-850 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]">
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-6 py-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent-soft">
              <Package size={17} />
            </span>
            <div>
              <h2 className="font-display text-[16px] font-semibold tracking-tight text-white">Export website</h2>
              <p className="mt-1 text-[11.5px] text-[#7f7f98]">
                A self-contained ZIP with static HTML, CSS, JavaScript and your assets.
              </p>
            </div>
          </div>
          <button
            onClick={close}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7d7d96] transition hover:bg-white/[0.06] hover:text-white"
            aria-label="Close export"
          >
            <X size={15} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:grid-cols-[300px_minmax(0,1fr)]">
          <div className="space-y-4 border-b border-white/[0.06] p-5 md:border-b-0 md:border-r">
            <div>
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#66667f]">
                Export options
              </h3>
              <div className="mt-3 space-y-3">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <Toggle
                    checked={includeAssets}
                    onChange={setIncludeAssets}
                    label="Include assets"
                    description="Copies images, video and fonts into /assets and rewrites references."
                  />
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <Toggle
                    checked={includeProject}
                    onChange={setIncludeProject}
                    label="Include project.json"
                    description="Keeps the editable document so the site can be re-imported into Webora."
                  />
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <Toggle
                    checked={minify}
                    onChange={setMinify}
                    label="Minify CSS & HTML"
                    description="Slightly smaller files. Structure and formatting are preserved in JavaScript."
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
              <div className="flex items-center justify-between text-[10px] text-[#6d6d86]">
                <span>Pages</span>
                <span className="font-mono text-[#c2b5ef]">{current.pages.length}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#6d6d86]">
                <span>Assets</span>
                <span className="font-mono text-[#c2b5ef]">{includeAssets ? current.assets.length : 0}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#6d6d86]">
                <span>Uncompressed size</span>
                <span className="font-mono text-[#c2b5ef]">{formatBytes(totalBytes)}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#6d6d86]">
                <span>Format</span>
                <span className="font-mono text-[#c2b5ef]">.zip</span>
              </div>
            </div>

            <div className="rounded-xl border border-accent/20 bg-accent/[0.05] p-3 text-[10px] leading-relaxed text-[#8f83b5]">
              Open <span className="font-mono text-[#c9baff]">index.html</span> after unzipping, or upload the extracted
              folder to any static host.
            </div>
          </div>

          <div className="flex min-h-0 flex-col p-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#66667f]">
                Package contents
              </h3>
              <span className="text-[10px] text-[#5c5c74]">{files.length} files</span>
            </div>

            <div className="min-h-[220px] flex-1 overflow-y-auto rounded-xl border border-white/[0.07] bg-[#08080e]">
              {groups.map(([folder, list]) => (
                <div key={folder} className="border-b border-white/[0.04] last:border-0">
                  <div className="flex items-center gap-1.5 bg-white/[0.02] px-3 py-1.5 text-[10px] font-medium text-[#8b8ba4]">
                    <FolderOpen size={11} className="text-[#6f6f95]" />
                    {folder === 'root' ? 'Web root' : `${folder}/`}
                  </div>
                  {list.map((file) => {
                    const name = folder === 'root' ? file.path : file.path.split('/').slice(1).join('/');
                    const isJson = file.path.endsWith('.json');
                    const isHtml = file.path.endsWith('.html');
                    const Icon = isJson ? FileJson : isHtml ? FileCode2 : file.path.startsWith('assets/') ? ImageIcon : FileText;
                    const size =
                      typeof file.content === 'string'
                        ? new TextEncoder().encode(file.content).length
                        : file.content.length;
                    return (
                      <div key={file.path} className="flex items-center gap-2 px-3 py-1.5 text-[10.5px]">
                        <Icon size={11} className="shrink-0 text-[#5f5f7a]" />
                        <span className="min-w-0 flex-1 truncate font-mono text-[#a9a9c0]">{name}</span>
                        <span className="shrink-0 font-mono text-[9px] text-[#4f4f66]">{formatBytes(size)}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {savedPath ? (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2.5">
                <Check size={13} className="mt-0.5 shrink-0 text-emerald-400" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10.5px] font-medium text-emerald-300">Export saved</div>
                  <div className="mt-0.5 truncate font-mono text-[9.5px] text-emerald-200/60">{savedPath}</div>
                </div>
                {bridge.isDesktop ? (
                  <button
                    onClick={() => void bridge.openPath(savedPath).catch(() => toast('Could not open the folder', 'error'))}
                    className="shrink-0 rounded border border-emerald-400/25 px-1.5 py-0.5 text-[9.5px] font-medium text-emerald-300 hover:bg-emerald-400/10"
                  >
                    Show folder
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] bg-ink-900/60 px-6 py-4">
          <div className="flex items-center gap-1.5 text-[10px] text-[#5f5f78]">
            <Archive size={12} />
            {current.pages.length} page{current.pages.length === 1 ? '' : 's'} · static output · no server required
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={exportStandalone} icon={Plus}>
              Single HTML
            </Button>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button variant="primary" icon={Archive} loading={busy} onClick={doExport} disabled={busy || files.length === 0}>
              Export ZIP
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
