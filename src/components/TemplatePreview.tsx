import React, { useMemo } from 'react';
import { Monitor, Smartphone, Sparkles } from 'lucide-react';
import { TEMPLATES } from '../lib/templates';
import { generatePageHtml } from '../lib/codegen';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { Button, Modal } from './ui';

export function TemplatePreviewModal({
  templateId,
  onClose,
}: {
  templateId: string | null;
  onClose: () => void;
}) {
  const createFromTemplate = useStore((s) => s.createFromTemplate);
  const template = useMemo(() => TEMPLATES.find((t) => t.id === templateId), [templateId]);
  const project = useMemo(() => (template ? template.build() : null), [template]);
  const html = useMemo(
    () => (project ? generatePageHtml(project, project.pages[0], { inline: true }) : ''),
    [project]
  );

  if (!template || !project) return null;

  return (
    <Modal
      open={!!templateId}
      onClose={onClose}
      title={template.name}
      subtitle={`${template.category} · ${project.pages.length} page${project.pages.length === 1 ? '' : 's'} · fully editable`}
      width="max-w-5xl"
      bodyClassName="p-0"
      footer={
        <>
          <span className="text-[11.5px] text-[#6f6f88]">{template.description}</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              icon={Sparkles}
              onClick={() => {
                createFromTemplate(template.id);
                onClose();
              }}
            >
              Use this template
            </Button>
          </div>
        </>
      }
    >
      <div className="border-b border-white/[0.06] bg-ink-900/60 px-5 py-2.5">
        <div className="flex items-center gap-2 text-[11px] text-[#6f6f88]">
          <Monitor size={13} /> Desktop preview
          <span className="text-[#3d3d52]">/</span>
          <Smartphone size={13} /> responsive rules included
        </div>
      </div>
      <div className="checker p-4">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#07070c] shadow-2xl">
          <div className="flex h-8 items-center gap-1.5 border-b border-white/[0.06] bg-[#0d0d16] px-3">
            <span className="h-2 w-2 rounded-full bg-[#ff5f57]/70" />
            <span className="h-2 w-2 rounded-full bg-[#febc2e]/70" />
            <span className="h-2 w-2 rounded-full bg-[#28c840]/70" />
            <span className="ml-3 truncate rounded bg-white/[0.04] px-2 py-0.5 text-[9.5px] text-[#6d6d86]">
              {template.name}
            </span>
          </div>
          <iframe
            title={`${template.name} template preview`}
            srcDoc={html}
            sandbox="allow-scripts allow-forms"
            className={cn('h-[520px] w-full border-0 bg-[#0a0a12]')}
          />
        </div>
      </div>
    </Modal>
  );
}
