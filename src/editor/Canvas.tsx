import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Copy,
  GripHorizontal,
  MousePointerClick,
  Move,
  Trash2,
  Type,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Breakpoint, ElementType, WebElement } from '../types';
import { CONTAINER_TYPES, TEXT_TYPES, flattenElements } from '../lib/docEngine';
import { cn } from '../lib/utils';
import {
  CanvasContext,
  ElementView,
  type CanvasSelection,
} from './ElementView';

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const DEVICE_WIDTH: Record<Breakpoint, number> = {
  desktop: 1280,
  tablet: 834,
  mobile: 390,
};

const DEVICE_LABEL: Record<Breakpoint, string> = {
  desktop: 'Desktop · 1280px',
  tablet: 'Tablet · 834px',
  mobile: 'Mobile · 390px',
};

const DRAG_MIME = 'application/x-webora-element';

function positionFor(node: HTMLElement, clientY: number): 'inside' | 'before' | 'after' {
  const type = node.dataset.elType as ElementType | undefined;
  const rect = node.getBoundingClientRect();
  const rel = rect.height > 0 ? (clientY - rect.top) / rect.height : 0.5;
  if (type && CONTAINER_TYPES.includes(type)) {
    const pad = Math.min(0.3, 48 / Math.max(rect.height, 1));
    if (rel > pad && rel < 1 - pad) return 'inside';
  }
  return rel < 0.5 ? 'before' : 'after';
}

