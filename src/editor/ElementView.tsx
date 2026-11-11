import React, { createContext, useContext, useState } from 'react';
import type { Breakpoint, WebElement } from '../types';
import { ICON_SVG, PLACEHOLDER_IMG, mailComposeUrl, videoEmbedUrl } from '../lib/codegen';
import { toReactStyle } from '../lib/utils';

export interface CanvasSelection {
  id: string;
  position: 'inside' | 'before' | 'after';
}

export interface CanvasContextValue {
  device: Breakpoint;
  editingId: string | null;
  dropTarget: CanvasSelection | null;
  select: (id: string | null) => void;
  beginEdit: (id: string) => void;
  commitEdit: (id: string, text: string) => void;
  cancelEdit: () => void;
}

export const CanvasContext = createContext<CanvasContextValue>({
  device: 'desktop',
  editingId: null,
  dropTarget: null,
  select: () => {},
  beginEdit: () => {},
  commitEdit: () => {},
  cancelEdit: () => {},
});

export function mergedStyle(el: WebElement, device: Breakpoint): Record<string, string> {
  const style = { ...el.style };
  if (device === 'tablet' || device === 'mobile') Object.assign(style, el.responsive.tablet);
  if (device === 'mobile') Object.assign(style, el.responsive.mobile);
  return style;
}

const EDITABLE_TYPES = new Set(['heading', 'paragraph', 'text', 'button', 'link', 'breadcrumbs']);

