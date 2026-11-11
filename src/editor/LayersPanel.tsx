import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Layers,
  Trash2,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import type { WebElement } from '../types';
import { CONTAINER_TYPES } from '../lib/docEngine';
import { cn } from '../lib/utils';
import { elementIcon, elementLabel } from './elementIcons';

interface DragState {
  id: string;
  targetId: string | null;
  position: 'inside' | 'before' | 'after';
}

const LAYER_MIME = 'application/x-webora-layer';

export function LayersPanel() {
  const current = useStore((s) => s.current);
  const pageId = useStore((s) => s.selectedPageId);
  const selectedId = useStore((s) => s.selectedId);
  const select = useStore((s) => s.selectElement);
  const moveElement = useStore((s) => s.moveElement);
  const deleteSelected = useStore((s) => s.deleteSelected);
  const duplicateSelected = useStore((s) => s.duplicateSelected);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const page = current?.pages.find((p) => p.id === pageId);
  const elements = page?.elements ?? [];

  const toggle = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const dropOn = (el: WebElement, event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const rel = (event.clientY - rect.top) / Math.max(rect.height, 1);
    let position: DragState['position'] = rel < 0.28 ? 'before' : rel > 0.72 ? 'after' : 'inside';
    if (position === 'inside' && !CONTAINER_TYPES.includes(el.type)) {
      position = rel < 0.5 ? 'before' : 'after';
    }
    if (dragId && dragId !== el.id) {
      moveElement(dragId, el.id, position);
      if (position === 'inside') {
        setCollapsed((prev) => {
          const next = new Set(prev);
          next.delete(el.id);
          return next;
        });
      }
    }
    setDrag(null);
    setDragId(null);
  };

  if (!page) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5f5f78]">Layers</span>
        <span className="text-[10px] text-[#4d4d64]">{elements.length} top-level</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (dragId) moveElement(dragId, null, 'inside');
            setDragId(null);
            setDrag(null);
          }}
          className={cn(
            'mb-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-medium',
            'text-[#9a9ab2]',
            drag?.targetId === null && 'bg-accent/[0.1] text-white'
          )}
        >
          <Layers size={12} className="text-[#7c6fc0]" />
          <span className="flex-1 truncate">{page.name}</span>
          <span className="font-mono text-[9.5px] text-[#4d4d64]">{page.path}</span>
        </div>

        {elements.length === 0 ? (
          <div className="px-3 py-8 text-center text-[10.5px] leading-relaxed text-[#55556c]">
            No elements yet.
            <br />
            Drag one in from the Add tab.
          </div>
        ) : (
          <div className="space-y-px">
            {elements.map((el) => (
              <LayerRow
                key={el.id}
                el={el}
                depth={0}
                selectedId={selectedId}
                collapsed={collapsed}
                drag={drag}
                onToggle={toggle}
                onSelect={select}
                onDelete={deleteSelected}
                onDuplicate={duplicateSelected}
                onDragStart={(id) => {
                  setDragId(id);
                  setDrag({ id, targetId: null, position: 'inside' });
                }}
                onDragOverRow={(target, position) => {
                  if (!dragId || dragId === target.id) return;
                  setDrag({ id: dragId, targetId: target.id, position });
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setDrag(null);
                }}
                onDrop={dropOn}
              />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-white/[0.06] px-3 py-2 text-[9.5px] leading-relaxed text-[#4f4f66]">
        Drag rows to reorder. Drop in the middle of a container to nest.
      </div>
    </div>
  );
}

function LayerRow({
  el,
  depth,
  selectedId,
  collapsed,
  drag,
  onToggle,
  onSelect,
  onDelete,
  onDuplicate,
  onDragStart,
  onDragOverRow,
  onDragEnd,
  onDrop,
}: {
  el: WebElement;
  depth: number;
  selectedId: string | null;
  collapsed: Set<string>;
  drag: DragState | null;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onDragStart: (id: string) => void;
  onDragOverRow: (el: WebElement, position: DragState['position']) => void;
  onDragEnd: () => void;
  onDrop: (el: WebElement, event: React.DragEvent) => void;
}) {
  const Icon = elementIcon(el.type);
  const isCollapsed = collapsed.has(el.id);
  const active = selectedId === el.id;
  const isContainer = CONTAINER_TYPES.includes(el.type);
  const dropState = drag?.targetId === el.id ? drag.position : null;

  return (
    <div>
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(LAYER_MIME, el.id);
          e.dataTransfer.effectAllowed = 'move';
          onDragStart(el.id);
        }}
        onDragEnd={onDragEnd}
        onDragOver={(e) => {
          if (!drag) return;
          e.preventDefault();
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          const rel = (e.clientY - rect.top) / Math.max(rect.height, 1);
          let position: DragState['position'] = rel < 0.3 ? 'before' : rel > 0.7 ? 'after' : 'inside';
          if (position === 'inside' && !isContainer) position = rel < 0.5 ? 'before' : 'after';
          onDragOverRow(el, position);
        }}
        onDrop={(e) => onDrop(el, e)}
        onClick={() => onSelect(el.id)}
        onDoubleClick={() => onSelect(el.id)}
        className={cn(
          'group relative flex cursor-default items-center gap-1.5 rounded-md py-[5px] pr-1.5 text-[11px] transition',
          active ? 'bg-accent/[0.14] text-white' : 'text-[#a4a4bb] hover:bg-white/[0.04] hover:text-white',
          dropState === 'inside' && 'bg-accent/[0.12] outline outline-1 outline-accent/60'
        )}
        style={{ paddingLeft: 6 + depth * 13 }}
      >
        {dropState === 'before' ? (
          <span className="pointer-events-none absolute inset-x-1 -top-px h-[2px] rounded bg-accent" />
        ) : null}
        {dropState === 'after' ? (
          <span className="pointer-events-none absolute inset-x-1 -bottom-px h-[2px] rounded bg-accent" />
        ) : null}

        {el.children.length ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(el.id);
            }}
            className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded text-[#5f5f78] hover:bg-white/10 hover:text-white"
          >
            {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
          </button>
        ) : (
          <span className="h-3.5 w-3.5 shrink-0" />
        )}

        <Icon size={11} className={cn('shrink-0', active ? 'text-accent-soft' : 'text-[#68687f]')} />
        <span className="min-w-0 flex-1 truncate">{el.name || elementLabel(el.type)}</span>

        {el.children.length ? (
          <span className="shrink-0 rounded bg-white/[0.05] px-1 font-mono text-[8.5px] text-[#66667f]">
            {el.children.length}
          </span>
        ) : null}

        <span className="hidden shrink-0 items-center group-hover:flex">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(el.id);
              onDuplicate();
            }}
            title="Duplicate"
            className="flex h-5 w-5 items-center justify-center rounded text-[#66667f] hover:bg-white/[0.08] hover:text-white"
          >
            <Copy size={10} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(el.id);
              onDelete();
            }}
            title="Delete"
            className="flex h-5 w-5 items-center justify-center rounded text-[#66667f] hover:bg-red-500/15 hover:text-red-300"
          >
            <Trash2 size={10} />
          </button>
        </span>
      </div>

      {!isCollapsed && el.children.length ? (
        <div>
          {el.children.map((child) => (
            <LayerRow
              key={child.id}
              el={child}
              depth={depth + 1}
              selectedId={selectedId}
              collapsed={collapsed}
              drag={drag}
              onToggle={onToggle}
              onSelect={onSelect}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onDragStart={onDragStart}
              onDragOverRow={onDragOverRow}
              onDragEnd={onDragEnd}
              onDrop={onDrop}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
