import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArchiveRestore,
  ArrowUpRight,
  Clock3,
  Copy,
  Download,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Project } from '../types';
import { ensureProjectShape } from '../lib/docEngine';
import { bridge } from '../lib/bridge';
import { cn, slugify, timeAgo, uid } from '../lib/utils';
import { SiteThumb } from '../components/SiteThumb';
import { Button, ConfirmDialog, EmptyState, Input, Select } from '../components/ui';

type SortMode = 'updated' | 'created' | 'name';

export function Projects({ onNewProject }: { onNewProject: () => void }) {
  const projects = useStore((s) => s.projects);
  const openProject = useStore((s) => s.openProject);
  const duplicateProject = useStore((s) => s.duplicateProject);
  const renameProject = useStore((s) => s.renameProject);
  const deleteProject = useStore((s) => s.deleteProject);
  const restoreProject = useStore((s) => s.restoreProject);
  const purgeProject = useStore((s) => s.purgeProject);
  const emptyTrash = useStore((s) => s.emptyTrash);
  const importProjects = useStore((s) => s.importProjects);
  const toast = useStore((s) => s.toast);
  const setView = useStore((s) => s.setView);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('updated');
  const [tab, setTab] = useState<'active' | 'trash'>('active');
  const [menuId, setMenuId] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [purgeId, setPurgeId] = useState<string | null>(null);
  const [emptyOpen, setEmptyOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!menuId) return;
    const close = () => setMenuId(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menuId]);

  const activeProjects = useMemo(() => projects.filter((project) => !project.trashedAt), [projects]);
  const trashedProjects = useMemo(() => projects.filter((project) => !!project.trashedAt), [projects]);

  const filtered = useMemo(() => {
    const source = tab === 'trash' ? trashedProjects : activeProjects;
    const list = source.filter((p) => p.name.toLowerCase().includes(search.toLowerCase().trim()));
    return [...list].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'created') return b.createdAt - a.createdAt;
      return b.updatedAt - a.updatedAt;
    });
  }, [activeProjects, trashedProjects, tab, search, sort]);

  const startRename = (project: Project) => {
    setRenameId(project.id);
    setRenameValue(project.name);
    setMenuId(null);
  };

  const commitRename = () => {
    if (renameId && renameValue.trim()) renameProject(renameId, renameValue.trim());
    setRenameId(null);
  };

  const exportProject = async (project: Project) => {
    try {
      const bytes = new TextEncoder().encode(JSON.stringify(project, null, 2));
      const result = await bridge.saveFile(`${slugify(project.name)}.webora.json`, bytes, 'json');
      if (result) toast('Project file exported', 'success');
    } catch {
      toast('Could not export the project file', 'error');
    }
    setMenuId(null);
  };

  const handleImport = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const imported: Project[] = [];
    for (const file of Array.from(files)) {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const candidates = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.projects)
          ? parsed.projects
          : [parsed];
        for (const candidate of candidates) {
          const project = ensureProjectShape(candidate);
          if (project) {
            project.id = uid('proj');
            project.createdAt = project.createdAt || Date.now();
            project.updatedAt = Date.now();
            imported.push(project);
          }
        }
      } catch {
        toast(`“${file.name}” is not a valid Webora project`, 'error');
      }
    }
    if (imported.length) importProjects(imported);
    else toast('No valid projects found in the selected file', 'error');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="mx-auto w-full max-w-[1240px] px-8 pb-16 pt-7">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-medium text-[#5f5f78]">
            <span className="text-[#8c8ca6]">Workspace</span>
            <span className="text-[#33334a]">/</span>
            <span>My Projects</span>
          </div>
          <h1 className="font-display text-[26px] font-bold tracking-tight text-white">My Projects</h1>
          <p className="mt-1 text-[12px] text-[#71718a]">
            {activeProjects.length} project{activeProjects.length === 1 ? '' : 's'} stored locally on this device
            {trashedProjects.length ? ` · ${trashedProjects.length} in Trash` : ''}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            multiple
            className="hidden"
            onChange={(e) => handleImport(e.target.files)}
          />
          <Button variant="secondary" icon={Upload} onClick={() => fileRef.current?.click()}>
            Import
          </Button>
          <Button variant="primary" icon={Plus} onClick={onNewProject}>
            New Website
          </Button>
        </div>
      </div>

      <div className="mb-5 flex items-center gap-1 border-b border-white/[0.06]">
        <button
          onClick={() => {
            setTab('active');
            setSearch('');
          }}
          className={cn(
            'relative flex h-9 items-center gap-2 px-3 text-[12px] font-medium transition',
            tab === 'active' ? 'text-white' : 'text-[#77778f] hover:text-white'
          )}
        >
          All projects
          <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] tabular-nums text-[#9a9ab2]">
            {activeProjects.length}
          </span>
          {tab === 'active' ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" /> : null}
        </button>
        <button
          onClick={() => {
            setTab('trash');
            setSearch('');
          }}
          className={cn(
            'relative flex h-9 items-center gap-2 px-3 text-[12px] font-medium transition',
            tab === 'trash' ? 'text-white' : 'text-[#77778f] hover:text-white'
          )}
        >
          Trash
          <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] tabular-nums text-[#9a9ab2]">
            {trashedProjects.length}
          </span>
          {tab === 'trash' ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" /> : null}
        </button>
        {tab === 'trash' && trashedProjects.length > 0 ? (
          <Button variant="ghost" size="sm" className="ml-auto text-red-300/80 hover:text-red-200" onClick={() => setEmptyOpen(true)}>
            Empty Trash
          </Button>
        ) : null}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[220px] flex-1 sm:max-w-[340px]">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5b5b73]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="pl-[34px]"
          />
        </div>
        <Select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          className="h-9 w-[168px] py-0 text-[12px]"
        >
          <option value="updated">Last modified</option>
          <option value="created">Date created</option>
          <option value="name">Name (A–Z)</option>
        </Select>
        <span className="ml-auto text-[11px] text-[#5f5f78]">
          {filtered.length} shown
        </span>
      </div>

      {tab === 'trash' && trashedProjects.length === 0 ? (
        <EmptyState
          icon={Trash2}
          title="Trash is empty"
          description="Deleted projects appear here. You can restore them or remove them permanently."
        />
      ) : tab === 'active' && activeProjects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Your workspace is empty"
          description="Create your first project, start from a template, or import a Webora project file."
          action={
            <div className="flex items-center gap-2">
              <Button variant="primary" icon={Plus} onClick={onNewProject}>
                Create website
              </Button>
              <Button variant="ghost" onClick={() => setView('templates')}>
                Browse templates
              </Button>
            </div>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching projects"
          description="Try a different search term or clear the search field."
          action={
            <Button variant="secondary" onClick={() => setSearch('')}>
              Clear search
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project) => (
            <div
              key={project.id}
              onClick={() => {
                if (tab === 'active' && renameId !== project.id) openProject(project.id);
              }}
              className={cn(
                'group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-ink-850 transition duration-200',
                tab === 'active'
                  ? 'cursor-pointer hover:-translate-y-0.5 hover:border-white/15 hover:shadow-panel'
                  : 'cursor-default'
              )}
            >
              <div className="relative">
                <SiteThumb project={project} className={cn('h-[164px] w-full', tab === 'trash' && 'opacity-60 saturate-50')} />
                {tab === 'active' ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 backdrop-blur-[1px] transition group-hover:opacity-100">
                    <span className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold text-[#14141f]">
                      Open in editor
                    </span>
                  </div>
                ) : (
                  <div className="absolute left-2.5 top-2.5 rounded-md border border-amber-400/25 bg-[#1a1408]/85 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-amber-200/90 backdrop-blur">
                    In Trash
                  </div>
                )}
                {tab === 'active' ? (
                  <div className="absolute right-2.5 top-2.5">
                    <button
                      aria-label="Project actions"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuId(menuId === project.id ? null : project.id);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-black/50 text-[#c7c7d8] backdrop-blur transition hover:bg-black/75 hover:text-white"
                    >
                      <MoreHorizontal size={15} />
                    </button>
                    {menuId === project.id ? (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-9 z-30 w-[176px] animate-pop overflow-hidden rounded-xl border border-white/[0.09] bg-[#12121d] p-1 shadow-2xl"
                      >
                        <MenuItem icon={ArrowUpRight} label="Open in editor" onClick={() => openProject(project.id)} />
                        <MenuItem icon={Pencil} label="Rename" onClick={() => startRename(project)} />
                        <MenuItem
                          icon={Copy}
                          label="Duplicate"
                          onClick={() => {
                            duplicateProject(project.id);
                            setMenuId(null);
                          }}
                        />
                        <MenuItem icon={Download} label="Export project file" onClick={() => exportProject(project)} />
                        <div className="my-1 h-px bg-white/[0.06]" />
                        <MenuItem
                          icon={Trash2}
                          label="Move to Trash"
                          danger
                          onClick={() => {
                            setDeleteId(project.id);
                            setMenuId(null);
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  {renameId === project.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename();
                        if (e.key === 'Escape') setRenameId(null);
                      }}
                      className="input h-7 px-2 text-[12.5px]"
                    />
                  ) : (
                    <div className="truncate text-[13px] font-semibold text-white">{project.name}</div>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-[10.5px] text-[#68687f]">
                    <span className="flex items-center gap-1">
                      <Clock3 size={10} />{' '}
                      {project.trashedAt ? `Deleted ${timeAgo(project.trashedAt)}` : timeAgo(project.updatedAt)}
                    </span>
                    <span className="text-[#34344a]">·</span>
                    <span>{project.pages.length} pages</span>
                    <span className="text-[#34344a]">·</span>
                    <span>{project.assets.length} assets</span>
                  </div>
                </div>
                {tab === 'active' ? (
                  <ArrowUpRight
                    size={16}
                    className="shrink-0 text-[#4f4f68] transition group-hover:text-accent-soft"
                  />
                ) : (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        restoreProject(project.id);
                      }}
                      className="flex h-7 items-center gap-1.5 rounded-lg border border-white/10 px-2 text-[10.5px] font-medium text-[#c7c7d8] transition hover:border-emerald-400/30 hover:bg-emerald-400/10 hover:text-emerald-200"
                    >
                      <ArchiveRestore size={12} /> Restore
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPurgeId(project.id);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-[#9a9ab2] transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
                      aria-label="Delete permanently"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Move project to Trash?"
        message={`“${projects.find((p) => p.id === deleteId)?.name ?? 'This project'}” will be moved to Trash. You can restore it later or delete it permanently.`}
        confirmLabel="Move to Trash"
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deleteProject(deleteId);
        }}
      />

      <ConfirmDialog
        open={!!purgeId}
        title="Delete permanently"
        message={`“${projects.find((p) => p.id === purgeId)?.name ?? 'This project'}” and its form responses will be removed from this computer. This cannot be undone.`}
        confirmLabel="Delete forever"
        onClose={() => setPurgeId(null)}
        onConfirm={() => {
          if (purgeId) purgeProject(purgeId);
        }}
      />

      <ConfirmDialog
        open={emptyOpen}
        title="Empty Trash"
        message={`All ${trashedProjects.length} project${trashedProjects.length === 1 ? '' : 's'} in Trash will be permanently removed, including their form responses. This cannot be undone.`}
        confirmLabel="Empty Trash"
        onClose={() => setEmptyOpen(false)}
        onConfirm={() => emptyTrash()}
      />
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium transition',
        danger
          ? 'text-red-300 hover:bg-red-500/10 hover:text-red-200'
          : 'text-[#b4b4c9] hover:bg-white/[0.06] hover:text-white'
      )}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}
