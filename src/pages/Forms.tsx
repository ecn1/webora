import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ClipboardList,
  Download,
  FolderOpen,
  Inbox,
  Mail,
  Search,
  Trash2,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import type { FormSubmission, Project } from '../types';
import { flattenElements } from '../lib/docEngine';
import { bridge } from '../lib/bridge';
import { cn, slugify, timeAgo } from '../lib/utils';
import { Button, ConfirmDialog, EmptyState, Input, Select } from '../components/ui';

interface FormEntry {
  key: string;
  formId: string;
  name: string;
  projectId: string;
  projectName: string;
  pageId: string;
  pageName: string;
  count: number;
  lastSubmission: number;
}

function escapeCsv(value: string): string {
  const text = value ?? '';
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export function Forms() {
  const projects = useStore((s) => s.projects);
  const setView = useStore((s) => s.setView);
  const deleteSubmission = useStore((s) => s.deleteSubmission);
  const clearSubmissions = useStore((s) => s.clearSubmissions);
  const toast = useStore((s) => s.toast);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ submission: FormSubmission; projectId: string } | null>(null);

  const activeProjects = useMemo(
    () => projects.filter((project) => !project.trashedAt),
    [projects]
  );

  const forms = useMemo(() => {
    const map = new Map<string, FormEntry>();

    for (const project of activeProjects) {
      for (const page of project.pages) {
        for (const { el } of flattenElements(page.elements)) {
          if (el.type !== 'form') continue;
          const key = `${project.id}:${el.id}`;
          map.set(key, {
            key,
            formId: el.id,
            name: el.props.formName || el.content || 'Untitled form',
            projectId: project.id,
            projectName: project.name,
            pageId: page.id,
            pageName: page.name,
            count: 0,
            lastSubmission: 0,
          });
        }
      }
    }

    for (const project of activeProjects) {
      for (const submission of project.submissions ?? []) {
        const key = `${project.id}:${submission.formId}`;
        const existing = map.get(key);
        if (!existing) {
          map.set(key, {
            key,
            formId: submission.formId,
            name: submission.formName || 'Deleted form',
            projectId: project.id,
            projectName: project.name,
            pageId: submission.pageId,
            pageName: submission.pageName,
            count: 0,
            lastSubmission: 0,
          });
        }
        const entry = map.get(key)!;
        entry.count += 1;
        entry.lastSubmission = Math.max(entry.lastSubmission, submission.submittedAt);
      }
    }

    return [...map.values()].sort((a, b) => {
      if (a.count !== b.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    });
  }, [activeProjects]);

  const selected = forms.find((form) => form.key === selectedKey) ?? null;
  const totalResponses = forms.reduce((sum, form) => sum + form.count, 0);
  const latest = forms.reduce((max, form) => Math.max(max, form.lastSubmission), 0);

  const submissions = useMemo(() => {
    const out: Array<{ submission: FormSubmission; project: Project }> = [];
    const query = search.trim().toLowerCase();
    for (const project of activeProjects) {
      if (selected && project.id !== selected.projectId) continue;
      for (const submission of project.submissions ?? []) {
        if (selected && submission.formId !== selected.formId) continue;
        if (query) {
          const haystack = [
            submission.respondentName,
            submission.respondentEmail,
            submission.formName,
            submission.pageName,
            ...submission.values.map((value) => `${value.label} ${value.value}`),
          ]
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(query)) continue;
        }
        out.push({ submission, project });
      }
    }
    return out.sort((a, b) => {
      if (sort === 'oldest') return a.submission.submittedAt - b.submission.submittedAt;
      if (sort === 'name') {
        const left = a.submission.respondentName || 'Anonymous';
        const right = b.submission.respondentName || 'Anonymous';
        return left.localeCompare(right);
      }
      return b.submission.submittedAt - a.submission.submittedAt;
    });
  }, [activeProjects, selected, search, sort]);

  const exportCsv = async () => {
    if (!submissions.length) {
      toast('There are no responses to export yet', 'info');
      return;
    }
    const labels: string[] = [];
    for (const item of submissions) {
      for (const value of item.submission.values) {
        if (!labels.includes(value.label)) labels.push(value.label);
      }
    }
    const header = ['Form', 'Project', 'Page', 'Respondent', 'Email', 'Submitted at', ...labels];
    const lines = [header.map(escapeCsv).join(',')];
    for (const { submission, project } of submissions) {
      const answers = labels.map(
        (label) => submission.values.find((value) => value.label === label)?.value ?? ''
      );
      lines.push(
        [
          submission.formName,
          project.name,
          submission.pageName,
          submission.respondentName || 'Anonymous',
          submission.respondentEmail,
          new Date(submission.submittedAt).toLocaleString(),
          ...answers,
        ]
          .map((cell) => escapeCsv(String(cell ?? '')))
          .join(',')
      );
    }
    const name = selected ? slugify(`${selected.name} responses`) : 'webora-form-responses';
    try {
      const result = await bridge.saveFile(
        `${name || 'form-responses'}.csv`,
        new TextEncoder().encode(lines.join('\r\n')),
        'csv'
      );
      if (result) toast(`Exported ${submissions.length} response${submissions.length === 1 ? '' : 's'}`, 'success');
    } catch {
      toast('Could not export the responses', 'error');
    }
  };

  const totalForms = forms.length;

  return (
    <div className="mx-auto w-full max-w-[1240px] px-8 pb-16 pt-7">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-medium text-[#5f5f78]">
            <span className="text-[#8c8ca6]">Workspace</span>
            <span className="text-[#33334a]">/</span>
            <span>Forms</span>
          </div>
          <h1 className="font-display text-[26px] font-bold tracking-tight text-white">Forms</h1>
          <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-[#71718a]">
            Responses captured by the live preview and by exported forms on this device. Add a Form element in the
            editor to start collecting answers.
          </p>
        </div>
        <Button variant="secondary" icon={Download} disabled={!submissions.length} onClick={() => void exportCsv()}>
          Export CSV
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Forms" value={String(totalForms)} hint={totalForms === 1 ? 'across your projects' : 'across your projects'} />
        <StatCard
          label="Responses"
          value={String(totalResponses)}
          hint={totalResponses === 1 ? '1 submission stored' : 'submissions stored'}
        />
        <StatCard
          label="Latest response"
          value={latest ? timeAgo(latest) : '—'}
          hint={latest ? new Date(latest).toLocaleDateString() : 'Waiting for the first submission'}
        />
      </div>

      {!forms.length ? (
        <EmptyState
          icon={ClipboardList}
          title="No forms yet"
          description="Open a project, choose Form from the Add panel, then submit it in the live preview. Every response lands here with the form title, respondent name and answers."
          action={
            <Button variant="primary" icon={FolderOpen} onClick={() => setView('projects')}>
              Go to My Projects
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[272px_minmax(0,1fr)]">
          <aside className="panel h-fit overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-3.5 py-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6f6f88]">
                Collected forms
              </span>
              <span className="text-[10px] tabular-nums text-[#5b5b73]">{forms.length}</span>
            </div>
            <div className="max-h-[520px] space-y-0.5 overflow-y-auto p-1.5">
              <button
                onClick={() => setSelectedKey(null)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition',
                  !selected ? 'bg-accent/[0.13] text-white' : 'text-[#b0b0c4] hover:bg-white/[0.045]'
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                    !selected ? 'bg-accent/25 text-accent-soft' : 'bg-white/[0.05] text-[#7b7b93]'
                  )}
                >
                  <Inbox size={13} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-semibold">All responses</span>
                  <span className="mt-0.5 block text-[9.5px] text-[#66667f]">{totalResponses} total</span>
                </span>
              </button>

              {forms.map((form) => {
                const active = selected?.key === form.key;
                return (
                  <button
                    key={form.key}
                    onClick={() => {
                      setSelectedKey(form.key);
                      setExpanded(null);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition',
                      active ? 'bg-accent/[0.13] text-white' : 'text-[#b0b0c4] hover:bg-white/[0.045]'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold',
                        active ? 'bg-accent/25 text-[#d8ccff]' : 'bg-white/[0.05] text-[#8b8ba4]'
                      )}
                    >
                      {initials(form.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-semibold">{form.name}</span>
                      <span className="mt-0.5 block truncate text-[9.5px] text-[#66667f]">
                        {form.projectName} · {form.pageName}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'shrink-0 rounded-md px-1.5 py-0.5 text-[9.5px] font-semibold tabular-nums',
                        form.count ? 'bg-white/[0.07] text-[#c7c7d8]' : 'text-[#4f4f66]'
                      )}
                    >
                      {form.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2.5">
              <div className="min-w-[200px] flex-1">
                <div className="relative">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5b5b73]"
                  />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search respondents, email or answers…"
                    className="h-9 pl-[34px] text-[12px]"
                  />
                </div>
              </div>
              <Select
                value={sort}
                onChange={(e) => setSort(e.target.value as 'newest' | 'oldest' | 'name')}
                className="h-9 w-[148px] py-0 text-[11.5px]"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name">Respondent A–Z</option>
              </Select>
              {selected ? (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Trash2}
                  className="text-red-300/80 hover:bg-red-500/10 hover:text-red-200"
                  onClick={() => setClearOpen(true)}
                >
                  Clear form
                </Button>
              ) : null}
            </div>

            {selected ? (
              <div className="mb-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-[13px] font-semibold text-white">{selected.name}</div>
                    <div className="mt-0.5 text-[10.5px] text-[#71718a]">
                      {selected.projectName} · {selected.pageName} · {selected.count}{' '}
                      {selected.count === 1 ? 'response' : 'responses'}
                    </div>
                  </div>
                  <span className="rounded-md border border-white/[0.08] px-2 py-1 font-mono text-[9px] text-[#66667f]">
                    {selected.formId}
                  </span>
                </div>
              </div>
            ) : null}

            {submissions.length === 0 ? (
              <div className="panel flex flex-col items-center justify-center px-6 py-16 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-[#6f6f8b]">
                  <Inbox size={19} />
                </span>
                <div className="mt-3 text-[13px] font-semibold text-white">
                  {search ? 'No matching responses' : 'No responses yet'}
                </div>
                <p className="mt-1 max-w-md text-[11.5px] leading-relaxed text-[#71718a]">
                  {search
                    ? 'Try a different search term or clear the search field.'
                    : 'Open a project, preview a page with a form, and submit it. Responses appear here immediately with the respondent name and every answer.'}
                </p>
                {search ? (
                  <Button variant="secondary" size="sm" className="mt-4" onClick={() => setSearch('')}>
                    Clear search
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2">
                {submissions.map(({ submission, project: owner }) => {
                  const open = expanded === submission.id;
                  return (
                    <div
                      key={submission.id}
                      className="overflow-hidden rounded-xl border border-white/[0.07] bg-ink-850 transition hover:border-white/[0.12]"
                    >
                      <button
                        onClick={() => setExpanded(open ? null : submission.id)}
                        className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.05] text-[11px] font-bold text-[#c9baff]">
                          {initials(submission.respondentName || submission.respondentEmail || 'Anonymous')}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-[12.5px] font-semibold text-white">
                              {submission.respondentName || 'Anonymous respondent'}
                            </span>
                            {submission.respondentEmail ? (
                              <span className="flex items-center gap-1 rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[9.5px] text-[#9a9ab2]">
                                <Mail size={9} /> {submission.respondentEmail}
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-[#66667f]">
                            <span>{submission.formName}</span>
                            <span className="text-[#34344a]">·</span>
                            <span>{submission.pageName}</span>
                            <span className="text-[#34344a]">·</span>
                            <span>{timeAgo(submission.submittedAt)}</span>
                          </span>
                        </span>
                        <span className="hidden shrink-0 rounded-md border border-white/[0.07] px-1.5 py-0.5 text-[9.5px] tabular-nums text-[#8b8ba4] sm:inline">
                          {submission.values.length} answers
                        </span>
                        <ChevronDown
                          size={14}
                          className={cn('shrink-0 text-[#5b5b73] transition', open && 'rotate-180')}
                        />
                      </button>

                      {open ? (
                        <div className="border-t border-white/[0.06] px-3.5 py-3">
                          <div className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
                            {submission.values.length ? (
                              submission.values.map((value, index) => (
                                <div key={`${submission.id}-${index}`} className="min-w-0">
                                  <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[#5f5f78]">
                                    {value.label}
                                  </div>
                                  <div className="mt-0.5 whitespace-pre-wrap break-words text-[11.5px] leading-relaxed text-[#d2d2e2]">
                                    {value.value || '—'}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-[11px] text-[#66667f]">No answers were captured.</div>
                            )}
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/[0.05] pt-2.5">
                            <span className="text-[9.5px] text-[#4f4f66]">
                              {new Date(submission.submittedAt).toLocaleString()}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={Trash2}
                              className="h-7 text-[10.5px] text-red-300/70 hover:bg-red-500/10 hover:text-red-200"
                              onClick={() => setDeleteTarget({ submission, projectId: owner.id })}
                            >
                              Delete response
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete response"
        message={`The response from “${deleteTarget?.submission.respondentName || 'Anonymous respondent'}” will be permanently removed.`}
        confirmLabel="Delete response"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteSubmission(deleteTarget.projectId, deleteTarget.submission.id);
        }}
      />

      <ConfirmDialog
        open={clearOpen}
        title="Clear form responses"
        message={`All ${selected?.count ?? 0} response${selected?.count === 1 ? '' : 's'} for “${selected?.name ?? 'this form'}” will be permanently deleted. The form itself stays in the project.`}
        confirmLabel="Clear responses"
        onClose={() => setClearOpen(false)}
        onConfirm={() => {
          if (selected) clearSubmissions(selected.projectId, selected.formId);
        }}
      />
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <div className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[#5f5f78]">{label}</div>
      <div className="mt-1 font-display text-[20px] font-bold leading-none text-white">{value}</div>
      <div className="mt-1 text-[10px] text-[#66667f]">{hint}</div>
    </div>
  );
}
