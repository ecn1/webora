import React, { useEffect, useState } from 'react';
import { ArrowRight, LayoutTemplate, Plus, Sparkles } from 'lucide-react';
import { TEMPLATES } from '../lib/templates';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { Button, Input, Modal } from './ui';

const FEATURED = ['gaming', 'saas', 'portfolio', 'business', 'agency', 'tech'];

export function NewProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createBlankProject = useStore((s) => s.createBlankProject);
  const createFromTemplate = useStore((s) => s.createFromTemplate);
  const renameProject = useStore((s) => s.renameProject);

  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setTemplateId(null);
      setBusy(false);
    }
  }, [open]);

  const templates = FEATURED.map((id) => TEMPLATES.find((t) => t.id === id)).filter(Boolean) as typeof TEMPLATES;

  const create = () => {
    setBusy(true);
    if (templateId) {
      createFromTemplate(templateId);
      const id = useStore.getState().current?.id;
      if (id && name.trim()) renameProject(id, name.trim());
    } else {
      createBlankProject(name.trim() || 'Untitled website');
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create a new website"
      subtitle="Start from a blank canvas or a fully editable template."
      width="max-w-3xl"
      footer={
        <>
          <span className="text-[11.5px] text-[#6f6f88]">
            {templateId
              ? `Template: ${TEMPLATES.find((t) => t.id === templateId)?.name}`
              : 'Blank canvas · one Home page'}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={create} loading={busy} icon={Plus}>
              Create website
            </Button>
          </div>
        </>
      }
    >
      <div className="space-y-6">
        <div>
          <label className="label">Website name</label>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={templateId ? 'Optional — keeps the template name' : 'My new website'}
            onKeyDown={(e) => {
              if (e.key === 'Enter') create();
            }}
          />
        </div>

        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <label className="label mb-0">Starting point</label>
            <span className="text-[10.5px] text-[#5f5f78]">All templates are real, editable projects</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setTemplateId(null)}
              className={cn(
                'group flex min-h-[104px] flex-col items-start justify-between rounded-xl border p-3 text-left transition',
                templateId === null
                  ? 'border-accent/60 bg-accent/[0.08] ring-1 ring-accent/30'
                  : 'border-white/[0.07] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]'
              )}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-[#a8a8c0]">
                <Plus size={15} />
              </span>
              <span>
                <span className="block text-[12.5px] font-semibold text-white">Blank canvas</span>
                <span className="mt-0.5 block text-[10.5px] text-[#6d6d86]">One empty page</span>
              </span>
            </button>

            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setTemplateId(template.id)}
                className={cn(
                  'group relative flex min-h-[104px] flex-col items-start justify-between overflow-hidden rounded-xl border p-3 text-left transition',
                  templateId === template.id
                    ? 'border-accent/60 ring-1 ring-accent/30'
                    : 'border-white/[0.07] hover:border-white/15'
                )}
              >
                <span
                  className="absolute inset-0 opacity-70 transition group-hover:opacity-90"
                  style={{ background: template.gradient }}
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
                <span className="relative flex h-7 w-7 items-center justify-center rounded-lg border border-white/20 bg-black/25 text-white">
                  <LayoutTemplate size={13} />
                </span>
                <span className="relative">
                  <span className="block text-[12.5px] font-semibold text-white">{template.name}</span>
                  <span className="mt-0.5 block text-[10.5px] text-white/60">{template.category}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-accent/20 bg-accent/[0.06] px-3.5 py-2.5 text-[11.5px] text-[#b0a6d6]">
          <Sparkles size={14} className="text-accent-soft" />
          You can also describe a website in AI Studio and generate a project from a prompt.
          <ArrowRight size={13} className="ml-auto text-accent-soft" />
        </div>
      </div>
    </Modal>
  );
}
