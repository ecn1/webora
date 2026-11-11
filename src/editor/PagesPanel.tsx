import React, { useState } from 'react';
import {
  Copy,
  FileText,
  Home,
  MoreHorizontal,
  Plus,
  Star,
  Trash2,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { ConfirmDialog } from '../components/ui';

export function PagesPanel() {
  const current = useStore((s) => s.current);
  const pageId = useStore((s) => s.selectedPageId);
  const setPage = useStore((s) => s.setPage);
  const addPage = useStore((s) => s.addPage);
  const renamePage = useStore((s) => s.renamePage);
  const deletePage = useStore((s) => s.deletePage);
  const duplicatePage = useStore((s) => s.duplicatePage);
  const setHomePage = useStore((s) => s.setHomePage);

  const [menuId, setMenuId] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (!current) return null;

  const commitRename = () => {
    if (renameId && renameValue.trim()) renamePage(renameId, renameValue.trim());
    setRenameId(null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5f5f78]">Pages</span>
        <button
          onClick={addPage}
          className="flex h-6 items-center gap-1 rounded-md border border-white/10 px-1.5 text-[10px] font-medium text-[#a4a4bb] transition hover:border-accent/40 hover:text-white"
        >
          <Plus size={11} /> Add
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {current.pages.map((page, index) => {
          const active = page.id === pageId;
          const isHome = index === 0 || page.path === '/';
          return (
            <div
              key={page.id}
              onClick={() => setPage(page.id)}
              className={cn(
                'group relative cursor-pointer rounded-lg border px-2.5 py-2 transition',
                active
                  ? 'border-accent/35 bg-accent/[0.1]'
                  : 'border-transparent hover:border-white/[0.07] hover:bg-white/[0.035]'
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
                    active ? 'bg-accent/20 text-accent-soft' : 'bg-white/[0.04] text-[#77778f]'
                  )}
                >
                  <FileText size={11} />
                </span>
                <div className="min-w-0 flex-1">
                  {renameId === page.id ? (
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
                      className="input h-6 px-1.5 text-[11px]"
                    />
                  ) : (
                    <div
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setRenameId(page.id);
                        setRenameValue(page.name);
                      }}
                      className="truncate text-[11.5px] font-medium text-[#dedeec]"
                    >
                      {page.name}
                    </div>
                  )}
                  <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[9px] text-[#5c5c74]">
                    <span className="truncate">{page.path}</span>
                    {isHome ? (
                      <span className="flex items-center gap-0.5 rounded bg-accent/15 px-1 text-[8px] font-semibold uppercase tracking-wide text-[#b3a1f0]">
                        <Home size={7} /> home
                      </span>
                    ) : null}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuId(menuId === page.id ? null : page.id);
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded text-[#5f5f78] opacity-0 transition hover:bg-white/[0.07] hover:text-white group-hover:opacity-100"
                >
                  <MoreHorizontal size={13} />
                </button>
              </div>

              {menuId === page.id ? (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setMenuId(null)} />
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-1.5 top-8 z-30 w-[164px] animate-pop rounded-xl border border-white/[0.09] bg-[#12121d] p-1 shadow-2xl"
                  >
                    <MenuButton
                      icon={Copy}
                      label="Duplicate page"
                      onClick={() => {
                        duplicatePage(page.id);
                        setMenuId(null);
                      }}
                    />
                    {!isHome ? (
                      <MenuButton
                        icon={Star}
                        label="Set as home"
                        onClick={() => {
                          setHomePage(page.id);
                          setMenuId(null);
                        }}
                      />
                    ) : null}
                    <div className="my-1 h-px bg-white/[0.06]" />
                    <MenuButton
                      icon={Trash2}
                      label="Delete page"
                      danger
                      onClick={() => {
                        setDeleteId(page.id);
                        setMenuId(null);
                      }}
                    />
                  </div>
                </>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="border-t border-white/[0.06] px-3 py-2 text-[9.5px] leading-relaxed text-[#4f4f66]">
        {current.pages.length} page{current.pages.length === 1 ? '' : 's'} · each exports as its own HTML file
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete page"
        message="This page and all of its elements will be removed from the project. This can be undone with Ctrl+Z."
        confirmLabel="Delete page"
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deletePage(deleteId);
        }}
      />
    </div>
  );
}

function MenuButton({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Copy;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition',
        danger
          ? 'text-red-300 hover:bg-red-500/10 hover:text-red-200'
          : 'text-[#b4b4c9] hover:bg-white/[0.06] hover:text-white'
      )}
    >
      <Icon size={12} />
      {label}
    </button>
  );
}