export function ElementView({ el }: { el: WebElement }) {
  const ctx = useContext(CanvasContext);
  const [activeTab, setActiveTab] = useState(0);
  const editing = ctx.editingId === el.id;
  const style = mergedStyle(el, ctx.device);
  const drop = ctx.dropTarget?.id === el.id ? ctx.dropTarget.position : undefined;
  const extraClass = el.props.className ? ` ${el.props.className}` : '';
  const className = `canvas-el we-${el.id}${extraClass}`;

  const select = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (editing) return;
    event.preventDefault();
    ctx.select(el.id);
  };

  const handleDoubleClick = (event: React.MouseEvent) => {
    if (!EDITABLE_TYPES.has(el.type)) return;
    event.stopPropagation();
    event.preventDefault();
    ctx.beginEdit(el.id);
  };

  const editProps: React.HTMLAttributes<HTMLElement> = editing
    ? {
        contentEditable: true,
        suppressContentEditableWarning: true,
        spellCheck: false,
        onBlur: (event) => {
          const target = event.currentTarget;
          const cancelled = target.dataset.cancel === '1';
          const text = target.innerText.replace(/\u00a0/g, ' ').replace(/\r/g, '');
          if (cancelled) {
            ctx.cancelEdit();
            return;
          }
          ctx.commitEdit(el.id, text);
        },
        onKeyDown: (event) => {
          if (event.key === 'Escape') {
            event.currentTarget.dataset.cancel = '1';
            event.currentTarget.blur();
          }
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.blur();
          }
        },
        onClick: (event: React.MouseEvent) => event.stopPropagation(),
      }
    : {};

  const common = {
    className,
    'data-el-id': el.id,
    'data-el-type': el.type,
    'data-drop': drop,
    style: toReactStyle(style),
    onClick: select,
    onDoubleClick: handleDoubleClick,
    ...editProps,
  } as unknown as React.HTMLAttributes<HTMLElement> & Record<string, unknown>;

  const kids = el.children.map((child) => <ElementView key={child.id} el={child} />);
  const content = editing ? el.content : el.content;

  switch (el.type) {
    case 'section':
      return <section {...(common as React.HTMLAttributes<HTMLElement>)}>{kids}</section>;
    case 'container':
    case 'flex':
    case 'grid':
    case 'columns':
    case 'card':
    case 'gallery':
      return <div {...(common as React.HTMLAttributes<HTMLDivElement>)}>{kids}</div>;
    case 'navbar':
      return <nav {...(common as React.HTMLAttributes<HTMLElement>)}>{kids}</nav>;
    case 'footer':
      return (
        <footer {...(common as React.HTMLAttributes<HTMLElement>)}>
          {el.content}
          {kids}
        </footer>
      );
    case 'heading': {
      const level = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(el.props.level) ? el.props.level : 'h2';
      const Tag = level as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      return <Tag {...(common as React.HTMLAttributes<HTMLHeadingElement>)}>{content}</Tag>;
    }
    case 'paragraph':
      return <p {...(common as React.HTMLAttributes<HTMLParagraphElement>)}>{content}</p>;
    case 'text':
      return <span {...(common as React.HTMLAttributes<HTMLSpanElement>)}>{content}</span>;
    case 'button':
    case 'link':
      return (
        <a
          {...(common as unknown as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
          href={el.props.href || '#'}
          draggable={false}
          onClick={(event) => {
            event.preventDefault();
            select(event);
          }}
        >
          {content}
        </a>
      );
    case 'divider':
      return <hr {...(common as React.HTMLAttributes<HTMLHRElement>)} />;
    case 'spacer':
      return <div {...(common as React.HTMLAttributes<HTMLDivElement>)} aria-hidden="true" />;
    case 'image':
      return (
        <img
          {...(common as unknown as React.ImgHTMLAttributes<HTMLImageElement>)}
          src={el.props.src || PLACEHOLDER_IMG}
          alt={el.props.alt || ''}
          draggable={false}
          onDragStart={(event) => event.preventDefault()}
        />
      );
    case 'video': {
      if (!el.props.src) {
        return (
          <div
            {...(common as React.HTMLAttributes<HTMLDivElement>)}
            style={toReactStyle({
              ...style,
              display: 'flex',
              'align-items': 'center',
              'justify-content': 'center',
              height: style.height || '320px',
              background: '#0e0e18',
              border: '1px solid #2a2a3f',
              'border-radius': '12px',
              color: '#5a5a75',
              'font-size': '13px',
            })}
          >
            Video placeholder — paste a YouTube, Vimeo or MP4 URL
          </div>
        );
      }
      const embed = videoEmbedUrl(el.props.src);
      if (embed) {
        return (
          <div {...(common as React.HTMLAttributes<HTMLDivElement>)}>
            <div style={{ position: 'relative', paddingTop: '56.25%', height: 0, overflow: 'hidden', borderRadius: 'inherit' }}>
              <iframe
                src={embed}
                title={el.props.title || 'Embedded video'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  border: 0,
                  pointerEvents: 'none',
                }}
              />
            </div>
          </div>
        );
      }
      return (
        <video
          {...(common as unknown as React.VideoHTMLAttributes<HTMLVideoElement>)}
          src={el.props.src}
          muted
          controls={false}
          playsInline
        />
      );
    }
    case 'icon': {
      if (el.props.image) {
        return (
          <span {...(common as React.HTMLAttributes<HTMLSpanElement>)}>
            <img
              src={el.props.image}
              alt={el.props.alt || el.content || 'Icon'}
              style={{ width: '1em', height: '1em', objectFit: 'contain', display: 'block' }}
              draggable={false}
            />
          </span>
        );
      }
      const svg = ICON_SVG[el.props.glyph];
      return (
        <span
          {...(common as React.HTMLAttributes<HTMLSpanElement>)}
          dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
        >
          {svg ? undefined : el.content || '✦'}
        </span>
      );
    }
    case 'breadcrumbs':
      return <div {...(common as React.HTMLAttributes<HTMLDivElement>)}>{content}</div>;
    case 'input':
    case 'emailInput':
      return (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
          {el.props.label ? (
            <span style={{ fontSize: 12, fontWeight: 600, color: '#a9a9c0' }}>{el.props.label}</span>
          ) : null}
          <input
            {...(common as unknown as React.InputHTMLAttributes<HTMLInputElement>)}
            type={el.type === 'emailInput' ? 'email' : 'text'}
            placeholder={el.props.placeholder || el.content || 'Enter text'}
            readOnly
            tabIndex={-1}
          />
        </label>
      );
    case 'textarea':
      return (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
          {el.props.label ? (
            <span style={{ fontSize: 12, fontWeight: 600, color: '#a9a9c0' }}>{el.props.label}</span>
          ) : null}
          <textarea
            {...(common as unknown as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
            placeholder={el.props.placeholder || el.content || 'Write a message'}
            readOnly
            tabIndex={-1}
          />
        </label>
      );
    case 'checkbox':
      return (
        <label {...(common as React.LabelHTMLAttributes<HTMLLabelElement>)}>
          <input type="checkbox" readOnly tabIndex={-1} /> {el.content}
        </label>
      );
    case 'radio':
      return (
        <label {...(common as React.LabelHTMLAttributes<HTMLLabelElement>)}>
          <input type="radio" readOnly tabIndex={-1} name={el.props.group || 'group'} /> {el.content}
        </label>
      );
    case 'select': {
      const options = (el.props.options || 'Option one,Option two').split(',').map((o) => o.trim());
      return (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
          {el.props.label ? (
            <span style={{ fontSize: 12, fontWeight: 600, color: '#a9a9c0' }}>{el.props.label}</span>
          ) : null}
          <select {...(common as React.SelectHTMLAttributes<HTMLSelectElement>)} tabIndex={-1}>
            {options.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
      );
    }
    case 'submit':
      return (
        <button {...(common as React.ButtonHTMLAttributes<HTMLButtonElement>)} type="button">
          {el.content}
        </button>
      );
    case 'form': {
      return (
        <div
          {...(common as React.HTMLAttributes<HTMLDivElement>)}
          data-form-name={el.props.formName || el.content}
        >
          {kids}
        </div>
      );
    }
    case 'mail': {
      const image = el.props.image;
      const to = el.props.to;
      const subject = el.props.subject;
      const href = mailComposeUrl(el.props);
      return (
        <div {...(common as React.HTMLAttributes<HTMLDivElement>)}>
          {image ? (
            <img
              src={image}
              alt={el.props.alt || 'Email illustration'}
              draggable={false}
              style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 12 }}
            />
          ) : null}
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{el.content || 'Send us an email'}</div>
          {el.props.body ? (
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: '#a3a3b8', whiteSpace: 'pre-wrap' }}>
              {el.props.body}
            </p>
          ) : null}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', fontSize: 12, color: '#8b8ba3' }}>
            <span>{to ? `To: ${to}` : 'Recipient not set'}</span>
            {subject ? <span>Subject: {subject}</span> : null}
          </div>
          <a
            href={href}
            onClick={(event) => {
              event.preventDefault();
              select(event);
            }}
            style={{
              display: 'inline-flex',
              alignSelf: 'flex-start',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '11px 20px',
              borderRadius: 10,
              background: '#7c5cff',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            {el.props.buttonText || 'Open email composer'}
          </a>
        </div>
      );
    }
    case 'accordion':
      return (
        <div {...(common as React.HTMLAttributes<HTMLDivElement>)}>
          <div style={{ padding: '16px 0', fontWeight: 600 }}>{el.content}</div>
          <p style={{ color: '#a3a3b8', lineHeight: 1.7, margin: 0 }}>{el.props.answer || 'Answer'}</p>
        </div>
      );
    case 'tabs': {
      const labels = (el.props.tabs || 'Tab one,Tab two').split(',').map((t) => t.trim());
      const targets = (el.props.targets || '').split(',').map((t) => t.trim());
      const navigate = el.props.mode === 'navigate';
      return (
        <div {...(common as React.HTMLAttributes<HTMLDivElement>)}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {labels.map((label, i) => (
              <button
                key={`${label}-${i}`}
                type="button"
                className={i === activeTab ? 'w-tab active' : 'w-tab'}
                title={navigate && targets[i] ? `Go to ${targets[i]}` : undefined}
                onClick={(event) => {
                  event.stopPropagation();
                  setActiveTab(i);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: `1px solid ${i === activeTab ? '#7c5cff' : '#2a2a3f'}`,
                  background: i === activeTab ? '#7c5cff' : 'transparent',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {navigate ? (
            <div style={{ marginTop: 8, fontSize: 10.5, color: '#6f6f8b' }}>
              Navigation tabs — each opens a page or URL when clicked in preview.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {el.children.map((child, index) => (
                <div key={child.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span
                    style={{
                      flexShrink: 0,
                      marginTop: 3,
                      borderRadius: 5,
                      border: '1px solid #2a2a3f',
                      background: index === activeTab ? 'rgba(124,92,255,.18)' : 'rgba(255,255,255,.03)',
                      color: index === activeTab ? '#c9baff' : '#6f6f8b',
                      fontSize: 8.5,
                      fontWeight: 600,
                      letterSpacing: '.08em',
                      textTransform: 'uppercase',
                      padding: '2px 5px',
                    }}
                  >
                    {labels[index] || `Panel ${index + 1}`}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <ElementView el={child} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    case 'modal': {
      const title = el.props.title || 'More information';
      return (
        <div
          {...(common as React.HTMLAttributes<HTMLDivElement>)}
          style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}
        >
          <button
            type="button"
            style={{ ...toReactStyle(style), cursor: 'pointer' }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              select(event);
            }}
          >
            {el.content || 'Open modal'}
          </button>
          <div
            style={{
              width: 320,
              maxWidth: '100%',
              borderRadius: 14,
              border: '1px dashed rgba(124,92,255,.4)',
              background: 'rgba(124,92,255,.04)',
              padding: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#e8e8f2' }}>{title}</span>
              <span style={{ fontSize: 8.5, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7c6fc0' }}>
                Dialog
              </span>
            </div>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>{kids}</div>
          </div>
        </div>
      );
    }
    case 'slider': {
      const min = el.props.min || '0';
      const max = el.props.max || '100';
      const step = el.props.step || '1';
      const value = el.props.value || '60';
      return (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 7, width: '100%' }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: '#a9a9c0' }}>
            {el.props.label || 'Value'}
            {el.props.showValue === 'false' ? null : <span style={{ color: '#d7d7e6' }}>{value}</span>}
          </span>
          <input
            {...(common as unknown as React.InputHTMLAttributes<HTMLInputElement>)}
            type="range"
            min={min}
            max={max}
            step={step}
            defaultValue={value}
            readOnly
            tabIndex={-1}
          />
        </label>
      );
    }
    case 'progress': {
      const pct = Math.max(0, Math.min(100, Number(el.props.value || 0)));
      return (
        <div {...(common as React.HTMLAttributes<HTMLDivElement>)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 7, fontSize: 12, color: '#a9a9c0' }}>
            <span>{el.props.label || 'Progress'}</span>
            <span style={{ fontWeight: 600, color: '#d7d7e6' }}>{el.props.mode === 'form' ? 'Live' : `${pct}%`}</span>
          </div>
          <div style={{ width: '100%', height: 8, borderRadius: 999, background: '#1c1c2c', overflow: 'hidden' }}>
            <div
              style={{
                width: el.props.mode === 'form' ? '0%' : `${pct}%`,
                height: '100%',
                borderRadius: 'inherit',
                background: 'linear-gradient(90deg,#6b46ff,#a78bfa)',
              }}
            />
          </div>
        </div>
      );
    }
    case 'customHtml':
      return (
        <div
          {...(common as React.HTMLAttributes<HTMLDivElement>)}
          style={{
            ...toReactStyle(style),
            minHeight: 96,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: 20,
            border: '1px dashed rgba(124,92,255,0.4)',
            borderRadius: 10,
            background: 'rgba(124,92,255,0.04)',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            color: '#a99ce0',
            fontSize: 11,
            whiteSpace: 'pre-wrap',
            overflow: 'hidden',
          }}
        >
          <span style={{ fontSize: 9, letterSpacing: '0.12em', opacity: 0.7 }}>CUSTOM HTML</span>
          <span style={{ maxHeight: 60, overflow: 'hidden', opacity: 0.8 }}>
            {el.content.slice(0, 220) || 'Empty HTML block'}
          </span>
        </div>
      );
    case 'customCss':
      return (
        <div
          className={className}
          data-el-id={el.id}
          onClick={select}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            margin: '8px 16px',
            padding: '8px 12px',
            border: '1px dashed rgba(124,92,255,0.35)',
            borderRadius: 8,
            background: 'rgba(124,92,255,0.04)',
            color: '#a99ce0',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: 10,
          }}
        >
          <span style={{ fontSize: 9, letterSpacing: '0.1em', opacity: 0.65 }}>CUSTOM CSS</span>
          <span style={{ opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {el.content.slice(0, 120) || 'Empty CSS block'}
          </span>
        </div>
      );
    default:
      return (
        <div {...(common as React.HTMLAttributes<HTMLDivElement>)}>
          {content}
          {kids}
        </div>
      );
  }
}
