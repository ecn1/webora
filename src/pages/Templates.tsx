import React, { useMemo, useState } from 'react';
import { LayoutTemplate, Plus, Search, Sparkles } from 'lucide-react';
import { TEMPLATES } from '../lib/templates';
import { TemplatePreviewModal } from '../components/TemplatePreview';
import { Button, EmptyState, Input } from '../components/ui';
import { cn } from '../lib/utils';

export function Templates({ onNewProject }: { onNewProject: () => void }) {
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);

  const categories = useMemo(() => ['All', ...Array.from(new Set(TEMPLATES.map((t) => t.category)))], []);

  const filtered = useMemo(
    () =>
      TEMPLATES.filter(
        (t) =>
          (category === 'All' || t.category === category) &&
          (t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.description.toLowerCase().includes(search.toLowerCase()) ||
            t.category.toLowerCase().includes(search.toLowerCase()))
      ),
    [category, search]
  );

  return (
    <div className="mx-auto w-full max-w-[1240px] px-8 pb-16 pt-7">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-medium text-[#5f5f78]">
            <span className="text-[#8c8ca6]">Workspace</span>
            <span className="text-[#33334a]">/</span>
            <span>Templates</span>
          </div>
          <h1 className="font-display text-[26px] font-bold tracking-tight text-white">Template library</h1>
          <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-[#71718a]">
            Every template is a complete, editable Webora project. Preview it live, then make it yours.
          </p>
        </div>
        <Button variant="secondary" icon={Plus} onClick={onNewProject}>
          Blank project
        </Button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2.5">
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-[11.5px] font-medium transition',
                category === cat
                  ? 'border-accent/40 bg-accent/[0.12] text-[#d3c7ff]'
                  : 'border-white/[0.07] bg-white/[0.02] text-[#8b8ba4] hover:border-white/15 hover:text-white'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-full sm:w-[230px]">
          <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5b5b73]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates…"
            className="h-9 py-0 pl-8 text-[12px]"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No templates match"
          description="Try another category or search term. You can also create a blank project and design it yourself."
          action={
            <Button variant="secondary" onClick={onNewProject}>
              Create blank project
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((template) => (
            <button
              key={template.id}
              onClick={() => setPreviewId(template.id)}
              className="group overflow-hidden rounded-2xl border border-white/[0.07] bg-ink-850 text-left transition duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:shadow-panel"
            >
              <div className="relative h-[172px] overflow-hidden" style={{ background: template.gradient }}>
                <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_0%,rgba(255,255,255,0.18),transparent_60%)]" />
                <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(to_right,rgba(255,255,255,.25)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.25)_1px,transparent_1px)] [background-size:28px_28px]" />
                <span className="absolute left-4 top-4 rounded-full border border-white/25 bg-black/30 px-2.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-white/90 backdrop-blur">
                  {template.category}
                </span>
                <div className="absolute inset-x-6 bottom-0 rounded-t-xl border border-white/20 border-b-0 bg-[#0a0a12]/85 p-3 shadow-2xl transition duration-300 group-hover:-translate-y-1">
                  <div className="flex items-center gap-1.5 pb-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
                    <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
                    <span className="ml-1 h-2 w-24 rounded-sm bg-white/15" />
                    <span className="ml-auto h-3.5 w-10 rounded bg-accent/80" />
                  </div>
                  <div className="h-1.5 w-3/4 rounded-sm bg-white/35" />
                  <div className="mt-1.5 h-1.5 w-1/2 rounded-sm bg-white/15" />
                  <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                    <div className="h-8 rounded border border-white/10 bg-white/[0.06]" />
                    <div className="h-8 rounded border border-white/10 bg-white/[0.06]" />
                    <div className="h-8 rounded border border-white/10 bg-white/[0.06]" />
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 backdrop-blur-[1px] transition group-hover:opacity-100">
                  <span className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold text-[#12121c]">
                    <LayoutTemplate size={13} /> Live preview
                  </span>
                </div>
              </div>
              <div className="px-4 py-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[13px] font-semibold text-white">{template.name}</div>
                  <Sparkles size={13} className="text-[#4f4f68] transition group-hover:text-accent-soft" />
                </div>
                <div className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#6d6d86]">
                  {template.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.018] px-5 py-4">
        <div>
          <div className="text-[12.5px] font-medium text-[#d7d7e6]">Nothing quite right?</div>
          <div className="mt-0.5 text-[11px] text-[#6d6d86]">
            Start blank and build with drag-and-drop, or generate a custom site in AI Studio.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onNewProject}>
            Blank project
          </Button>
        </div>
      </div>

      <TemplatePreviewModal templateId={previewId} onClose={() => setPreviewId(null)} />
    </div>
  );
}
