import React, { useMemo } from 'react';
import type { Page, Project } from '../types';
import { generatePageHtml } from '../lib/codegen';
import { cn } from '../lib/utils';

/**
 * Renders a small, non-interactive live preview of a project page.
 * Scripts are disabled via the sandbox attribute.
 */
export function SiteThumb({
  project,
  page,
  className,
  scale = 0.3,
  width = 1240,
  height = 760,
}: {
  project: Project;
  page?: Page;
  className?: string;
  scale?: number;
  width?: number;
  height?: number;
}) {
  const targetPage = page ?? project.pages[0];
  const html = useMemo(
    () =>
      targetPage
        ? generatePageHtml(project, targetPage, { inline: true })
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            // Thumbnails must not load third-party embeds (YouTube/Vimeo).
            .replace(
              /<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi,
              '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#15151f;color:#6f6f88;font:12px ui-monospace,monospace">Embedded media</div>'
            )
        : '',
    [project, targetPage]
  );

  return (
    <div className={cn('relative overflow-hidden bg-[#08080f]', className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-[#15112b] via-[#0b0b14] to-[#09090f]" />
      <iframe
        title={`${project.name} thumbnail`}
        srcDoc={html}
        sandbox=""
        tabIndex={-1}
        loading="lazy"
        className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
        style={{ width, height, transform: `scale(${scale})` }}
      />
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/45 to-transparent" />
    </div>
  );
}
