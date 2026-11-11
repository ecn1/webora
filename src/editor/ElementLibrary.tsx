import React, { useMemo, useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { ELEMENT_LIBRARY, CONTAINER_TYPES } from '../lib/docEngine';
import type { ElementType } from '../types';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { Input } from '../components/ui';
import { DRAG_MIME } from './constants';
import { elementIcon } from './elementIcons';

const GROUP_ORDER = ['Basic', 'Layout', 'Media', 'Navigation', 'Forms', 'Advanced'];

export function ElementLibrary() {
  const [query, setQuery] = useState('');
  const insertElement = useStore((s) => s.insertElement);
  const selectedId = useStore((s) => s.selectedId);
  const current = useStore((s) => s.current);
  const pageId = useStore((s) => s.selectedPageId);
  const setView = useStore((s) => s.setView);

  const page = current?.pages.find((p) => p.id === pageId);
  const selectedIsContainer = useMemo(() => {
    if (!page || !selectedId) return false;
    const walk = (list: typeof page.elements): ElementType | null => {
      for (const el of list) {
        if (el.id === selectedId) return el.type;
        const inner = walk(el.children);
        if (inner) return inner;
      }
      return null;
    };
    const type = walk(page.elements);
    return type ? CONTAINER_TYPES.includes(type) : false;
  }, [page, selectedId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ELEMENT_LIBRARY;
    return ELEMENT_LIBRARY.filter(
      (item) => item.label.toLowerCase().includes(q) || item.group.toLowerCase().includes(q)
    );
  }, [query]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof ELEMENT_LIBRARY>();
    for (const item of filtered) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({ name: g, items: map.get(g)! }));
  }, [filtered]);

  const add = (type: ElementType) => {
    if (selectedId && selectedIsContainer) insertElement(type, selectedId, 'inside');
    else insertElement(type, selectedId, 'after');
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-white/[0.06] p-3">
        <div className="relative">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5b5b73]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search elements…"
            className="h-8 py-0 pl-8 text-[11.5px]"
          />
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-[#5d5d76]">
          Drag onto the canvas, or click to insert{' '}
          {selectedIsContainer ? (
            <span className="text-[#a99ce0]">inside the selected container</span>
          ) : selectedId ? (
            <span className="text-[#a99ce0]">after the selection</span>
          ) : (
            'at the end of the page'
          )}
          .
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {groups.length === 0 ? (
          <div className="px-1 py-8 text-center text-[11px] text-[#5f5f78]">
            No elements match “{query}”.
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.name} className="mb-4">
              <div className="mb-1.5 flex items-center gap-2 px-0.5">
                <span className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#5a5a72]">
                  {group.name}
                </span>
                <span className="h-px flex-1 bg-white/[0.05]" />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {group.items.map((item) => {
                  const Icon = elementIcon(item.type);
                  return (
                    <button
                      key={item.type}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(DRAG_MIME, item.type);
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      onClick={() => add(item.type)}
                      title={`Add ${item.label}`}
                      className="group flex cursor-grab items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-[7px] text-left transition hover:border-accent/35 hover:bg-accent/[0.07] active:cursor-grabbing"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/[0.04] text-[#8a8aa6] transition group-hover:bg-accent/15 group-hover:text-accent-soft">
                        <Icon size={12} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-[#b6b6ca] group-hover:text-white">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}

        <button
          onClick={() => setView('aistudio')}
          className="mt-1 flex w-full items-center gap-2 rounded-xl border border-accent/20 bg-accent/[0.05] px-3 py-2.5 text-left transition hover:border-accent/40 hover:bg-accent/[0.09]"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent-soft">
            <Sparkles size={13} />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-medium text-[#d5caff]">Generate with AI</span>
            <span className="mt-0.5 block text-[9.5px] text-[#77718f]">Prompt a full section or page</span>
          </span>
        </button>
      </div>
    </div>
  );
}
