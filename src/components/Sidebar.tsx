import React, { useEffect, useState } from 'react';
import {
  ClipboardList,
  FolderOpen,
  Home,
  Images,
  LayoutTemplate,
  Plus,
  Settings,
  Sparkles,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { bridge } from '../lib/bridge';
import { useStore } from '../store/useStore';
import type { View } from '../types';
import { WeboraMark } from './ui';

const NAV: Array<{ id: View; label: string; icon: typeof Home }> = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'projects', label: 'My Projects', icon: FolderOpen },
  { id: 'templates', label: 'Templates', icon: LayoutTemplate },
  { id: 'aistudio', label: 'AI Studio', icon: Sparkles },
  { id: 'assets', label: 'Assets', icon: Images },
  { id: 'forms', label: 'Forms', icon: ClipboardList },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({
  onNewProject,
}: {
  onNewProject: () => void;
}) {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const projects = useStore((s) => s.projects);
  const ready = useStore((s) => s.ready);
  const [version, setVersion] = useState('1.2.0');

  useEffect(() => {
    let alive = true;
    bridge
      .appInfo()
      .then((info) => {
        if (alive && info?.version) setVersion(info.version);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const activeProjects = projects.filter((project) => !project.trashedAt);
  const responseCount = activeProjects.reduce(
    (total, project) => total + (project.submissions?.length ?? 0),
    0
  );

  return (
    <aside className="flex h-full w-[236px] shrink-0 flex-col border-r border-white/[0.06] bg-[#08080e]">
      <div className="flex items-center gap-2.5 px-5 pb-5 pt-5">
        <WeboraMark size={32} />
        <div className="min-w-0">
          <div className="font-display text-[16px] font-bold leading-none tracking-tight text-white">Webora</div>
          <div className="mt-1 text-[8.5px] font-semibold uppercase tracking-[0.22em] text-[#5b5b74]">
            AI Website Builder
          </div>
        </div>
      </div>

      <div className="px-3">
        <button
          onClick={onNewProject}
          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-deep via-accent to-[#9b7bff] px-3 py-2.5 text-[12.5px] font-semibold text-white shadow-[0_10px_30px_-14px_rgba(124,92,255,0.95)] transition hover:brightness-110"
        >
          <Plus size={15} />
          New Website
        </button>
      </div>

      <div className="mt-6 px-3">
        <div className="px-2 pb-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#4e4e66]">
          Workspace
        </div>
        <nav className="space-y-0.5">
          {NAV.map((item) => {
            const active = view === item.id;
            const badge =
              item.id === 'projects'
                ? activeProjects.length
                : item.id === 'forms'
                ? responseCount
                : 0;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={cn('nav-item', active && 'nav-item-active')}
              >
                <item.icon size={16} className={active ? 'text-accent-soft' : 'text-[#77778f]'} />
                <span className="flex-1 text-left">{item.label}</span>
                {ready && badge > 0 ? (
                  <span
                    className={cn(
                      'rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                      active ? 'bg-accent/25 text-white' : 'bg-white/[0.05] text-[#7b7b93]'
                    )}
                  >
                    {badge}
                  </span>
                ) : null}
                {active ? <span className="h-1.5 w-1.5 rounded-full bg-accent-soft" /> : null}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex-1" />

      <div className="px-3 pb-3">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[11.5px] font-medium text-[#cfcfe0]">Local workspace</span>
          </div>
          <p className="mt-1.5 text-[10.5px] leading-relaxed text-[#68687f]">
            Projects and keys stay on this device.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/[0.05] px-5 py-3">
        <span className="text-[10px] font-medium text-[#4f4f66]">Webora {version}</span>
        <span className="rounded-md border border-white/[0.06] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#5b5b73]">
          Desktop
        </span>
      </div>
    </aside>
  );
}
