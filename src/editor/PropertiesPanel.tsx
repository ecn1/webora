import React, { useMemo, useState } from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Code2,
  Copy,
  Info,
  Layers,
  Link2,
  Lock,
  MousePointerClick,
  RotateCcw,
  Settings2,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Breakpoint, WebElement } from '../types';
import { findElement } from '../lib/docEngine';
import { bridge } from '../lib/bridge';
import { cn, slugify } from '../lib/utils';
import { Button, Field, Input, Segmented, Select, Textarea, Toggle } from '../components/ui';
import { elementIcon, elementLabel } from './elementIcons';
import { ICON_SVG } from '../lib/codegen';

type Target = Breakpoint | 'hover';

const FONT_WEIGHTS = ['300', '400', '500', '600', '700', '800', '900'];
const DISPLAYS = ['', 'block', 'inline-block', 'flex', 'inline-flex', 'grid', 'inline-grid', 'none'];

export function PropertiesPanel() {
  const current = useStore((s) => s.current);
  const pageId = useStore((s) => s.selectedPageId);
  const selectedId = useStore((s) => s.selectedId);

  const page = current?.pages.find((p) => p.id === pageId) ?? current?.pages[0] ?? null;
  const selected = useMemo(() => {
    if (!page || !selectedId) return null;
    return findElement(page.elements, selectedId)?.el ?? null;
  }, [page, selectedId]);

  if (!page || !current) return null;
  if (!selected) return <PageInspector />;
  return <ElementInspector el={selected} pageId={page.id} />;
}

/* ------------------------------- page inspector ------------------------------ */

