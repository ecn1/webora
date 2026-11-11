import React, { useEffect, useMemo, useState } from 'react';
import {
  Film,
  FolderOpen,
  Images,
  Pencil,
  Plus,
  Search,
  Trash2,
  Type,
  Upload,
  X,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { bridge } from '../lib/bridge';
import type { Asset } from '../types';
import { cn } from '../lib/utils';
import { Button, EmptyState, Input, Modal, Select } from '../components/ui';

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function isImage(asset: Asset) {
  return asset.type.startsWith('image/');
}
function isVideo(asset: Asset) {
  return asset.type.startsWith('video/');
}
function isFont(asset: Asset) {
  return /font|woff|ttf|otf/.test(asset.type) || /\.(woff2?|ttf|otf)$/i.test(asset.name);
}

interface AssetRow {
  asset: Asset;
  projectId: string;
  projectName: string;
}

export function AssetsPage() {
  const projects = useStore((s) => s.projects);
  const current = useStore((s) => s.current);
  const addAssetsToProject = useStore((s) => s.addAssetsToProject);
  const removeAssetFromProject = useStore((s) => s.removeAssetFromProject);
  const renameAssetInProject = useStore((s) => s.renameAssetInProject);
  const setView = useStore((s) => s.setView);
  const toast = useStore((s) => s.toast);

  const activeProjects = useMemo(
    () => projects.filter((project) => !project.trashedAt),
    [projects]
  );

  const [projectId, setProjectId] = useState<string>(current?.id ?? 'all');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'images' | 'video' | 'fonts'>('all');
  const [renameKey, setRenameKey] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [preview, setPreview] = useState<AssetRow | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (projectId === 'all') return;
    if (!activeProjects.some((p) => p.id === projectId)) {
      setProjectId(current && !current.trashedAt ? current.id : 'all');
    }
  }, [activeProjects, current, projectId]);

  const project = projectId === 'all' ? null : activeProjects.find((p) => p.id === projectId) ?? null;

  const rows = useMemo(() => {
    const source = project ? [project] : activeProjects;
    return source.flatMap((owner) =>
      owner.assets.map((asset) => ({
        asset,
        projectId: owner.id,
        projectName: owner.name,
      }))
    );
  }, [project, activeProjects]);

  const filtered = useMemo(() => {
    return rows.filter(({ asset }) => {
      if (!asset.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter === 'images') return isImage(asset);
      if (filter === 'video') return isVideo(asset);
      if (filter === 'fonts') return isFont(asset);
      return true;
    });
  }, [rows, search, filter]);

  const totalSize = rows.reduce((acc, row) => acc + row.asset.size, 0);

  const importAssets = async () => {
    const target = project ?? (current && !current.trashedAt ? current : null);
    if (!target) {
      toast('Choose a project before importing assets', 'info');
      return;
    }
    setImporting(true);
    try {
      const picked = await bridge.pickAssets();
      if (picked.length) {
        await addAssetsToProject(target.id, picked);
        if (projectId === 'all') setProjectId(target.id);
      }
    } catch {
      toast('Asset import failed', 'error');
    } finally {
      setImporting(false);
    }
  };

  const commitRename = () => {
    if (renameKey && renameValue.trim()) {
      const [ownerId, assetId] = renameKey.split(':');
      renameAssetInProject(ownerId, assetId, renameValue.trim());
    }
    setRenameKey(null);
  };

  if (!activeProjects.length) {
    return (
      <div className="mx-auto w-full max-w-[1240px] px-8 pb-16 pt-7">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-medium text-[#5f5f78]">
          <span className="text-[#8c8ca6]">Workspace</span>
          <span className="text-[#33334a]">/</span>
          <span>Assets</span>
        </div>
        <h1 className="mb-6 font-display text-[26px] font-bold tracking-tight text-white">Assets</h1>
        <EmptyState
          icon={Images}
          title="No project assets yet"
          description="Assets belong to projects. Create a website first, then import images, video and fonts from your computer."
          action={
            <Button variant="primary" icon={Plus} onClick={() => setView('templates')}>
              Create a website
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1240px] px-8 pb-16 pt-7">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-medium text-[#5f5f78]">
            <span className="text-[#8c8ca6]">Workspace</span>
            <span className="text-[#33334a]">/</span>
            <span>Assets</span>
          </div>
          <h1 className="font-display text-[26px] font-bold tracking-tight text-white">Asset library</h1>
          <p className="mt-1 text-[12px] text-[#71718a]">
            {rows.length} asset{rows.length === 1 ? '' : 's'} · {formatBytes(totalSize)} ·{' '}
            {project ? `stored inside ${project.name}` : `across ${activeProjects.length} project${activeProjects.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              setRenameKey(null);
            }}
            className="h-9 w-[220px] py-0 text-[12px]"
          >
            <option value="all">All projects ({activeProjects.length})</option>
            {activeProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.assets.length})
              </option>
            ))}
          </Select>
          <Button variant="primary" icon={Upload} onClick={importAssets} loading={importing}>
            Import assets
          </Button>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-ink-900/70 p-0.5">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'images', label: 'Images' },
              { id: 'video', label: 'Video' },
              { id: 'fonts', label: 'Fonts' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={cn(
                'rounded-md px-3 py-1.5 text-[11.5px] font-medium transition',
                filter === item.id ? 'bg-white/[0.09] text-white' : 'text-[#85859e] hover:text-white'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-full sm:w-[240px]">
          <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5b5b73]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assets…"
            className="h-9 py-0 pl-8 text-[12px]"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Images}
          title={rows.length === 0 ? 'No assets yet' : 'No matching assets'}
          description={
            rows.length === 0
              ? 'Import images, SVG files, video or fonts from your computer. Assets are embedded in their project and available on every page.'
              : 'Try a different search, filter, or project.'
          }
          action={
            rows.length === 0 ? (
              <Button variant="primary" icon={Upload} onClick={importAssets} loading={importing}>
                Import assets
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setFilter('all');
                  setProjectId('all');
                }}
              >
                Clear filters
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {filtered.map((row) => {
            const { asset, projectId: ownerId, projectName } = row;
            const key = `${ownerId}:${asset.id}`;
            return (
              <div
                key={key}
                className="group overflow-hidden rounded-xl border border-white/[0.07] bg-ink-850 transition hover:border-white/15"
              >
                <button
                  onClick={() => setPreview(row)}
                  className="checker relative flex h-[136px] w-full items-center justify-center overflow-hidden"
                >
                  {isImage(asset) ? (
                    <img
                      src={asset.dataUrl}
                      alt={asset.name}
                      className="h-full w-full object-contain p-3"
                      draggable={false}
                    />
                  ) : isVideo(asset) ? (
                    <video src={asset.dataUrl} className="h-full w-full object-cover" muted />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-[#7c7c98]">
                      <Type size={28} />
                      <span className="text-[10px] uppercase tracking-wider">Font file</span>
                    </div>
                  )}
                  <span className="absolute left-2 top-2 rounded border border-white/10 bg-black/60 px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-wider text-white/70 backdrop-blur">
                    {isImage(asset) ? 'Image' : isVideo(asset) ? 'Video' : isFont(asset) ? 'Font' : 'File'}
                  </span>
                  {projectId === 'all' ? (
                    <span className="absolute bottom-2 left-2 max-w-[calc(100%-16px)] truncate rounded border border-white/10 bg-black/60 px-1.5 py-0.5 text-[8.5px] font-medium text-white/70 backdrop-blur">
                      {projectName}
                    </span>
                  ) : null}
                </button>
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    {renameKey === key ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename();
                          if (e.key === 'Escape') setRenameKey(null);
                        }}
                        className="input h-6 px-1.5 text-[11px]"
                      />
                    ) : (
                      <div className="truncate text-[11.5px] font-medium text-[#dcdcea]" title={asset.name}>
                        {asset.name}
                      </div>
                    )}
                    <div className="mt-0.5 text-[9.5px] text-[#5c5c74]">
                      {formatBytes(asset.size)}
                      {projectId === 'all' ? ` · ${projectName}` : ''}
                    </div>
                  </div>
                  <button
                    title="Rename asset"
                    onClick={() => {
                      setRenameKey(key);
                      setRenameValue(asset.name);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded text-[#68687f] opacity-0 transition hover:bg-white/[0.06] hover:text-white group-hover:opacity-100"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    title="Delete asset"
                    onClick={() => {
                      removeAssetFromProject(ownerId, asset.id);
                      toast(`Removed “${asset.name}”`, 'info');
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded text-[#68687f] opacity-0 transition hover:bg-red-500/10 hover:text-red-300 group-hover:opacity-100"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex items-start gap-2 rounded-xl border border-white/[0.06] bg-white/[0.018] px-4 py-3 text-[10.5px] leading-relaxed text-[#66667f]">
        <Film size={13} className="mt-0.5 shrink-0 text-[#7c6fc0]" />
        Assets are stored as embedded data inside each project, never uploaded anywhere. Use them from the editor's
        Assets tab or the image properties panel.
      </div>

      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.asset.name ?? 'Asset'}
        subtitle={
          preview
            ? `${preview.asset.type} · ${formatBytes(preview.asset.size)} · ${preview.projectName} · added ${new Date(
                preview.asset.createdAt
              ).toLocaleDateString()}`
            : undefined
        }
        width="max-w-3xl"
        headerRight={
          preview ? (
            <Button
              variant="ghost"
              size="sm"
              icon={X}
              onClick={() => {
                if (preview) {
                  removeAssetFromProject(preview.projectId, preview.asset.id);
                  setPreview(null);
                }
              }}
            >
              Delete
            </Button>
          ) : undefined
        }
      >
        {preview ? (
          <div className="checker flex min-h-[320px] items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] p-4">
            {isImage(preview.asset) ? (
              <img
                src={preview.asset.dataUrl}
                alt={preview.asset.name}
                className="max-h-[55vh] max-w-full object-contain"
              />
            ) : isVideo(preview.asset) ? (
              <video src={preview.asset.dataUrl} controls className="max-h-[55vh] max-w-full rounded-lg" />
            ) : (
              <div className="flex flex-col items-center gap-2 py-10 text-[#7c7c98]">
                <Type size={40} />
                <span className="text-[12px]">{preview.asset.name}</span>
                <span className="text-[10.5px] text-[#5c5c74]">Font files can be referenced from custom CSS.</span>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