export function Canvas() {
  const current = useStore((s) => s.current);
  const pageId = useStore((s) => s.selectedPageId);
  const selectedId = useStore((s) => s.selectedId);
  const device = useStore((s) => s.device);
  const zoom = useStore((s) => s.zoom);
  const showGrid = useStore((s) => s.settings.showGrid);
  const gridSize = useStore((s) => s.settings.gridSize);

  const select = useStore((s) => s.selectElement);
  const insertElement = useStore((s) => s.insertElement);
  const moveElement = useStore((s) => s.moveElement);
  const setContent = useStore((s) => s.setContent);
  const deleteSelected = useStore((s) => s.deleteSelected);
  const duplicateSelected = useStore((s) => s.duplicateSelected);
  const setStyleBulk = useStore((s) => s.setStyleBulk);

  const page = current?.pages.find((p) => p.id === pageId) ?? current?.pages[0] ?? null;

  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<CanvasSelection | null>(null);
  const [selectionRect, setSelectionRect] = useState<Rect | null>(null);
  const [dropRect, setDropRect] = useState<Rect | null>(null);
  const [moving, setMoving] = useState<{ id: string; name: string } | null>(null);
  const [libraryHover, setLibraryHover] = useState(false);
  const [fitScale, setFitScale] = useState(1);

  const deviceWidth = DEVICE_WIDTH[device];
  const totalScale = fitScale * (zoom || 1);

  const elements = page?.elements ?? [];
  const flat = useMemo(() => flattenElements(elements), [elements]);
  const selected = useMemo(
    () => (selectedId ? flat.find((item) => item.el.id === selectedId)?.el ?? null : null),
    [flat, selectedId]
  );

  useEffect(() => {
    if (editingId && editingId !== selectedId) setEditingId(null);
  }, [selectedId, editingId]);

  /* ------------------------- selection measurement ------------------------ */

  const measure = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const scale = totalScale || 1;
    const frameRect = frame.getBoundingClientRect();
    const rectFor = (id: string | null): Rect | null => {
      if (!id) return null;
      const node = frame.querySelector<HTMLElement>(`[data-el-id="${id}"]`);
      if (!node) return null;
      const r = node.getBoundingClientRect();
      return {
        left: (r.left - frameRect.left) / scale,
        top: (r.top - frameRect.top) / scale,
        width: r.width / scale,
        height: r.height / scale,
      };
    };
    setSelectionRect(rectFor(selectedId));
    setDropRect(rectFor(dropTarget?.id ?? null));
  }, [selectedId, dropTarget, totalScale]);

  // Shrink the canvas to fit the workspace, never enlarge it. The element keeps
  // its true layout width, so desktop media queries use a real desktop viewport.
  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const recompute = () => {
      const available = Math.max(240, scroller.clientWidth - 64);
      setFitScale(Math.min(1, available / deviceWidth));
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(scroller);
    return () => ro.disconnect();
  }, [device, deviceWidth]);

  useLayoutEffect(() => {
    measure();
    const frame = frameRef.current;
    if (!frame) return;
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    const ro = new ResizeObserver(schedule);
    ro.observe(frame);
    if (contentRef.current) ro.observe(contentRef.current);
    const node = frame.querySelector<HTMLElement>(`[data-el-id="${selectedId ?? ''}"]`);
    if (node) ro.observe(node);
    window.addEventListener('resize', schedule);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(raf);
    };
  }, [measure, selectedId, page?.id, device]);

  useEffect(() => {
    measure();
  }, [current, measure]);

  /* ------------------------------ inline edit ----------------------------- */

  const beginEdit = useCallback(
    (id: string) => {
      select(id);
      setEditingId(id);
      requestAnimationFrame(() => {
        const node = frameRef.current?.querySelector<HTMLElement>(`[data-el-id="${id}"]`);
        if (!node) return;
        node.focus();
        const range = document.createRange();
        range.selectNodeContents(node);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      });
    },
    [select]
  );

  const commitEdit = useCallback(
    (id: string, text: string) => {
      setEditingId(null);
      const node = flat.find((item) => item.el.id === id)?.el;
      if (!node) return;
      const clean = text.replace(/\u00a0/g, ' ').trim();
      if (clean === node.content) return;
      select(id);
      setContent(clean);
    },
    [flat, select, setContent]
  );

  const cancelEdit = useCallback(() => setEditingId(null), []);

  const ctxValue = useMemo(
    () => ({
      device,
      editingId,
      dropTarget,
      select,
      beginEdit,
      commitEdit,
      cancelEdit,
    }),
    [device, editingId, dropTarget, select, beginEdit, commitEdit, cancelEdit]
  );

  /* ---------------------------- hover stylesheet -------------------------- */

  const hoverCss = useMemo(() => {
    const rules: string[] = [];
    for (const { el } of flat) {
      if (!Object.keys(el.hover).length) continue;
      const body = Object.entries(el.hover)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}:${v};`)
        .join('');
      if (body) rules.push(`.we-${el.id}:hover{${body}}`);
    }
    return rules.join('\n');
  }, [flat]);

  /* -------------------------------- dropping ------------------------------ */

  const handleDragOver = (event: React.DragEvent) => {
    const types = Array.from(event.dataTransfer.types);
    if (!types.includes(DRAG_MIME)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    const node = (event.target as HTMLElement).closest('[data-el-id]') as HTMLElement | null;
    if (!node || !node.dataset.elId) {
      setDropTarget(null);
      return;
    }
    setDropTarget({ id: node.dataset.elId, position: positionFor(node, event.clientY) });
  };

  const handleDragLeave = (event: React.DragEvent) => {
    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
    setDropTarget(null);
    setLibraryHover(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData(DRAG_MIME) as ElementType;
    setLibraryHover(false);
    if (!type) return;
    const target = dropTarget;
    setDropTarget(null);
    insertElement(type, target?.id ?? null, target?.position ?? 'inside');
  };

  /* ------------------------------ move element ---------------------------- */

  // Keep the latest drop target available inside the pointerup closure.
  const dropTargetRef = useRef<CanvasSelection | null>(null);
  useEffect(() => {
    dropTargetRef.current = dropTarget;
  }, [dropTarget]);

  const startMove = (event: React.PointerEvent) => {
    if (!selected) return;
    event.preventDefault();
    event.stopPropagation();
    const id = selected.id;
    const name = selected.name;
    setMoving({ id, name });
    setDropTarget({ id, position: 'inside' });

    const onMove = (e: PointerEvent) => {
      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const node = target?.closest('[data-el-id]') as HTMLElement | null;
      if (!node || !node.dataset.elId || node.dataset.elId === id) {
        setDropTarget(null);
        return;
      }
      setDropTarget({ id: node.dataset.elId, position: positionFor(node, e.clientY) });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setMoving(null);
      const currentDrop = dropTargetRef.current;
      setDropTarget(null);
      if (currentDrop && currentDrop.id !== id) {
        moveElement(id, currentDrop.id, currentDrop.position);
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  /* ------------------------------- resizing ------------------------------- */

  const startResize = (event: React.PointerEvent, axis: 'x' | 'y' | 'xy') => {
    if (!selected || !selectionRect) return;
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    const startW = selectionRect.width;
    const startH = selectionRect.height;
    const scale = totalScale || 1;

    const onMove = (e: PointerEvent) => {
      const dx = (e.clientX - startX) / scale;
      const dy = (e.clientY - startY) / scale;
      const patch: Record<string, string> = {};
      if (axis !== 'y') patch.width = `${Math.max(32, Math.round(startW + dx))}px`;
      if (axis !== 'x') patch.height = `${Math.max(16, Math.round(startH + dy))}px`;
      setStyleBulk(patch, device);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  /* --------------------------------- render ------------------------------- */

  if (!current || !page) {
    return (
      <div className="flex flex-1 items-center justify-center text-[12px] text-[#66667f]">
        No page selected
      </div>
    );
  }

  const isTextSelected = selected ? TEXT_TYPES.includes(selected.type) : false;

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-[#08080e]">
      <div className="pointer-events-none absolute inset-0 dotgrid opacity-60" />

      {page.custom?.html ? (
        <div className="relative z-10 mx-auto mt-3 flex max-w-[720px] items-start gap-2 rounded-lg border border-amber-400/25 bg-amber-400/[0.07] px-3 py-2 text-[11px] leading-relaxed text-amber-200/90">
          <Type size={13} className="mt-0.5 shrink-0" />
          <span>
            This page has a custom HTML override from Code Studio. The canvas below shows the visual document, but
            preview and export will render your custom HTML instead.
          </span>
        </div>
      ) : null}

      <div ref={scrollRef} className="relative z-[1] min-h-0 flex-1 overflow-auto">
        <div className="flex min-h-full w-full justify-center px-8 py-8">
          <div style={{ zoom: totalScale }}>
            <div
              ref={frameRef}
              className="relative transition-[width] duration-300"
              style={{ width: deviceWidth }}
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#4f4f66]">
                  {DEVICE_LABEL[device]}
                </span>
                <span className="text-[9.5px] text-[#44445a]">
                  {page.name} · {page.path}
                </span>
              </div>

              <div
                className={cn(
                  'relative overflow-hidden bg-[#0a0a12] shadow-[0_30px_90px_-30px_rgba(0,0,0,0.9)]',
                  device === 'desktop' ? 'rounded-lg border border-white/[0.07]' : 'rounded-[26px] border-[6px] border-[#1a1a27]'
                )}
              >
                {showGrid ? (
                  <div
                    className="pointer-events-none absolute inset-0 z-20 opacity-[0.35]"
                    style={{
                      backgroundImage:
                        'linear-gradient(to right, rgba(124,92,255,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(124,92,255,0.16) 1px, transparent 1px)',
                      backgroundSize: `${gridSize}px ${gridSize}px`,
                    }}
                  />
                ) : null}

                <div
                  ref={contentRef}
                  className="webora-site relative min-h-[560px]"
                  style={{ background: '#0a0a12', color: '#e8e8f2' }}
                  onClick={() => {
                    if (!editingId) select(null);
                  }}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <CanvasContext.Provider value={ctxValue}>
                    {elements.length === 0 ? (
                      <div
                        className={cn(
                          'flex min-h-[560px] flex-col items-center justify-center gap-3 px-8 text-center transition',
                          libraryHover && 'bg-accent/[0.05]'
                        )}
                        onDragEnter={() => setLibraryHover(true)}
                      >
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03] text-[#6f6f8b]">
                          <MousePointerClick size={20} />
                        </span>
                        <div>
                          <div className="text-[13px] font-medium text-[#b9b9ce]">This page is empty</div>
                          <div className="mt-1 max-w-[280px] text-[11px] leading-relaxed text-[#5f5f78]">
                            Drag a section, heading or image from the left panel, or open AI Studio and generate a full
                            website.
                          </div>
                        </div>
                      </div>
                    ) : (
                      elements.map((el: WebElement) => <ElementView key={el.id} el={el} />)
                    )}
                  </CanvasContext.Provider>
                </div>
              </div>

              <style>{hoverCss}</style>

              {/* selection overlay */}
              {selectionRect && selected ? (
                <div
                  className="pointer-events-none absolute z-30"
                  style={{
                    left: selectionRect.left,
                    top: selectionRect.top,
                    width: selectionRect.width,
                    height: selectionRect.height,
                  }}
                >
                  <div
                    className={cn(
                      'absolute inset-0 border',
                      editingId === selected.id ? 'border-accent-soft' : 'border-accent'
                    )}
                  />
                  <div className="pointer-events-auto absolute -top-[26px] left-0 flex h-[22px] items-center overflow-hidden rounded-md bg-accent text-white shadow-lg">
                    <button
                      onPointerDown={startMove}
                      className="flex h-full cursor-grab items-center px-1.5 active:cursor-grabbing hover:bg-white/15"
                      title="Drag to move element"
                    >
                      <GripHorizontal size={12} />
                    </button>
                    <span className="max-w-[180px] truncate px-1.5 text-[9.5px] font-semibold tracking-wide">
                      {selected.name}
                    </span>
                    {isTextSelected ? (
                      <button
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          beginEdit(selected.id);
                        }}
                        className="flex h-full items-center px-1.5 hover:bg-white/15"
                        title="Edit text"
                      >
                        <Type size={11} />
                      </button>
                    ) : null}
                    <button
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        duplicateSelected();
                      }}
                      className="flex h-full items-center px-1.5 hover:bg-white/15"
                      title="Duplicate element"
                    >
                      <Copy size={11} />
                    </button>
                    <button
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        deleteSelected();
                      }}
                      className="flex h-full items-center px-1.5 hover:bg-white/15"
                      title="Delete element"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>

                  <span className="absolute -bottom-[18px] left-0 rounded bg-accent px-1 py-0.5 font-mono text-[8.5px] leading-none text-white">
                    {Math.round(selectionRect.width)} × {Math.round(selectionRect.height)}
                  </span>

                  <button
                    onPointerDown={(e) => startResize(e, 'x')}
                    className="pointer-events-auto absolute -right-[5px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 cursor-ew-resize rounded-full border border-white bg-accent"
                    title="Resize width"
                  />
                  <button
                    onPointerDown={(e) => startResize(e, 'y')}
                    className="pointer-events-auto absolute -bottom-[5px] left-1/2 h-2.5 w-2.5 -translate-x-1/2 cursor-ns-resize rounded-full border border-white bg-accent"
                    title="Resize height"
                  />
                  <button
                    onPointerDown={(e) => startResize(e, 'xy')}
                    className="pointer-events-auto absolute -bottom-[5px] -right-[5px] h-3 w-3 cursor-nwse-resize rounded-sm border border-white bg-accent"
                    title="Resize width and height"
                  />
                </div>
              ) : null}

              {/* insertion indicator */}
              {dropRect && dropTarget && dropTarget.id !== moving?.id ? (
                <div
                  className="pointer-events-none absolute z-40"
                  style={{
                    left: dropRect.left,
                    top:
                      dropTarget.position === 'inside'
                        ? dropRect.top
                        : dropTarget.position === 'before'
                        ? dropRect.top
                        : dropRect.top + dropRect.height,
                    width: dropRect.width,
                    height: dropTarget.position === 'inside' ? dropRect.height : 2,
                  }}
                >
                  {dropTarget.position === 'inside' ? (
                    <div className="absolute inset-0 rounded-sm border-2 border-accent bg-accent/[0.08]" />
                  ) : (
                    <div className="h-[2px] w-full rounded-full bg-accent shadow-[0_0_10px_rgba(124,92,255,0.9)]" />
                  )}
                </div>
              ) : null}

              {moving ? (
                <div className="pointer-events-none absolute left-1/2 top-3 z-50 -translate-x-1/2 rounded-md border border-accent/30 bg-[#15102a]/95 px-2.5 py-1 text-[10px] font-medium text-[#cbbcff] shadow-xl backdrop-blur">
                  Moving “{moving.name}” — release to drop
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <CanvasStatusBar count={flat.length} />
    </div>
  );
}

function CanvasStatusBar({ count }: { count: number }) {
  const device = useStore((s) => s.device);
  const zoom = useStore((s) => s.zoom);
  const setZoom = useStore((s) => s.setZoom);

  return (
    <div className="relative z-10 flex h-9 shrink-0 items-center gap-3 border-t border-white/[0.06] bg-[#0a0a11] px-4 text-[10.5px] text-[#5f5f78]">
      <span className="flex items-center gap-1.5">
        <Move size={11} /> {count} elements
      </span>
      <span className="h-3 w-px bg-white/[0.08]" />
      <span className="uppercase tracking-[0.1em]">{device}</span>
      <div className="ml-auto flex items-center gap-1">
        {[0.5, 0.75, 1, 1.25].map((value) => (
          <button
            key={value}
            onClick={() => setZoom(value)}
            className={cn(
              'rounded px-1.5 py-0.5 text-[10px] transition',
              Math.abs(zoom - value) < 0.01
                ? 'bg-white/[0.08] text-white'
                : 'text-[#5f5f78] hover:text-white'
            )}
          >
            {Math.round(value * 100)}%
          </button>
        ))}
        <button onClick={() => setZoom(1)} className="ml-1 rounded px-1.5 py-0.5 text-[10px] hover:text-white">
          Reset
        </button>
      </div>
    </div>
  );
}