function PageInspector() {
  const current = useStore((s) => s.current)!;
  const pageId = useStore((s) => s.selectedPageId);
  const updatePageMeta = useStore((s) => s.updatePageMeta);
  const renamePage = useStore((s) => s.renamePage);
  const updateCurrentName = useStore((s) => s.updateCurrentName);
  const commit = useStore((s) => s.commit);
  const setUI = useStore((s) => s.setUI);
  const setView = useStore((s) => s.setView);
  const page = current.pages.find((p) => p.id === pageId) ?? current.pages[0];

  if (!page) return null;

  const customKeys = (['html', 'css', 'js'] as const).filter((k) => !!page.custom?.[k]);
  const projectCustom = (['html', 'css', 'js'] as const).filter((k) => !!current.custom[k]);

  return (
    <aside className="flex w-[292px] shrink-0 flex-col border-l border-white/[0.06] bg-[#0a0a11]">
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent-soft">
          <Settings2 size={13} />
        </span>
        <div className="min-w-0">
          <div className="text-[11.5px] font-semibold text-white">Page settings</div>
          <div className="text-[9.5px] text-[#5f5f78]">Nothing selected · editing the page</div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        <Section title="Page" defaultOpen>
          <Field label="Name">
            <Input
              value={page.name}
              onChange={(e) => renamePage(page.id, e.target.value)}
              className="h-8 text-[12px]"
            />
          </Field>
          <Field label="URL path" hint="Home is / . Other pages export as separate HTML files.">
            <Input
              value={page.path}
              onChange={(e) => {
                const raw = e.target.value;
                updatePageMeta(page.id, {
                  path: raw === '/' ? '/' : `/${slugify(raw.replace(/^\//, ''))}`,
                });
              }}
              className="h-8 font-mono text-[11.5px]"
            />
          </Field>
          <Field label="Browser title">
            <Input
              value={page.title}
              onChange={(e) => updatePageMeta(page.id, { title: e.target.value })}
              className="h-8 text-[12px]"
            />
          </Field>
          <Field label="Meta description">
            <Textarea
              value={page.description}
              onChange={(e) => updatePageMeta(page.id, { description: e.target.value })}
              placeholder="A short description for search engines…"
              className="min-h-[62px] text-[11.5px]"
            />
          </Field>
        </Section>

        <Section title="Site">
          <Field label="Website name">
            <Input
              value={current.name}
              onChange={(e) => updateCurrentName(e.target.value)}
              className="h-8 text-[12px]"
            />
          </Field>
          <Field label="Fallback SEO title" hint="Used when a page has no title of its own.">
            <Input
              value={current.settings.seoTitle}
              onChange={(e) =>
                commit((p) => {
                  p.settings.seoTitle = e.target.value;
                }, { coalesceKey: 'seo-title' })
              }
              className="h-8 text-[12px]"
            />
          </Field>
          <Field label="Fallback description">
            <Textarea
              value={current.settings.seoDescription}
              onChange={(e) =>
                commit((p) => {
                  p.settings.seoDescription = e.target.value;
                }, { coalesceKey: 'seo-desc' })
              }
              className="min-h-[56px] text-[11.5px]"
            />
          </Field>
        </Section>

        <Section title="Custom code">
          <div className="flex flex-wrap gap-1.5">
            {customKeys.length ? (
              customKeys.map((kind) => (
                <span key={kind} className="chip border-emerald-400/20 text-emerald-300">
                  {kind.toUpperCase()} override
                </span>
              ))
            ) : (
              <span className="text-[10.5px] leading-relaxed text-[#5f5f78]">
                No page-level code overrides. Visual elements generate clean HTML automatically.
              </span>
            )}
            {projectCustom.length ? (
              <span className="chip border-amber-400/20 text-amber-300">Project {projectCustom.join('/')} override</span>
            ) : null}
          </div>
          <Button variant="secondary" size="sm" icon={Code2} onClick={() => setUI({ codeOpen: true })}>
            Open Code Studio
          </Button>
          <p className="text-[10px] leading-relaxed text-[#57576e]">
            Code Studio edits the real HTML, CSS and JS for this page. Overrides replace generated markup in preview
            and export.
          </p>
        </Section>

        <div className="rounded-xl border border-accent/20 bg-accent/[0.05] p-3">
          <div className="flex items-center gap-1.5 text-[10.5px] font-medium text-[#c3b3f0]">
            <Sparkles size={12} /> Need content?
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-[#7f7699]">
            Generate a full page or section with AI, then fine-tune it here.
          </p>
          <button
            onClick={() => setView('aistudio')}
            className="mt-2 flex items-center gap-1 text-[10.5px] font-semibold text-[#b9a9ea] hover:text-white"
          >
            Open AI Studio <Wand2 size={10} />
          </button>
        </div>
      </div>
    </aside>
  );
}

/* ----------------------------- element inspector ----------------------------- */

function ElementInspector({ el, pageId }: { el: WebElement; pageId: string }) {
  const device = useStore((s) => s.device);
  const setStyle = useStore((s) => s.setStyle);
  const setStyleBulk = useStore((s) => s.setStyleBulk);
  const setContent = useStore((s) => s.setContent);
  const setName = useStore((s) => s.setName);
  const setProp = useStore((s) => s.setProp);
  const commit = useStore((s) => s.commit);
  const deleteSelected = useStore((s) => s.deleteSelected);
  const duplicateSelected = useStore((s) => s.duplicateSelected);
  const moveSelected = useStore((s) => s.moveSelected);
  const setUI = useStore((s) => s.setUI);
  const addAssets = useStore((s) => s.addAssets);
  const toast = useStore((s) => s.toast);
  const current = useStore((s) => s.current);

  const [tab, setTab] = useState<'design' | 'content' | 'advanced'>('design');
  const [busyAsset, setBusyAsset] = useState(false);

  const Icon = elementIcon(el.type);
  const bucket: Record<string, string> =
    device === 'desktop' ? el.style : el.responsive[device];
  const effective: Record<string, string> = (() => {
    const base = { ...el.style };
    if (device === 'tablet' || device === 'mobile') Object.assign(base, el.responsive.tablet);
    if (device === 'mobile') Object.assign(base, el.responsive.mobile);
    return base;
  })();

  const styleValue = (key: string) => bucket[key] ?? '';
  const inherited = (key: string) => (device === 'desktop' ? '' : effective[key] ?? '');
  const writeStyle = (key: string, value: string) => setStyle(key, value, device as Target);

  const copyEffective = () => {
    setStyleBulk({ ...effective }, device as Target);
    toast(`Styles copied to ${device}`, 'success');
  };

  const clearBucket = () => {
    commit((p) => {
      const pg = p.pages.find((x) => x.id === pageId);
      if (!pg) return;
      const found = findElement(pg.elements, el.id);
      if (!found || device === 'desktop') return;
      found.el.responsive[device] = {};
    });
  };

  const images = (current?.assets ?? []).filter((a) => a.type.startsWith('image/'));

  const pickImage = async () => {
    setBusyAsset(true);
    try {
      const picked = await bridge.pickAssets();
      const image = picked.find((p) => p.type.startsWith('image/'));
      if (!image) {
        toast('Choose an image file', 'info');
        return;
      }
      await addAssets(picked.filter((p) => p.type.startsWith('image/')));
      setProp('src', image.dataUrl);
      if (!el.props.alt || el.props.alt === 'Image') setProp('alt', image.name);
    } catch {
      toast('Image import failed', 'error');
    } finally {
      setBusyAsset(false);
    }
  };

  const pickImageInto = async (prop: 'image' | 'poster') => {
    setBusyAsset(true);
    try {
      const picked = await bridge.pickAssets();
      const image = picked.find((p) => p.type.startsWith('image/'));
      if (!image) {
        toast('Choose an image file', 'info');
        return;
      }
      await addAssets(picked.filter((p) => p.type.startsWith('image/')));
      setProp(prop, image.dataUrl);
    } catch {
      toast('Image import failed', 'error');
    } finally {
      setBusyAsset(false);
    }
  };

  const textTypes = [
    'heading',
    'paragraph',
    'text',
    'button',
    'link',
    'breadcrumbs',
    'checkbox',
    'radio',
    'submit',
    'accordion',
    'footer',
    'icon',
    'modal',
    'mail',
  ];
  const showContent = textTypes.includes(el.type);

  return (
    <aside className="flex w-[292px] shrink-0 flex-col border-l border-white/[0.06] bg-[#0a0a11]">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent-soft">
            <Icon size={13} />
          </span>
          <Input
            value={el.name}
            onChange={(e) => setName(e.target.value)}
            className="h-7 min-w-0 flex-1 border-transparent bg-transparent px-1.5 text-[11.5px] font-semibold hover:border-white/10"
          />
          <div className="flex shrink-0 items-center">
            <IconAction icon={ArrowUp} label="Move up" onClick={() => moveSelected('up')} />
            <IconAction icon={ArrowDown} label="Move down" onClick={() => moveSelected('down')} />
            <IconAction icon={Copy} label="Duplicate" onClick={duplicateSelected} />
            <IconAction icon={Trash2} label="Delete" danger onClick={deleteSelected} />
          </div>
        </div>
        <div className="mt-1.5 flex items-center gap-2 pl-9">
          <span className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-wider text-[#6f6f88]">
            {elementLabel(el.type)}
          </span>
          <span className="truncate font-mono text-[8.5px] text-[#3f3f54]">{el.id}</span>
        </div>
        <div className="mt-2.5">
          <Segmented
            value={tab}
            onChange={setTab}
            className="w-full"
            options={[
              { value: 'design', label: 'Design' },
              { value: 'content', label: 'Content' },
              { value: 'advanced', label: 'Advanced' },
            ]}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-2">
          <div className="flex items-center gap-1.5">
            {(['desktop', 'tablet', 'mobile'] as Breakpoint[]).map((bp) => (
              <span
                key={bp}
                className={cn(
                  'rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider',
                  device === bp ? 'bg-accent/20 text-[#c8baff]' : 'text-[#3f3f54]'
                )}
              >
                {bp === 'desktop' ? 'base' : bp}
              </span>
            ))}
          </div>
          {device !== 'desktop' ? (
            <div className="flex items-center gap-1">
              <IconAction icon={Layers} label="Copy effective styles to this breakpoint" onClick={copyEffective} />
              <IconAction icon={RotateCcw} label="Clear this breakpoint" onClick={clearBucket} danger />
            </div>
          ) : null}
        </div>

        {tab === 'design' ? (
          <div className="space-y-1 p-3">
            <Section title="Layout" defaultOpen>
              <div className="grid grid-cols-2 gap-2">
                <StyleSelect
                  label="Display"
                  value={styleValue('display')}
                  placeholder={inherited('display') || 'block'}
                  options={DISPLAYS.map((d) => ({ value: d, label: d || 'default' }))}
                  onChange={(v) => writeStyle('display', v)}
                />
                <StyleSelect
                  label="Position"
                  value={styleValue('position')}
                  placeholder={inherited('position') || 'static'}
                  options={['', 'static', 'relative', 'absolute', 'fixed', 'sticky'].map((v) => ({
                    value: v,
                    label: v || 'default',
                  }))}
                  onChange={(v) => writeStyle('position', v)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <StyleInput
                  label="Width"
                  value={styleValue('width')}
                  placeholder={inherited('width') || 'auto'}
                  onChange={(v) => writeStyle('width', v)}
                />
                <StyleInput
                  label="Height"
                  value={styleValue('height')}
                  placeholder={inherited('height') || 'auto'}
                  onChange={(v) => writeStyle('height', v)}
                />
              </div>
              <StyleInput
                label="Max width"
                value={styleValue('max-width')}
                placeholder={inherited('max-width') || 'none'}
                onChange={(v) => writeStyle('max-width', v)}
              />
              <div className="grid grid-cols-2 gap-2">
                <StyleInput
                  label="Gap"
                  value={styleValue('gap')}
                  placeholder={inherited('gap') || '0'}
                  onChange={(v) => writeStyle('gap', v)}
                />
                <StyleInput
                  label="Flex direction"
                  value={styleValue('flex-direction')}
                  placeholder={inherited('flex-direction') || 'row'}
                  onChange={(v) => writeStyle('flex-direction', v)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <StyleInput
                  label="Align items"
                  value={styleValue('align-items')}
                  placeholder={inherited('align-items') || 'stretch'}
                  onChange={(v) => writeStyle('align-items', v)}
                />
                <StyleInput
                  label="Justify"
                  value={styleValue('justify-content')}
                  placeholder={inherited('justify-content') || 'flex-start'}
                  onChange={(v) => writeStyle('justify-content', v)}
                />
              </div>
              <StyleInput
                label="Grid columns"
                value={styleValue('grid-template-columns')}
                placeholder={inherited('grid-template-columns') || 'none'}
                onChange={(v) => writeStyle('grid-template-columns', v)}
              />
            </Section>

            <Section title="Spacing" defaultOpen>
              <StyleInput
                label="Padding"
                value={styleValue('padding')}
                placeholder={inherited('padding') || '0'}
                onChange={(v) => writeStyle('padding', v)}
              />
              <StyleInput
                label="Margin"
                value={styleValue('margin')}
                placeholder={inherited('margin') || '0'}
                onChange={(v) => writeStyle('margin', v)}
              />
            </Section>

            <Section title="Typography" defaultOpen>
              <StyleInput
                label="Font family"
                value={styleValue('font-family')}
                placeholder={inherited('font-family') || 'Inter, sans-serif'}
                onChange={(v) => writeStyle('font-family', v)}
              />
              <div className="grid grid-cols-2 gap-2">
                <StyleInput
                  label="Font size"
                  value={styleValue('font-size')}
                  placeholder={inherited('font-size') || '16px'}
                  onChange={(v) => writeStyle('font-size', v)}
                />
                <StyleSelect
                  label="Weight"
                  value={styleValue('font-weight')}
                  placeholder={inherited('font-weight') || '400'}
                  options={FONT_WEIGHTS.map((w) => ({ value: w, label: w }))}
                  onChange={(v) => writeStyle('font-weight', v)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <StyleInput
                  label="Line height"
                  value={styleValue('line-height')}
                  placeholder={inherited('line-height') || 'normal'}
                  onChange={(v) => writeStyle('line-height', v)}
                />
                <StyleInput
                  label="Letter spacing"
                  value={styleValue('letter-spacing')}
                  placeholder={inherited('letter-spacing') || 'normal'}
                  onChange={(v) => writeStyle('letter-spacing', v)}
                />
              </div>
              <div>
                <span className="label">Text align</span>
                <div className="flex items-center gap-1">
                  {[
                    { value: 'left', icon: AlignLeft },
                    { value: 'center', icon: AlignCenter },
                    { value: 'right', icon: AlignRight },
                    { value: 'justify', icon: AlignJustify },
                  ].map((item) => {
                    const active = (bucket['text-align'] ?? effective['text-align']) === item.value;
                    return (
                      <button
                        key={item.value}
                        onClick={() => writeStyle('text-align', active ? '' : item.value)}
                        className={cn(
                          'flex h-7 flex-1 items-center justify-center rounded-md border transition',
                          active
                            ? 'border-accent/40 bg-accent/15 text-accent-soft'
                            : 'border-white/[0.08] text-[#7d7d96] hover:text-white'
                        )}
                      >
                        <item.icon size={13} />
                      </button>
                    );
                  })}
                </div>
              </div>
              <ColorField
                label="Text color"
                value={styleValue('color')}
                placeholder={inherited('color') || '#e8e8f2'}
                onChange={(v) => writeStyle('color', v)}
              />
            </Section>

            <Section title="Appearance" defaultOpen>
              <ColorField
                label="Background"
                value={styleValue('background') || styleValue('background-color')}
                placeholder={inherited('background') || 'transparent'}
                onChange={(v) => writeStyle('background', v)}
              />
              <div className="grid grid-cols-2 gap-2">
                <StyleInput
                  label="Radius"
                  value={styleValue('border-radius')}
                  placeholder={inherited('border-radius') || '0'}
                  onChange={(v) => writeStyle('border-radius', v)}
                />
                <StyleInput
                  label="Opacity"
                  value={styleValue('opacity')}
                  placeholder={inherited('opacity') || '1'}
                  onChange={(v) => writeStyle('opacity', v)}
                />
              </div>
              <StyleInput
                label="Border"
                value={styleValue('border')}
                placeholder={inherited('border') || 'none'}
                onChange={(v) => writeStyle('border', v)}
              />
              <StyleInput
                label="Shadow"
                value={styleValue('box-shadow')}
                placeholder={inherited('box-shadow') || 'none'}
                onChange={(v) => writeStyle('box-shadow', v)}
              />
              <StyleInput
                label="Overflow"
                value={styleValue('overflow')}
                placeholder={inherited('overflow') || 'visible'}
                onChange={(v) => writeStyle('overflow', v)}
              />
            </Section>

            <Section title="Hover state">
              <p className="text-[10px] leading-relaxed text-[#5f5f78]">
                These rules apply while the visitor hovers this element.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <ColorField
                  label="Background"
                  compact
                  value={el.hover['background'] ?? ''}
                  placeholder={el.style.background || 'transparent'}
                  onChange={(v) => setStyle('background', v, 'hover')}
                />
                <ColorField
                  label="Text"
                  compact
                  value={el.hover['color'] ?? ''}
                  placeholder={el.style.color || '#fff'}
                  onChange={(v) => setStyle('color', v, 'hover')}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <StyleInput
                  label="Transform"
                  value={el.hover['transform'] ?? ''}
                  placeholder="none"
                  onChange={(v) => setStyle('transform', v, 'hover')}
                />
                <StyleInput
                  label="Shadow"
                  value={el.hover['box-shadow'] ?? ''}
                  placeholder="none"
                  onChange={(v) => setStyle('box-shadow', v, 'hover')}
                />
              </div>
              <StyleInput
                label="Border color"
                value={el.hover['border-color'] ?? ''}
                placeholder="inherit"
                onChange={(v) => setStyle('border-color', v, 'hover')}
              />
            </Section>
          </div>
        ) : null}

        {tab === 'content' ? (
          <div className="space-y-4 p-4">
            {showContent ? (
              <Field
                label={el.type === 'heading' ? 'Heading text' : 'Content'}
                hint={el.type === 'accordion' ? 'This is the question shown in the accordion header.' : undefined}
              >
                <Textarea
                  value={el.content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[84px] text-[12px]"
                />
              </Field>
            ) : null}

            {el.type === 'heading' ? (
              <Field label="Level">
                <Select value={el.props.level || 'h2'} onChange={(e) => setProp('level', e.target.value)}>
                  {['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((level) => (
                    <option key={level} value={level}>
                      {level.toUpperCase()}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}

            {el.type === 'button' || el.type === 'link' ? (
              <Field label="Link target" hint="Use #section-id for in-page anchors.">
                <div className="relative">
                  <Link2 size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5b5b73]" />
                  <Input
                    value={el.props.href || ''}
                    onChange={(e) => setProp('href', e.target.value)}
                    placeholder="#"
                    className="h-8 pl-8 font-mono text-[11px]"
                  />
                </div>
              </Field>
            ) : null}

            {el.type === 'image' ? (
              <>
                <Field label="Image source" hint="Paste a URL or pick an asset stored in this project.">
                  <Input
                    value={el.props.src?.startsWith('data:') ? 'Embedded asset' : el.props.src || ''}
                    onChange={(e) => setProp('src', e.target.value)}
                    placeholder="https://…"
                    className="h-8 text-[11px]"
                  />
                </Field>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Upload}
                    loading={busyAsset}
                    onClick={pickImage}
                    className="flex-1"
                  >
                    Upload image
                  </Button>
                </div>
                {images.length ? (
                  <Field label="Project assets">
                    <div className="grid grid-cols-4 gap-1.5">
                      {images.slice(0, 8).map((asset) => (
                        <button
                          key={asset.id}
                          onClick={() => {
                            setProp('src', asset.dataUrl);
                            if (!el.props.alt || el.props.alt === 'Image') setProp('alt', asset.name);
                          }}
                          title={asset.name}
                          className={cn(
                            'checker h-12 overflow-hidden rounded border transition',
                            el.props.src === asset.dataUrl
                              ? 'border-accent ring-1 ring-accent/40'
                              : 'border-white/10 hover:border-white/30'
                          )}
                        >
                          <img src={asset.dataUrl} alt={asset.name} className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </Field>
                ) : null}
                <Field label="Alt text" hint="Describe the image for screen readers and SEO.">
                  <Input
                    value={el.props.alt || ''}
                    onChange={(e) => setProp('alt', e.target.value)}
                    className="h-8 text-[12px]"
                  />
                </Field>
              </>
            ) : null}

            {el.type === 'video' ? (
              <>
                <Field
                  label="Video URL"
                  hint="YouTube, Vimeo, or a direct MP4/WebM URL play in preview and export. Uploaded videos are stored with the project."
                >
                  <Input
                    value={el.props.src || ''}
                    onChange={(e) => setProp('src', e.target.value)}
                    placeholder="https://youtube.com/watch?v=… or https://…/clip.mp4"
                    className="h-8 text-[11px]"
                  />
                </Field>
                <Field label="Title" hint="Accessible name for embedded players.">
                  <Input
                    value={el.props.title || ''}
                    onChange={(e) => setProp('title', e.target.value)}
                    placeholder="Product walkthrough"
                    className="h-8 text-[12px]"
                  />
                </Field>
                <div className="flex items-center justify-between rounded-lg border border-white/[0.06] px-2.5 py-2">
                  <span className="text-[11.5px] text-[#b9b9ce]">Show player controls</span>
                  <Toggle
                    checked={el.props.controls !== 'false'}
                    onChange={(value) => setProp('controls', value ? 'true' : 'false')}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/[0.06] px-2.5 py-2">
                  <span className="text-[11.5px] text-[#b9b9ce]">Autoplay (muted)</span>
                  <Toggle
                    checked={el.props.autoplay === 'true'}
                    onChange={(value) => setProp('autoplay', value ? 'true' : 'false')}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/[0.06] px-2.5 py-2">
                  <span className="text-[11.5px] text-[#b9b9ce]">Loop video</span>
                  <Toggle
                    checked={el.props.loop === 'true'}
                    onChange={(value) => setProp('loop', value ? 'true' : 'false')}
                  />
                </div>
                <Field label="Poster image" hint="Optional preview image shown before a direct video plays.">
                  <div className="flex gap-2">
                    <Input
                      value={el.props.poster?.startsWith('data:') ? 'Embedded asset' : el.props.poster || ''}
                      onChange={(e) => setProp('poster', e.target.value)}
                      placeholder="https://…/poster.jpg"
                      className="h-8 min-w-0 flex-1 text-[11px]"
                    />
                    <Button variant="secondary" size="sm" icon={Upload} loading={busyAsset} onClick={() => void pickImageInto('poster')}>
                      Pick
                    </Button>
                  </div>
                </Field>
              </>
            ) : null}

            {el.type === 'icon' ? (
              <>
                <Field label="Built-in icon" hint="Built-in SVG icons render crisply in every export.">
                  <div className="grid grid-cols-3 gap-1.5">
                    {Object.keys(ICON_SVG).map((glyph) => (
                      <button
                        key={glyph}
                        onClick={() => {
                          setProp('glyph', glyph);
                          if (el.props.image) setProp('image', '');
                        }}
                        className={cn(
                          'flex flex-col items-center gap-1 rounded-lg border py-2 text-[9px] capitalize transition',
                          (el.props.glyph || '') === glyph && !el.props.image
                            ? 'border-accent/50 bg-accent/10 text-white'
                            : 'border-white/[0.07] text-[#8b8ba4] hover:border-white/20'
                        )}
                      >
                        <span
                          className="text-[#c9baff] [&_svg]:h-6 [&_svg]:w-6"
                          dangerouslySetInnerHTML={{ __html: ICON_SVG[glyph] }}
                        />
                        {glyph}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Custom icon image" hint="Upload a PNG or SVG to use your own icon instead of a built-in glyph.">
                  <div className="flex gap-2">
                    <Input
                      value={el.props.image?.startsWith('data:') ? 'Embedded icon' : el.props.image || ''}
                      onChange={(e) => setProp('image', e.target.value)}
                      placeholder="https://…/icon.svg"
                      className="h-8 min-w-0 flex-1 text-[11px]"
                    />
                    <Button variant="secondary" size="sm" icon={Upload} loading={busyAsset} onClick={() => void pickImageInto('image')}>
                      Pick
                    </Button>
                  </div>
                </Field>
                {el.props.image ? (
                  <button
                    onClick={() => setProp('image', '')}
                    className="text-[10.5px] text-[#8b8ba4] underline-offset-4 hover:text-white hover:underline"
                  >
                    Remove custom image
                  </button>
                ) : null}
                {images.length ? (
                  <Field label="Project assets">
                    <div className="grid grid-cols-5 gap-1.5">
                      {images.slice(0, 10).map((asset) => (
                        <button
                          key={asset.id}
                          onClick={() => setProp('image', asset.dataUrl)}
                          title={asset.name}
                          className={cn(
                            'checker h-10 overflow-hidden rounded border transition',
                            el.props.image === asset.dataUrl
                              ? 'border-accent ring-1 ring-accent/40'
                              : 'border-white/10 hover:border-white/30'
                          )}
                        >
                          <img src={asset.dataUrl} alt={asset.name} className="h-full w-full object-contain p-1" />
                        </button>
                      ))}
                    </div>
                  </Field>
                ) : null}
              </>
            ) : null}

            {el.type === 'input' || el.type === 'emailInput' || el.type === 'textarea' || el.type === 'select' ? (
              <>
                <Field label="Label" hint="Shown above the field and recorded with each form response.">
                  <Input
                    value={el.props.label || ''}
                    onChange={(e) => setProp('label', e.target.value)}
                    placeholder={el.content || 'Label'}
                    className="h-8 text-[12px]"
                  />
                </Field>
                <Field label="Field name" hint="Stored with the response. Use unique names for each field.">
                  <Input
                    value={el.props.name || ''}
                    onChange={(e) => setProp('name', e.target.value)}
                    placeholder={slugify(el.props.label || el.content || 'field').replace(/-/g, '_')}
                    className="h-8 font-mono text-[11px]"
                  />
                </Field>
                <Field label="Placeholder">
                  <Input
                    value={el.props.placeholder || ''}
                    onChange={(e) => setProp('placeholder', e.target.value)}
                    className="h-8 text-[12px]"
                  />
                </Field>
                <div className="flex items-center justify-between rounded-lg border border-white/[0.06] px-2.5 py-2">
                  <span className="text-[11.5px] text-[#b9b9ce]">Required</span>
                  <Toggle
                    checked={el.props.required === 'true'}
                    onChange={(value) => setProp('required', value ? 'true' : 'false')}
                  />
                </div>
              </>
            ) : null}

            {el.type === 'checkbox' || el.type === 'radio' ? (
              <>
                <Field label="Field name" hint="Used to group answers in the Forms workspace.">
                  <Input
                    value={el.props.name || (el.type === 'radio' ? el.props.group || 'group' : '')}
                    onChange={(e) => setProp('name', e.target.value)}
                    placeholder={el.type === 'radio' ? 'plan' : 'updates'}
                    className="h-8 font-mono text-[11px]"
                  />
                </Field>
                {el.type === 'radio' ? (
                  <Field label="Group name" hint="Radios with the same group form one selection.">
                    <Input
                      value={el.props.group || 'group'}
                      onChange={(e) => setProp('group', e.target.value)}
                      className="h-8 text-[11.5px]"
                    />
                  </Field>
                ) : (
                  <Field label="Submitted value" hint="Recorded when the box is checked.">
                    <Input
                      value={el.props.value || 'Yes'}
                      onChange={(e) => setProp('value', e.target.value)}
                      className="h-8 text-[11.5px]"
                    />
                  </Field>
                )}
                <div className="flex items-center justify-between rounded-lg border border-white/[0.06] px-2.5 py-2">
                  <span className="text-[11.5px] text-[#b9b9ce]">Required</span>
                  <Toggle
                    checked={el.props.required === 'true'}
                    onChange={(value) => setProp('required', value ? 'true' : 'false')}
                  />
                </div>
              </>
            ) : null}

            {el.type === 'select' ? (
              <>
                <Field label="Options" hint="Comma-separated. Each becomes an option in the export.">
                  <Input
                    value={el.props.options || ''}
                    onChange={(e) => setProp('options', e.target.value)}
                    className="h-8 text-[11.5px]"
                  />
                </Field>
                <div className="flex items-center justify-between rounded-lg border border-white/[0.06] px-2.5 py-2">
                  <span className="text-[11.5px] text-[#b9b9ce]">Required</span>
                  <Toggle
                    checked={el.props.required === 'true'}
                    onChange={(value) => setProp('required', value ? 'true' : 'false')}
                  />
                </div>
              </>
            ) : null}

            {el.type === 'tabs' ? (
              <>
                <Field label="Tab labels" hint="Comma-separated labels.">
                  <Input
                    value={el.props.tabs || ''}
                    onChange={(e) => setProp('tabs', e.target.value)}
                    className="h-8 text-[11.5px]"
                  />
                </Field>
                <Field label="Behaviour">
                  <Select value={el.props.mode || 'content'} onChange={(e) => setProp('mode', e.target.value)}>
                    <option value="content">Show content panels</option>
                    <option value="navigate">Open pages or URLs</option>
                  </Select>
                </Field>
                {el.props.mode === 'navigate' ? (
                  <Field
                    label="Targets"
                    hint="Comma-separated page paths or full https:// URLs, in the same order as the labels."
                  >
                    <Input
                      value={el.props.targets || ''}
                      onChange={(e) => setProp('targets', e.target.value)}
                      placeholder="/about, /pricing, https://example.com"
                      className="h-8 font-mono text-[10.5px]"
                    />
                  </Field>
                ) : (
                  <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-[10.5px] leading-relaxed text-[#66667f]">
                    Each tab reveals the matching child container below it. Drop different content into each panel in
                    the canvas.
                  </p>
                )}
              </>
            ) : null}

            {el.type === 'modal' ? (
              <>
                <Field label="Dialog title" hint="Shown in the dialog header.">
                  <Input
                    value={el.props.title || ''}
                    onChange={(e) => setProp('title', e.target.value)}
                    placeholder="More information"
                    className="h-8 text-[12px]"
                  />
                </Field>
                <Field label="Dialog width">
                  <Select value={el.props.size || 'md'} onChange={(e) => setProp('size', e.target.value)}>
                    <option value="sm">Small — 420px</option>
                    <option value="md">Medium — 560px</option>
                    <option value="lg">Large — 760px</option>
                  </Select>
                </Field>
                <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-[10.5px] leading-relaxed text-[#66667f]">
                  The button opens this dialog in preview and export. The content above is the button label; nest any
                  elements under the modal for the dialog body.
                </p>
              </>
            ) : null}

            {el.type === 'slider' ? (
              <>
                <Field label="Label">
                  <Input
                    value={el.props.label || ''}
                    onChange={(e) => setProp('label', e.target.value)}
                    placeholder="Amount"
                    className="h-8 text-[12px]"
                  />
                </Field>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Min">
                    <Input
                      value={el.props.min || ''}
                      onChange={(e) => setProp('min', e.target.value)}
                      placeholder="0"
                      className="h-8 text-[11.5px]"
                    />
                  </Field>
                  <Field label="Max">
                    <Input
                      value={el.props.max || ''}
                      onChange={(e) => setProp('max', e.target.value)}
                      placeholder="100"
                      className="h-8 text-[11.5px]"
                    />
                  </Field>
                  <Field label="Step">
                    <Input
                      value={el.props.step || ''}
                      onChange={(e) => setProp('step', e.target.value)}
                      placeholder="1"
                      className="h-8 text-[11.5px]"
                    />
                  </Field>
                </div>
                <Field label="Starting value">
                  <Input
                    value={el.props.value || ''}
                    onChange={(e) => setProp('value', e.target.value)}
                    placeholder="60"
                    className="h-8 text-[11.5px]"
                  />
                </Field>
                <div className="flex items-center justify-between rounded-lg border border-white/[0.06] px-2.5 py-2">
                  <span className="text-[11.5px] text-[#b9b9ce]">Show current value</span>
                  <Toggle
                    checked={el.props.showValue !== 'false'}
                    onChange={(value) => setProp('showValue', value ? 'true' : 'false')}
                  />
                </div>
                <p className="text-[10.5px] leading-relaxed text-[#5f5f78]">
                  Inside a form, the slider value is included in each response.
                </p>
              </>
            ) : null}

            {el.type === 'progress' ? (
              <>
                <Field label="Label">
                  <Input
                    value={el.props.label || ''}
                    onChange={(e) => setProp('label', e.target.value)}
                    placeholder="Progress"
                    className="h-8 text-[12px]"
                  />
                </Field>
                <Field label="Mode">
                  <Select value={el.props.mode || 'manual'} onChange={(e) => setProp('mode', e.target.value)}>
                    <option value="manual">Fixed percentage</option>
                    <option value="form">Live form completion</option>
                  </Select>
                </Field>
                {el.props.mode === 'form' ? (
                  <p className="rounded-lg border border-emerald-400/15 bg-emerald-400/[0.05] px-2.5 py-2 text-[10.5px] leading-relaxed text-emerald-200/70">
                    Place this inside a form. It fills as visitors complete fields and resets after submission.
                  </p>
                ) : (
                  <Field label="Percentage">
                    <Input
                      value={el.props.value || ''}
                      onChange={(e) => setProp('value', e.target.value)}
                      placeholder="70"
                      className="h-8 text-[11.5px]"
                    />
                  </Field>
                )}
              </>
            ) : null}

            {el.type === 'submit' ? (
              <>
                <div className="rounded-xl border border-accent/20 bg-accent/[0.06] p-3 text-[10.5px] leading-relaxed text-[#a9a9c0]">
                  Every submit button records the form response. You can also trigger email and link actions at the
                  same time.
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/[0.06] px-2.5 py-2">
                  <span className="text-[11.5px] text-[#b9b9ce]">Open email composer</span>
                  <Toggle
                    checked={el.props.sendEmail === 'true'}
                    onChange={(value) => setProp('sendEmail', value ? 'true' : 'false')}
                  />
                </div>
                {el.props.sendEmail === 'true' ? (
                  <>
                    <Field label="Send to" hint="Recipient address for the composed email.">
                      <Input
                        value={el.props.emailTo || ''}
                        onChange={(e) => setProp('emailTo', e.target.value)}
                        placeholder="hello@yourstudio.com"
                        className="h-8 text-[12px]"
                      />
                    </Field>
                    <Field label="Email subject">
                      <Input
                        value={el.props.emailSubject || ''}
                        onChange={(e) => setProp('emailSubject', e.target.value)}
                        placeholder="New form response"
                        className="h-8 text-[12px]"
                      />
                    </Field>
                  </>
                ) : null}
                <div className="flex items-center justify-between rounded-lg border border-white/[0.06] px-2.5 py-2">
                  <span className="text-[11.5px] text-[#b9b9ce]">Open a link after submit</span>
                  <Toggle
                    checked={el.props.openLink === 'true'}
                    onChange={(value) => setProp('openLink', value ? 'true' : 'false')}
                  />
                </div>
                {el.props.openLink === 'true' ? (
                  <Field label="Link target" hint="A page path, #anchor, or full https:// URL.">
                    <Input
                      value={el.props.href || ''}
                      onChange={(e) => setProp('href', e.target.value)}
                      placeholder="/thank-you"
                      className="h-8 font-mono text-[11px]"
                    />
                  </Field>
                ) : null}
              </>
            ) : null}

            {el.type === 'form' ? (
              <>
                <Field label="Form name" hint="Shown in the Forms workspace with each response.">
                  <Input
                    value={el.props.formName || ''}
                    onChange={(e) => setProp('formName', e.target.value)}
                    placeholder="Contact form"
                    className="h-8 text-[12px]"
                  />
                </Field>
                <Field label="Success message" hint="Confirmation shown after a visitor submits.">
                  <Textarea
                    value={el.props.successMessage || ''}
                    onChange={(e) => setProp('successMessage', e.target.value)}
                    className="min-h-[64px] text-[11.5px]"
                  />
                </Field>
                <div className="divider" />
                <Field
                  label="Send responses by email"
                  hint="Exported forms open the visitor's email app with the answers. Leave blank to keep responses local."
                >
                  <Input
                    value={el.props.emailTo || ''}
                    onChange={(e) => setProp('emailTo', e.target.value)}
                    placeholder="hello@yourstudio.com"
                    className="h-8 text-[12px]"
                  />
                </Field>
                <Field label="Email subject">
                  <Input
                    value={el.props.emailSubject || ''}
                    onChange={(e) => setProp('emailSubject', e.target.value)}
                    placeholder="Website enquiry"
                    className="h-8 text-[12px]"
                  />
                </Field>
                <Field
                  label="Webhook URL"
                  hint="Optional. Receives a JSON POST for every submission from the exported site."
                >
                  <Input
                    value={el.props.webhook || ''}
                    onChange={(e) => setProp('webhook', e.target.value)}
                    placeholder="https://hooks.example.com/forms"
                    className="h-8 font-mono text-[10.5px]"
                  />
                </Field>
              </>
            ) : null}

            {el.type === 'mail' ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="To">
                    <Input
                      value={el.props.to || ''}
                      onChange={(e) => setProp('to', e.target.value)}
                      placeholder="hello@studio.com"
                      className="h-8 text-[11.5px]"
                    />
                  </Field>
                  <Field label="CC">
                    <Input
                      value={el.props.cc || ''}
                      onChange={(e) => setProp('cc', e.target.value)}
                      placeholder="Optional"
                      className="h-8 text-[11.5px]"
                    />
                  </Field>
                </div>
                <Field label="Subject">
                  <Input
                    value={el.props.subject || ''}
                    onChange={(e) => setProp('subject', e.target.value)}
                    placeholder="Project enquiry"
                    className="h-8 text-[12px]"
                  />
                </Field>
                <Field label="Email body" hint="Prefilled message in the visitor's email app.">
                  <Textarea
                    value={el.props.body || ''}
                    onChange={(e) => setProp('body', e.target.value)}
                    className="min-h-[80px] text-[11.5px]"
                  />
                </Field>
                <Field label="Open in">
                  <Select value={el.props.provider || 'default'} onChange={(e) => setProp('provider', e.target.value)}>
                    <option value="default">Default email app</option>
                    <option value="gmail">Gmail compose</option>
                    <option value="outlook">Outlook compose</option>
                  </Select>
                </Field>
                <Field label="Button text">
                  <Input
                    value={el.props.buttonText || ''}
                    onChange={(e) => setProp('buttonText', e.target.value)}
                    placeholder="Open email composer"
                    className="h-8 text-[12px]"
                  />
                </Field>
                <Field label="Illustration" hint="Optional image shown above the message.">
                  <div className="flex gap-2">
                    <Input
                      value={el.props.image?.startsWith('data:') ? 'Embedded asset' : el.props.image || ''}
                      onChange={(e) => setProp('image', e.target.value)}
                      placeholder="https://…/photo.jpg"
                      className="h-8 min-w-0 flex-1 text-[11px]"
                    />
                    <Button variant="secondary" size="sm" icon={Upload} loading={busyAsset} onClick={() => void pickImageInto('image')}>
                      Pick
                    </Button>
                  </div>
                </Field>
                {el.props.image ? (
                  <button
                    onClick={() => setProp('image', '')}
                    className="text-[10.5px] text-[#8b8ba4] underline-offset-4 hover:text-white hover:underline"
                  >
                    Remove image
                  </button>
                ) : null}
              </>
            ) : null}

            {el.type === 'accordion' ? (
              <Field label="Answer">
                <Textarea
                  value={el.props.answer || ''}
                  onChange={(e) => setProp('answer', e.target.value)}
                  className="min-h-[70px] text-[11.5px]"
                />
              </Field>
            ) : null}

            {el.type === 'customHtml' ? (
              <Field label="HTML" hint="Runs only in preview and exported pages, never inside the editor canvas.">
                <Textarea
                  value={el.content}
                  onChange={(e) => setContent(e.target.value)}
                  spellCheck={false}
                  className="min-h-[150px] font-mono text-[10.5px] leading-relaxed"
                />
              </Field>
            ) : null}

            {el.type === 'customCss' ? (
              <Field label="CSS" hint="Scoped rules are injected into the exported stylesheet.">
                <Textarea
                  value={el.content}
                  onChange={(e) => setContent(e.target.value)}
                  spellCheck={false}
                  className="min-h-[150px] font-mono text-[10.5px] leading-relaxed"
                />
              </Field>
            ) : null}

            {!showContent &&
            ![
              'image',
              'video',
              'icon',
              'input',
              'emailInput',
              'textarea',
              'select',
              'checkbox',
              'radio',
              'tabs',
              'accordion',
              'slider',
              'progress',
              'form',
              'submit',
              'mail',
              'modal',
              'customHtml',
              'customCss',
              'heading',
              'button',
              'link',
            ].includes(el.type) ? (
              <div className="flex items-start gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-[10.5px] leading-relaxed text-[#66667f]">
                <Info size={13} className="mt-0.5 shrink-0" />
                This is a layout container. Drop other elements inside it on the canvas, or edit its spacing in the
                Design tab.
              </div>
            ) : null}

            <div className="divider" />
            <Button variant="secondary" size="sm" icon={Code2} onClick={() => setUI({ codeOpen: true })} className="w-full">
              Edit page code
            </Button>
          </div>
        ) : null}

        {tab === 'advanced' ? (
          <div className="space-y-4 p-4">
            <Field
              label="Element name"
              hint="Shown in the layers panel and canvas badge."
            >
              <Input value={el.name} onChange={(e) => setName(e.target.value)} className="h-8 text-[12px]" />
            </Field>
            <Field
              label="Extra CSS classes"
              hint="Space-separated classes added to the exported element. Target them from Code Studio or a CSS block."
            >
              <Input
                value={el.props.className || ''}
                onChange={(e) => setProp('className', e.target.value)}
                placeholder="feature-card glow"
                className="h-8 font-mono text-[11px]"
              />
            </Field>
            <Field label="Element ID attribute" hint="Optional HTML id for anchor links and custom CSS.">
              <Input
                value={el.props.id || ''}
                onChange={(e) => setProp('id', e.target.value)}
                placeholder="pricing"
                className="h-8 font-mono text-[11px]"
              />
            </Field>

            <div className="divider" />

            <div className="space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#5f5f78]">Structure</div>
              <div className="flex items-center gap-1.5">
                <IconAction icon={ArrowUp} label="Move up" onClick={() => moveSelected('up')} className="border border-white/[0.08]" />
                <IconAction icon={ArrowDown} label="Move down" onClick={() => moveSelected('down')} className="border border-white/[0.08]" />
                <IconAction icon={Copy} label="Duplicate" onClick={duplicateSelected} className="border border-white/[0.08]" />
                <IconAction icon={Trash2} label="Delete" danger onClick={deleteSelected} className="border border-white/[0.08]" />
              </div>
            </div>

            <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-3 text-[10px] leading-relaxed text-amber-200/80">
              <div className="flex items-center gap-1.5 font-medium">
                <Lock size={11} /> Careful
              </div>
              Deleting a container also deletes everything nested inside it. Undo is available with Ctrl+Z.
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] px-3 py-2 text-[9.5px] text-[#4f4f66]">
        <span className="flex items-center gap-1">
          <MousePointerClick size={10} /> {el.children.length} child{el.children.length === 1 ? '' : 'ren'}
        </span>
        <button
          onClick={() => setUI({ codeOpen: true })}
          className="flex items-center gap-1 font-medium text-[#7d7d96] transition hover:text-white"
        >
          <Code2 size={10} /> Code
        </button>
      </div>
    </aside>
  );
}

/* --------------------------------- controls -------------------------------- */

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/[0.05] py-1 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#77778f] transition hover:text-white"
      >
        {title}
        <ChevronDown size={12} className={cn('transition', !open && '-rotate-90')} />
      </button>
      {open ? <div className="space-y-2.5 pb-2">{children}</div> : null}
    </div>
  );
}

function IconAction({
  icon: Icon,
  label,
  onClick,
  danger,
  className,
}: {
  icon: typeof ArrowUp;
  label: string;
  onClick: () => void;
  danger?: boolean;
  className?: string;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'flex h-6 w-6 items-center justify-center rounded-md text-[#6f6f88] transition hover:bg-white/[0.07] hover:text-white',
        danger && 'hover:bg-red-500/15 hover:text-red-300',
        className
      )}
    >
      <Icon size={12} />
    </button>
  );
}

function StyleInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="input h-8 px-2 py-0 text-[11.5px]"
      />
    </Field>
  );
}

function StyleSelect({
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <Select value={value} onChange={(e) => onChange(e.target.value)} className="h-8 py-0 text-[11.5px]">
        <option value="">{placeholder ? `inherit · ${placeholder}` : 'inherit'}</option>
        {options
          .filter((o) => o.value !== '')
          .map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
      </Select>
    </Field>
  );
}

function ColorField({
  label,
  value,
  placeholder,
  onChange,
  compact,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  const hex = /^#[0-9a-f]{6}$/i.test(value)
    ? value
    : /^#[0-9a-f]{3}$/i.test(value)
    ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
    : '#7c5cff';
  return (
    <Field label={label}>
      <div className="flex items-center gap-1.5">
        <label
          className="relative h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-md border border-white/10"
          style={{
            background:
              value && value !== 'transparent'
                ? value
                : 'repeating-conic-gradient(#1a1a26 0% 25%, #101019 0% 50%) 50% / 8px 8px',
          }}
          title="Pick a color"
        >
          <input
            type="color"
            value={hex}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
        <input
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn('input h-8 min-w-0 flex-1 px-2 font-mono', compact ? 'text-[10px]' : 'text-[10.5px]')}
        />
        {value ? (
          <button
            onClick={() => onChange('')}
            title="Clear"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#5f5f78] hover:bg-white/[0.06] hover:text-white"
          >
            <RotateCcw size={10} />
          </button>
        ) : null}
      </div>
    </Field>
  );
}
