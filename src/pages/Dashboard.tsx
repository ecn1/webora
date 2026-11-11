import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
  FolderOpen,
  LayoutTemplate,
  Plus,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { timeAgo } from '../lib/utils';
import { SiteThumb } from '../components/SiteThumb';
import { TemplatePreviewModal } from '../components/TemplatePreview';
import { Button, EmptyState, WeboraMark } from '../components/ui';
import { TEMPLATES } from '../lib/templates';

export function Dashboard({ onNewProject }: { onNewProject: () => void }) {
  const projects = useStore((s) => s.projects);
  const openProject = useStore((s) => s.openProject);
  const setView = useStore((s) => s.setView);
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);

  const recent = useMemo(
    () =>
      [...projects]
        .filter((project) => !project.trashedAt)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 3),
    [projects]
  );
  const featured = TEMPLATES.slice(0, 4);
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="mx-auto w-full max-w-[1240px] px-8 pb-16 pt-7">
      <div className="flex items-center justify-between pb-5">
        <div className="flex items-center gap-2 text-[11px] font-medium text-[#5f5f78]">
          <span className="text-[#8c8ca6]">Home</span>
          <span className="text-[#33334a]">/</span>
          <span>Workspace</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-[#5f5f78]">
          <Clock3 size={12} />
          {today}
        </div>
      </div>

      <section className="relative animate-fade-up overflow-hidden rounded-[26px] border border-white/[0.07] bg-[#0a0913]">
        <div className="absolute -left-24 -top-32 h-[380px] w-[380px] rounded-full bg-accent/20 blur-[110px]" />
        <div className="absolute -bottom-40 right-10 h-[340px] w-[340px] rounded-full bg-[#4f2d9e]/30 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(124,92,255,0.08),transparent_42%)]" />

        <div className="relative grid grid-cols-1 items-center gap-8 px-9 py-10 lg:grid-cols-[1.18fr_0.82fr] lg:px-12 lg:py-12">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#bfaaff]">
              <Sparkles size={11} />
              Your creative workspace
            </div>
            <h1 className="mt-5 font-display text-[42px] font-bold leading-[1.04] tracking-[-0.035em] text-white lg:text-[48px]">
              Welcome to <span className="gradient-text">Webora</span>
              <span className="text-accent-soft">.</span>
            </h1>
            <p className="mt-4 max-w-[520px] text-[14px] leading-relaxed text-[#9292ad]">
              Design, generate and ship complete websites. Describe an idea to the AI, refine it on the canvas,
              then export a production-ready site — all from your desktop.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-2.5">
              <Button variant="primary" size="lg" icon={Plus} onClick={onNewProject}>
                Create New Website
              </Button>
              <Button variant="secondary" size="lg" icon={LayoutTemplate} onClick={() => setView('templates')}>
                Browse Templates
              </Button>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10.5px] text-[#63637c]">
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-accent-soft" /> AI generation built in
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-accent-soft" /> Local-first storage
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-accent-soft" /> Export clean HTML, CSS &amp; JS
              </span>
            </div>
          </div>

          <div className="relative hidden h-[240px] lg:block">
            <div className="absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.05]" />
            <div className="absolute left-1/2 top-1/2 h-[196px] w-[196px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.07]" />
            <div className="absolute left-1/2 top-1/2 h-[110px] w-[110px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-2xl" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-float">
              <WeboraMark size={88} glow />
            </div>
            <div className="absolute right-2 top-2 rounded-xl border border-white/10 bg-[#0f0e1b]/90 px-3 py-2 shadow-panel backdrop-blur">
              <div className="flex items-center gap-1.5 text-[10px] text-[#9b8ae0]">
                <Wand2 size={11} /> AI WEBSITE ENGINE
              </div>
              <div className="mt-1 text-[11px] font-medium text-white">Prompt → full project</div>
            </div>
            <div className="absolute bottom-1 left-0 rounded-xl border border-white/10 bg-[#0f0e1b]/90 px-3 py-2 shadow-panel backdrop-blur">
              <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#5f5f7a]">Canvas</div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live editing
              </div>
            </div>
            <div className="absolute -bottom-2 right-8 rounded-xl border border-white/10 bg-[#0f0e1b]/90 px-3 py-2 shadow-panel backdrop-blur">
              <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#5f5f7a]">Output</div>
              <div className="mt-1 text-[11px] font-medium text-white">Standalone ZIP</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="font-display text-[17px] font-semibold tracking-tight text-white">Recent projects</h2>
            <p className="mt-0.5 text-[11.5px] text-[#66667f]">Jump back into what you were building.</p>
          </div>
          <button
            onClick={() => setView('projects')}
            className="flex items-center gap-1 text-[11.5px] font-medium text-[#8d8da7] transition hover:text-white"
          >
            View all <ArrowRight size={13} />
          </button>
        </div>

        {recent.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No projects yet"
            description="Create a blank canvas, start from a template, or generate a complete website with AI."
            action={
              <div className="flex items-center gap-2">
                <Button variant="primary" icon={Plus} onClick={onNewProject}>
                  Create project
                </Button>
                <Button variant="ghost" icon={Sparkles} onClick={() => setView('aistudio')}>
                  Try AI Studio
                </Button>
              </div>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {recent.map((project) => (
              <button
                key={project.id}
                onClick={() => openProject(project.id)}
                className="group overflow-hidden rounded-2xl border border-white/[0.07] bg-ink-850 text-left transition duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:shadow-panel"
              >
                <div className="relative">
                  <SiteThumb project={project} className="h-[148px] w-full" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 backdrop-blur-[1px] transition group-hover:opacity-100">
                    <span className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold text-[#14141f]">
                      Open in editor
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-white">{project.name}</div>
                    <div className="mt-1 flex items-center gap-2 text-[10.5px] text-[#68687f]">
                      <span>{timeAgo(project.updatedAt)}</span>
                      <span className="text-[#34344a]">·</span>
                      <span>
                        {project.pages.length} page{project.pages.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                  <ArrowUpRight
                    size={16}
                    className="shrink-0 text-[#4f4f68] transition group-hover:text-accent-soft"
                  />
                </div>
              </button>
            ))}
            <button
              onClick={onNewProject}
              className="flex min-h-[208px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.012] text-[#63637d] transition hover:border-accent/40 hover:bg-accent/[0.03] hover:text-[#b8a8e8]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                <Plus size={16} />
              </span>
              <span className="text-[12px] font-medium">New website</span>
            </button>
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="font-display text-[17px] font-semibold tracking-tight text-white">Start from a template</h2>
            <p className="mt-0.5 text-[11.5px] text-[#66667f]">Real, editable projects — not screenshots.</p>
          </div>
          <button
            onClick={() => setView('templates')}
            className="flex items-center gap-1 text-[11.5px] font-medium text-[#8d8da7] transition hover:text-white"
          >
            All templates <ArrowRight size={13} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {featured.map((template) => (
            <button
              key={template.id}
              onClick={() => setPreviewTemplate(template.id)}
              className="group overflow-hidden rounded-2xl border border-white/[0.07] bg-ink-850 text-left transition duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:shadow-panel"
            >
              <div className="relative h-[112px] overflow-hidden" style={{ background: template.gradient }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,rgba(255,255,255,.22)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.22)_1px,transparent_1px)] [background-size:26px_26px]" />
                <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/25 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-white/85 backdrop-blur">
                  {template.category}
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
                  <span className="rounded-lg bg-white px-2.5 py-1 text-[10.5px] font-semibold text-[#12121c]">
                    Preview
                  </span>
                </div>
                <div className="absolute -bottom-6 left-5 h-16 w-[64%] rounded-t-md border border-white/20 bg-black/25 backdrop-blur-sm" />
                <div className="absolute -bottom-2 left-8 h-10 w-[42%] rounded-t-md border border-white/25 bg-white/15 backdrop-blur" />
              </div>
              <div className="px-4 py-3">
                <div className="text-[12.5px] font-semibold text-white">{template.name}</div>
                <div className="mt-0.5 line-clamp-1 text-[10.5px] text-[#66667f]">{template.description}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="mt-10 flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.018] px-5 py-3.5">
        <div className="flex items-center gap-2 text-[11.5px] text-[#6d6d86]">
          <Wand2 size={14} className="text-accent-soft" />
          Have an idea? Describe it in AI Studio and Webora will build the first draft.
        </div>
        <button
          onClick={() => setView('aistudio')}
          className="flex items-center gap-1 text-[11.5px] font-semibold text-[#b9a9ea] transition hover:text-white"
        >
          Open AI Studio <ArrowRight size={13} />
        </button>
      </div>

      <TemplatePreviewModal templateId={previewTemplate} onClose={() => setPreviewTemplate(null)} />
    </div>
  );
}
