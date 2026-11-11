import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  ImagePlus,
  Images,
  Trash2,
  Upload,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { bridge } from '../lib/bridge';
import { CONTAINER_TYPES, createElement, findElement } from '../lib/docEngine';
import { cn } from '../lib/utils';
import { Button } from '../components/ui';

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function EditorAssetsPanel() {
  const current = useStore((s) => s.current);
  const pageId = useStore((s) => s.selectedPageId);
  const selectedId = useStore((s) => s.selectedId);
  const addAssets = useStore((s) => s.addAssets);
  const removeAsset = useStore((s) => s.removeAsset);
  const addElementObject = useStore((s) => s.addElementObject);
  const setView = useStore((s) => s.setView);
  const toast = useStore((s) => s.toast);

  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<'all' | 'images' | 'other'>('all');

  const assets = current?.assets ?? [];
  const images = useMemo(
    () => assets.filter((asset) => asset.type.startsWith('image/')),
    [assets]
  );
  const shown = useMemo(() => {
    if (filter === 'images') return images;
    if (filter === 'other') return assets.filter((a) => !a.type.startsWith('image/'));
    return assets;
  }, [assets, images, filter]);

  const pick = async () => {
    setBusy(true);
    try {
      const picked = await bridge.pickAssets();
      if (picked.length) await addAssets(picked);
    } catch {
      toast('Could not import those files', 'error');
    } finally {
      setBusy(false);
    }
  };

  const insertImage = (dataUrl: string, name: string) => {
    const page = current?.pages.find((p) => p.id === pageId);
    let parentId: string | null = null;
    if (page && selectedId) {
      const found = findElement(page.elements, selectedId);
      if (found && CONTAINER_TYPES.includes(found.el.type)) parentId = selectedId;
    }
    addElementObject(
      createElement('image', {
        name: name.replace(/\.[a-z0-9]+$/i, ''),
        props: { src: dataUrl, alt: name },
        style: {
          width: '100%',
          'max-width': '100%',
          'border-radius': '12px',
          display: 'block',
          height: 'auto',
        },
      }),
      parentId
    );
    toast('Image placed on the canvas', 'success');
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-white/[0.06] px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5f5f78]">Assets</span>
          <button
            onClick={pick}
            disabled={busy}
            className="flex h-6 items-center gap-1 rounded-md border border-white/10 px-1.5 text-[10px] font-medium text-[#a4a4bb] transition hover:border-accent/40 hover:text-white disabled:opacity-50"
          >
            <Upload size={11} /> Import
          </button>
        </div>
        <div className="mt-2 flex items-center gap-1 rounded-lg border border-white/10 bg-ink-900/70 p-0.5">
          {(
            [
              ['all', 'All', assets.length],
              ['images', 'Images', images.length],
              ['other', 'Other', assets.length - images.length],
            ] as const
          ).map(([id, label, count]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition',
                filter === id ? 'bg-white/[0.08] text-white' : 'text-[#7d7d96] hover:text-white'
              )}
            >
              {label}
              <span className="font-mono text-[8.5px] text-[#55556c]">{count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
        {shown.length === 0 ? (
          <div className="flex flex-col items-center px-3 py-10 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-[#6f6f8b]">
              <Images size={17} />
            </span>
            <div className="mt-3 text-[11px] font-medium text-[#b0b0c6]">
              {assets.length === 0 ? 'No assets yet' : 'Nothing in this filter'}
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-[#5c5c74]">
              Import images, video or fonts. They embed inside this project and export with the site.
            </p>
            <Button variant="secondary" size="sm" icon={Upload} onClick={pick} loading={busy} className="mt-3">
              Import files
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {shown.map((asset) => {
              const isImage = asset.type.startsWith('image/');
              return (
                <div
                  key={asset.id}
                  className="group overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.025] transition hover:border-accent/30"
                >
                  <div className="checker relative flex h-[68px] items-center justify-center overflow-hidden">
                    {isImage ? (
                      <img
                        src={asset.dataUrl}
                        alt={asset.name}
                        className="h-full w-full object-cover"
                        draggable={false}
                      />
                    ) : (
                      <span className="px-1 text-center text-[8.5px] uppercase tracking-wider text-[#7c7c98]">
                        {asset.type.split('/')[0] || 'file'}
                      </span>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/55 opacity-0 transition group-hover:opacity-100">
                      {isImage ? (
                        <button
                          onClick={() => insertImage(asset.dataUrl, asset.name)}
                          title="Insert into page"
                          className="flex h-6 items-center gap-1 rounded bg-white px-1.5 text-[9px] font-semibold text-[#12121c] hover:bg-[#ddd]"
                        >
                          <ImagePlus size={10} /> Insert
                        </button>
                      ) : null}
                      <button
                        onClick={() => removeAsset(asset.id)}
                        title="Delete asset"
                        className="flex h-6 w-6 items-center justify-center rounded bg-black/60 text-red-300 hover:bg-red-500/30"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                  <div className="px-1.5 py-1">
                    <div className="truncate text-[9.5px] font-medium text-[#c2c2d6]" title={asset.name}>
                      {asset.name}
                    </div>
                    <div className="text-[8.5px] text-[#515168]">{formatBytes(asset.size)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        onClick={() => setView('assets')}
        className="flex items-center justify-between border-t border-white/[0.06] px-3 py-2.5 text-[10px] font-medium text-[#7d7d96] transition hover:text-white"
      >
        Open full asset library
        <ArrowUpRight size={11} />
      </button>
    </div>
  );
}
