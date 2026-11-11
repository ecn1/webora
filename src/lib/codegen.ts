import type { Page, Project, WebElement } from '../types';
import { escapeHtml, slugify } from './utils';

export const PLACEHOLDER_IMG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="100%" height="100%" fill="#141420"/><rect x="1" y="1" width="798" height="498" fill="none" stroke="#2a2a3f"/><text x="50%" y="50%" fill="#5a5a75" font-family="Segoe UI,Arial" font-size="22" text-anchor="middle">Image placeholder</text></svg>`
  );

export const ICON_SVG: Record<string, string> = {
  zap: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>`,
  layout: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`,
  code: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="m8 6-6 6 6 6M16 6l6 6-6 6"/></svg>`,
  rocket: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 16.5 3 21l4.5-1.5M12 15l-3-3c4-8 9-9 12-9 0 3-1 8-9 12z"/><circle cx="15" cy="9" r="1.5"/></svg>`,
  star: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 2 3 7 7 .6-5.3 4.8 1.6 7.1L12 17.8 5.7 21.5l1.6-7.1L2 9.6 8.4 9z"/></svg>`,
  check: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="m4 12 5 5L20 6"/></svg>`,
};

export function classFor(el: WebElement): string {
  return `w-${el.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

export function styleToCss(style: Record<string, string>, indent = '  '): string {
  return Object.entries(style)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${indent}${k}: ${v};`)
    .join('\n');
}

const BASE_CSS = `* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; padding: 0; background: #0a0a12; color: #e8e8f2; font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
a { color: #9b82ff; }
img { max-width: 100%; }
button { font-family: inherit; }
.w-site { overflow-x: hidden; }
.w-field { display: flex; flex-direction: column; gap: 6px; width: 100%; }
.w-field-label { font-size: 12px; font-weight: 600; color: #a9a9c0; letter-spacing: 0.01em; }
.w-form-status { border-radius: 10px; padding: 10px 12px; font-size: 13px; line-height: 1.5; }
.w-form-status[data-kind='success'] { background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.28); color: #a7f3d0; }
.w-form-status[data-kind='error'] { background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.28); color: #fecaca; }
.w-tabbar { display: flex; flex-wrap: wrap; gap: 8px; }
.w-tab { padding: 8px 16px; border-radius: 8px; border: 1px solid #2a2a3f; background: transparent; color: #b9b9ce; font-size: 13px; font-weight: 600; cursor: pointer; transition: background .15s ease, color .15s ease, border-color .15s ease; }
.w-tab:hover { border-color: #4a4a68; color: #fff; }
.w-tab.active { background: #7c5cff; border-color: #7c5cff; color: #fff; }
.w-tabpanels { width: 100%; }
.w-tabpanel[hidden] { display: none; }
.w-modal-wrap { display: inline-flex; }
.w-modal-backdrop { position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(3,3,9,0.82); backdrop-filter: blur(6px); }
.w-modal-backdrop[hidden] { display: none; }
.w-modal-dialog { position: relative; width: 100%; max-width: 560px; max-height: 88vh; overflow: auto; background: #12121e; border: 1px solid #2c2c43; border-radius: 18px; padding: 30px; box-shadow: 0 40px 120px -30px rgba(0,0,0,0.9); }
.w-modal-dialog.w-modal-sm { max-width: 420px; }
.w-modal-dialog.w-modal-lg { max-width: 760px; }
.w-modal-title { font-size: 22px; font-weight: 700; color: #fff; margin: 0 0 14px; padding-right: 28px; }
.w-modal-close { position: absolute; right: 14px; top: 12px; width: 30px; height: 30px; border-radius: 8px; border: 1px solid #2c2c43; background: #171726; color: #a9a9c0; font-size: 18px; line-height: 1; cursor: pointer; }
.w-modal-close:hover { color: #fff; border-color: #4a4a68; }
.w-embed-frame { position: relative; width: 100%; padding-top: 56.25%; height: 0; overflow: hidden; border-radius: inherit; background: #050509; }
.w-embed-frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
.w-video-embed { overflow: hidden; }
.w-icon-img { width: 1em; height: 1em; object-fit: contain; display: block; }
.w-progress-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 7px; font-size: 12px; color: #a9a9c0; }
.w-progress-value { font-variant-numeric: tabular-nums; color: #d7d7e6; font-weight: 600; }
.w-progress-track { width: 100%; height: 8px; overflow: hidden; border-radius: 999px; background: #1c1c2c; }
.w-progress-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, #6b46ff, #a78bfa); transition: width .25s ease; }
.w-slider-field { display: flex; flex-direction: column; gap: 7px; width: 100%; }
.w-slider-output { float: right; font-variant-numeric: tabular-nums; color: #d7d7e6; }
.w-mail-image { width: 100%; max-height: 240px; object-fit: cover; border-radius: 12px; }
.w-mail-title { margin: 0; font-size: 22px; line-height: 1.25; color: #fff; }
.w-mail-body { margin: 0; font-size: 14px; line-height: 1.7; color: #a3a3b8; white-space: pre-wrap; }
.w-mail-meta { display: flex; flex-wrap: wrap; gap: 8px 16px; font-size: 12px; color: #8b8ba3; }
.w-mail-button { display: inline-flex; align-items: center; justify-content: center; align-self: flex-start; gap: 8px; padding: 11px 20px; border-radius: 10px; background: #7c5cff; color: #fff; font-weight: 600; font-size: 14px; text-decoration: none; transition: filter .15s ease; }
.w-mail-button:hover { filter: brightness(1.1); }`;

export function generateCss(project: Project, opts: { minify?: boolean } = {}): string {
  const parts: string[] = [BASE_CSS];

  for (const page of project.pages) {
    for (const el of flatten(page.elements)) {
      if (el.type === 'customCss') continue;
      const cls = classFor(el);
      if (Object.keys(el.style).length) {
        parts.push(`.${cls} {\n${styleToCss(el.style)}\n}`);
      }
      if (Object.keys(el.hover).length) {
        parts.push(`.${cls}:hover {\n${styleToCss(el.hover)}\n}`);
      }
      if (Object.keys(el.responsive.tablet).length) {
        parts.push(`@media (max-width: 900px) {\n  .${cls} {\n${styleToCss(el.responsive.tablet, '    ')}\n  }\n}`);
      }
      if (Object.keys(el.responsive.mobile).length) {
        parts.push(`@media (max-width: 600px) {\n  .${cls} {\n${styleToCss(el.responsive.mobile, '    ')}\n  }\n}`);
      }
    }
  }

  for (const el of flattenAll(project)) {
    if (el.type === 'customCss' && el.content.trim()) {
      parts.push(`/* custom css: ${el.name} */\n${el.content}`);
    }
  }

  let css = parts.join('\n\n');
  if (opts.minify) {
    css = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{}:;,])\s*/g, '$1').trim();
  }
  return css;
}

function flattenAll(project: Project): WebElement[] {
  const out: WebElement[] = [];
  for (const p of project.pages) out.push(...flatten(p.elements));
  return out;
}

export function flatten(elements: WebElement[]): WebElement[] {
  const out: WebElement[] = [];
  for (const el of elements) {
    out.push(el);
    out.push(...flatten(el.children));
  }
  return out;
}

function attrs(el: WebElement): string {
  const cls = classFor(el);
  const extra = el.props.className ? ` ${el.props.className.replace(/"/g, '')}` : '';
  let out = ` class="${cls}${extra}"`;
  if (el.props.id) out += ` id="${escapeHtml(el.props.id)}"`;
  return out;
}

function renderChildren(el: WebElement, indent: string): string {
  if (!el.children.length) return '';
  return '\n' + el.children.map((c) => renderElement(c, indent + '  ')).join('\n') + '\n' + indent;
}

function splitList(value: string | undefined, fallback: string[]): string[] {
  const parts = (value || '')
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return parts.length ? parts : fallback;
}

function fieldName(el: WebElement): string {
  const raw = el.props.name || el.props.label || el.content || `field-${el.id}`;
  return slugify(raw).replace(/-/g, '_') || 'field';
}

export function youtubeId(url: string): string | null {
  const input = url.trim();
  if (!input) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([a-zA-Z0-9_-]{6,})/i,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{6,})/i,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{6,})/i,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{6,})/i,
    /(?:youtube-nocookie\.com\/embed\/)([a-zA-Z0-9_-]{6,})/i,
  ];
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function vimeoId(url: string): string | null {
  const match = url.trim().match(/vimeo\.com\/(?:video\/)?(\d{6,})/i);
  return match ? match[1] : null;
}

export function videoEmbedUrl(url: string): string | null {
  const yt = youtubeId(url);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt}?rel=0`;
  const vimeo = vimeoId(url);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo}?dnt=1`;
  return null;
}

export function mailComposeUrl(props: Record<string, string>): string {
  const to = (props.to || '').trim();
  const cc = (props.cc || '').trim();
  const subject = props.subject || '';
  const body = props.body || '';
  const provider = props.provider || 'default';

  // Build the query by hand: URLSearchParams encodes spaces as "+", which mail
  // clients render literally in mailto: fields. encodeURIComponent gives %20.
  const encode = (value: string) => encodeURIComponent(value);
  const query = [
    cc ? `cc=${encode(cc)}` : '',
    subject ? `subject=${encode(subject)}` : '',
    body ? `body=${encode(body)}` : '',
  ]
    .filter(Boolean)
    .join('&');

  if (provider === 'gmail' || provider === 'outlook') {
    const base =
      provider === 'gmail'
        ? 'https://mail.google.com/mail/?view=cm&fs=1'
        : 'https://outlook.office.com/mail/deeplink/compose';
    const webQuery = [
      to ? `to=${encode(to)}` : '',
      cc ? `cc=${encode(cc)}` : '',
      subject ? `su=${encode(subject)}` : '',
      body ? `body=${encode(body)}` : '',
    ]
      .filter(Boolean)
      .join('&');
    return `${base}${webQuery ? `&${webQuery}` : ''}`;
  }

  return `mailto:${encodeURIComponent(to).replace(/%40/g, '@')}${query ? `?${query}` : ''}`;
}

function progressValue(el: WebElement): number {
  const parsed = Number(el.props.value ?? 70);
  return Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 0;
}

export function renderElement(el: WebElement, indent = ''): string {
  const content = escapeHtml(el.content);
  const kids = renderChildren(el, indent);

  switch (el.type) {
    case 'section':
      return `${indent}<section${attrs(el)}>${kids}</section>`;
    case 'container':
    case 'flex':
    case 'grid':
    case 'columns':
    case 'card':
      return `${indent}<div${attrs(el)}>${kids}</div>`;
    case 'navbar':
      return `${indent}<nav${attrs(el)}>${kids}</nav>`;
    case 'footer':
      return `${indent}<footer${attrs(el)}>${content}${kids}</footer>`;
    case 'heading': {
      const level = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(el.props.level) ? el.props.level : 'h2';
      return `${indent}<${level}${attrs(el)}>${content}</${level}>`;
    }
    case 'paragraph':
      return `${indent}<p${attrs(el)}>${content}</p>`;
    case 'text':
      return `${indent}<span${attrs(el)}>${content}</span>`;
    case 'button':
    case 'link':
      return `${indent}<a href="${escapeHtml(el.props.href || '#')}"${attrs(el)}>${content}</a>`;
    case 'divider':
      return `${indent}<hr${attrs(el)} />`;
    case 'spacer':
      return `${indent}<div${attrs(el)} aria-hidden="true"></div>`;
    case 'image': {
      const src = el.props.src || PLACEHOLDER_IMG;
      return `${indent}<img src="${escapeHtml(src)}" alt="${escapeHtml(el.props.alt || '')}"${attrs(el)} />`;
    }
    case 'video': {
      const src = (el.props.src || '').trim();
      if (!src) {
        return `${indent}<div${attrs(el)} style="display:flex;align-items:center;justify-content:center;height:320px;background:#0e0e18;border:1px solid #2a2a3f;border-radius:12px;color:#5a5a75">Video placeholder</div>`;
      }
      const embed = videoEmbedUrl(src);
      if (embed) {
        return `${indent}<div${attrs(el)}><div class="w-embed-frame"><iframe src="${escapeHtml(
          embed
        )}" title="${escapeHtml(el.props.title || 'Embedded video')}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></div></div>`;
      }
      const controls = el.props.controls === 'false' ? '' : ' controls';
      const autoplay = el.props.autoplay === 'true' ? ' autoplay muted' : '';
      const loop = el.props.loop === 'true' ? ' loop' : '';
      const poster = el.props.poster ? ` poster="${escapeHtml(el.props.poster)}"` : '';
      return `${indent}<video src="${escapeHtml(src)}" playsinline${controls}${autoplay}${loop}${poster}${attrs(
        el
      )}></video>`;
    }
    case 'icon': {
      const image = (el.props.image || '').trim();
      if (image) {
        return `${indent}<span${attrs(el)}><img class="w-icon-img" src="${escapeHtml(
          image
        )}" alt="${escapeHtml(el.props.alt || el.content || 'Icon')}" /></span>`;
      }
      const svg = ICON_SVG[el.props.glyph] ?? '';
      return `${indent}<span${attrs(el)}>${svg || content || '✦'}</span>`;
    }
    case 'gallery':
      return `${indent}<div${attrs(el)}>${kids || ''}</div>`;
    case 'breadcrumbs':
      return `${indent}<div${attrs(el)}>${content}</div>`;
    case 'input':
    case 'emailInput': {
      const label = el.props.label || el.content || '';
      const placeholder = el.props.placeholder || label || (el.type === 'emailInput' ? 'you@example.com' : 'Enter text');
      const name = fieldName(el);
      return `${indent}<label class="w-field">${
        label ? `<span class="w-field-label">${escapeHtml(label)}</span>` : ''
      }<input type="${el.type === 'emailInput' ? 'email' : 'text'}" name="${escapeHtml(name)}" data-w-label="${escapeHtml(
        label || name
      )}" data-w-name="${escapeHtml(name)}" placeholder="${escapeHtml(placeholder)}"${
        el.props.required === 'true' ? ' required' : ''
      }${attrs(el)} /></label>`;
    }
    case 'textarea': {
      const label = el.props.label || el.content || '';
      const placeholder = el.props.placeholder || label || 'Write a message';
      const name = fieldName(el);
      return `${indent}<label class="w-field">${
        label ? `<span class="w-field-label">${escapeHtml(label)}</span>` : ''
      }<textarea name="${escapeHtml(name)}" data-w-label="${escapeHtml(label || name)}" data-w-name="${escapeHtml(
        name
      )}" placeholder="${escapeHtml(placeholder)}"${
        el.props.required === 'true' ? ' required' : ''
      }${attrs(el)}></textarea></label>`;
    }
    case 'checkbox': {
      const name = fieldName(el);
      const label = el.props.label || el.content;
      return `${indent}<label${attrs(el)}><input type="checkbox" name="${escapeHtml(
        name
      )}" value="${escapeHtml(el.props.value || 'Yes')}" data-w-label="${escapeHtml(
        label
      )}" data-w-name="${escapeHtml(name)}"${
        el.props.required === 'true' ? ' required' : ''
      } /> ${content}</label>`;
    }
    case 'radio': {
      const name = el.props.name || el.props.group || 'group';
      const label = el.props.label || el.content;
      return `${indent}<label${attrs(el)}><input type="radio" name="${escapeHtml(
        name
      )}" value="${escapeHtml(el.content || 'Option')}" data-w-label="${escapeHtml(
        label
      )}" data-w-name="${escapeHtml(name)}"${
        el.props.group ? ` data-group="${escapeHtml(el.props.group)}"` : ''
      } /> ${content}</label>`;
    }
    case 'select': {
      const options = splitList(el.props.options, ['Option one', 'Option two']);
      const label = el.props.label || el.content || '';
      const name = fieldName(el);
      return `${indent}<label class="w-field">${
        label ? `<span class="w-field-label">${escapeHtml(label)}</span>` : ''
      }<select name="${escapeHtml(name)}" data-w-label="${escapeHtml(label || name)}" data-w-name="${escapeHtml(
        name
      )}"${el.props.required === 'true' ? ' required' : ''}${attrs(el)}>${options
        .map((o) => `<option>${escapeHtml(o)}</option>`)
        .join('')}</select></label>`;
    }
    case 'submit':
      return `${indent}<button type="submit"${attrs(el)} data-w-submit data-send-email="${escapeHtml(
        el.props.sendEmail || 'false'
      )}" data-email-to="${escapeHtml(el.props.emailTo || '')}" data-email-subject="${escapeHtml(
        el.props.emailSubject || ''
      )}" data-open-link="${escapeHtml(el.props.openLink || 'false')}" data-href="${escapeHtml(
        el.props.href || ''
      )}">${content}</button>`;
    case 'accordion': {
      const answer = escapeHtml(el.props.answer || 'Answer');
      return `${indent}<details${attrs(el)}><summary style="padding:16px 0;cursor:pointer;font-weight:600">${content}</summary><p style="color:#a3a3b8;line-height:1.7">${answer}</p></details>`;
    }
    case 'tabs': {
      const labels = splitList(el.props.tabs, ['Tab one', 'Tab two']);
      const mode = el.props.mode === 'navigate' ? 'navigate' : 'content';
      const targets = splitList(el.props.targets, []);
      const buttons = labels
        .map(
          (label, index) =>
            `<button type="button" class="w-tab${index === 0 ? ' active' : ''}" data-w-tab="${
              index
            }" data-target="${escapeHtml(targets[index] || '')}" role="tab" aria-selected="${
              index === 0 ? 'true' : 'false'
            }">${escapeHtml(label)}</button>`
        )
        .join('');
      if (mode === 'navigate') {
        return `${indent}<div${attrs(el)} data-w-tabs data-mode="navigate"><div class="w-tabbar" role="tablist">${buttons}</div></div>`;
      }
      const panels = el.children.length
        ? el.children
            .map(
              (child, index) =>
                `${indent}  <div class="w-tabpanel" data-w-panel="${index}"${
                  index === 0 ? '' : ' hidden'
                }>${renderElement(child, indent + '    ')}</div>`
            )
            .join('\n')
        : '';
      return `${indent}<div${attrs(el)} data-w-tabs data-mode="content"><div class="w-tabbar" role="tablist">${buttons}</div><div class="w-tabpanels">\n${panels}\n${indent}</div></div>`;
    }
    case 'modal': {
      const title = el.props.title || 'More information';
      const size = ['sm', 'md', 'lg'].includes(el.props.size) ? el.props.size : 'md';
      const dialogId = `modal-${el.id}`;
      return `${indent}<div class="w-modal-wrap"><button type="button"${attrs(
        el
      )} data-w-modal-open="${dialogId}" aria-haspopup="dialog">${content || 'Open'}</button><div class="w-modal-backdrop" id="${dialogId}" data-w-modal="${dialogId}" hidden><div class="w-modal-dialog w-modal-${size}" role="dialog" aria-modal="true" aria-label="${escapeHtml(
        title
      )}"><button type="button" class="w-modal-close" data-w-modal-close aria-label="Close dialog">×</button><div class="w-modal-title">${escapeHtml(
        title
      )}</div><div class="w-modal-content">${kids}</div></div></div></div>`;
    }
    case 'slider': {
      const label = el.props.label || 'Value';
      const min = el.props.min || '0';
      const max = el.props.max || '100';
      const step = el.props.step || '1';
      const value = el.props.value || '60';
      return `${indent}<label class="w-slider-field"><span class="w-field-label">${escapeHtml(
        label
      )}<span class="w-slider-output" data-w-slider-output>${escapeHtml(
        value
      )}</span></span><input type="range" min="${escapeHtml(min)}" max="${escapeHtml(
        max
      )}" step="${escapeHtml(step)}" value="${escapeHtml(value)}" data-w-slider data-w-label="${escapeHtml(
        label
      )}"${attrs(el)} /></label>`;
    }
    case 'progress': {
      const pct = progressValue(el);
      const label = el.props.label || 'Progress';
      const mode = el.props.mode === 'form' ? 'form' : 'manual';
      return `${indent}<div${attrs(el)} data-w-progress data-mode="${mode}" data-value="${pct}"><div class="w-progress-top"><span>${escapeHtml(
        label
      )}</span><span class="w-progress-value" data-w-progress-value>${pct}%</span></div><div class="w-progress-track"><div class="w-progress-fill" data-w-progress-fill style="width:${pct}%"></div></div></div>`;
    }
    case 'form': {
      const formName = el.props.formName || el.content || 'Form';
      return `${indent}<form${attrs(el)} data-w-form data-form-id="${escapeHtml(
        el.id
      )}" data-form-name="${escapeHtml(formName)}" data-success="${escapeHtml(
        el.props.successMessage || 'Thanks — your response was recorded.'
      )}" data-email-to="${escapeHtml(el.props.emailTo || '')}" data-email-subject="${escapeHtml(
        el.props.emailSubject || ''
      )}" data-webhook="${escapeHtml(el.props.webhook || '')}" novalidate>${kids}<div class="w-form-status" role="status" aria-live="polite" hidden></div></form>`;
    }
    case 'mail': {
      const image = (el.props.image || '').trim();
      const to = (el.props.to || '').trim();
      const subject = el.props.subject || '';
      const body = el.props.body || '';
      const href = mailComposeUrl(el.props);
      const buttonText = el.props.buttonText || 'Open email composer';
      return `${indent}<div${attrs(el)}>${image ? `<img class="w-mail-image" src="${escapeHtml(image)}" alt="${escapeHtml(el.props.alt || 'Email illustration')}" />` : ''}<h3 class="w-mail-title">${content}</h3>${
        body ? `<p class="w-mail-body">${escapeHtml(body)}</p>` : ''
      }<div class="w-mail-meta">${to ? `<span>To: ${escapeHtml(to)}</span>` : '<span>Recipient not set</span>'}${
        subject ? `<span>Subject: ${escapeHtml(subject)}</span>` : ''
      }</div><a class="w-mail-button" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
        buttonText
      )}</a></div>`;
    }
    case 'customHtml':
      return `${indent}${el.content}`;
    case 'customCss':
      return '';
    default:
      return `${indent}<div${attrs(el)}>${content}${kids}</div>`;
  }
}

export interface GenerateOptions {
  inline?: boolean;
  minify?: boolean;
  mode?: 'preview' | 'export';
  token?: string;
}

export function generatePageHtml(project: Project, page: Page, opts: GenerateOptions = {}): string {
  const css = generateCss(project, { minify: opts.minify });
  const customCss = project.custom.css ?? '';
  const pageCss = page.custom?.css ?? '';
  const body =
    page.custom?.html ?? project.custom.html ?? page.elements.map((el) => renderElement(el, '    ')).join('\n');
  const mode = opts.mode ?? 'preview';
  const baseJs = generateBaseJs({ mode, token: opts.token });
  const customJs = project.custom.js ?? '';
  const js = opts.inline
    ? [baseJs, customJs, page.custom?.js].filter((chunk) => chunk && chunk.trim()).join('\n')
    : baseJs;
  const title = page.title || project.settings.seoTitle || project.name;
  const description = page.description || project.settings.seoDescription || '';
  const favicon = project.settings.favicon
    ? `\n  <link rel="icon" href="${escapeHtml(project.settings.favicon)}" />`
    : '';
  const cssTag = opts.inline
    ? `<style>\n${css}\n${customCss}\n${pageCss}\n</style>`
    : `<link rel="stylesheet" href="css/style.css" />${
        pageCss.trim() ? `\n  <style>\n${pageCss}\n  </style>` : ''
      }`;
  const scriptTags = opts.inline
    ? `<script>${js}</script>`
    : `<script src="js/script.js"></script>${
        page.custom?.js ? `\n  <script>${page.custom.js}</script>` : ''
      }`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  ${description ? `<meta name="description" content="${escapeHtml(description)}" />` : ''}${favicon}
  ${cssTag}
</head>
<body data-webora-page-id="${escapeHtml(page.id)}" data-webora-page-name="${escapeHtml(
    page.name
  )}" data-webora-page-path="${escapeHtml(page.path)}">
  <div class="w-site">
${body}
  </div>
  ${scriptTags}
</body>
</html>`;
}

export function generateElementsHtml(page: Page): string {
  return page.elements.map((el) => renderElement(el, '    ')).join('\n');
}

export function generateBodyHtml(project: Project, page: Page): string {
  if (page.custom?.html !== undefined) return page.custom.html;
  if (project.custom.html !== undefined) return project.custom.html;
  return generateElementsHtml(page);
}

export interface RuntimeOptions {
  mode?: 'preview' | 'export';
  token?: string;
}

export function generateBaseJs(options: RuntimeOptions = {}): string {
  const mode = options.mode ?? 'preview';
  const token = options.token ?? '';
  return `(function () {
  var MODE = ${JSON.stringify(mode)};
  var TOKEN = ${JSON.stringify(token)};
  var IS_FRAME = window.parent && window.parent !== window;

  function post(type, payload) {
    if (!IS_FRAME) return;
    try {
      window.parent.postMessage({ source: 'webora-preview', token: TOKEN, type: type, payload: payload }, '*');
    } catch (err) {}
  }

  function openExternal(url) {
    if (!url) return;
    if (MODE === 'preview' && IS_FRAME) {
      post('open-external', { url: url });
      return;
    }
    window.location.href = url;
  }

  function go(target) {
    if (!target) return;
    if (MODE === 'preview' && IS_FRAME) {
      post('navigate', { target: target });
      return;
    }
    window.location.href = target;
  }

  function setProgress(root, pct) {
    var value = Math.max(0, Math.min(100, Math.round(pct)));
    var fill = root.querySelector('[data-w-progress-fill]');
    var label = root.querySelector('[data-w-progress-value]');
    if (fill) fill.style.width = value + '%';
    if (label) label.textContent = value + '%';
    root.setAttribute('data-value', String(value));
  }

  function updateFormProgress(form) {
    var fields = Array.prototype.slice.call(form.querySelectorAll('[data-w-label]'));
    var total = fields.length;
    var filled = 0;
    fields.forEach(function (field) {
      if (field.type === 'checkbox' || field.type === 'radio') {
        if (field.checked) filled += 1;
      } else if (String(field.value || '').trim()) {
        filled += 1;
      }
    });
    var pct = total ? (filled / total) * 100 : 0;
    form.querySelectorAll('[data-w-progress][data-mode="form"]').forEach(function (root) {
      setProgress(root, pct);
    });
  }

  function initFormProgress(form) {
    form.querySelectorAll('[data-w-progress]').forEach(function (root) {
      var value = Number(root.getAttribute('data-value') || 0);
      setProgress(root, value);
    });
    updateFormProgress(form);
    form.addEventListener('input', function () { updateFormProgress(form); });
    form.addEventListener('change', function () { updateFormProgress(form); });
  }

  function setStatus(form, message, kind) {
    var el = form.querySelector('.w-form-status');
    if (!el) {
      el = document.createElement('div');
      el.className = 'w-form-status';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      form.appendChild(el);
    }
    el.textContent = message;
    el.setAttribute('data-kind', kind || 'success');
    el.hidden = false;
  }

  function formatAnswers(values) {
    return values.map(function (item) { return item.label + ': ' + (item.value || '—'); }).join('\\n');
  }

  function collectValues(form) {
    var values = [];
    var seen = {};
    form.querySelectorAll('[data-w-label]').forEach(function (field, index) {
      var label = field.getAttribute('data-w-label') || field.name || 'Field ' + (index + 1);
      var name = field.getAttribute('data-w-name') || field.name || label;
      var type = field.type || field.tagName.toLowerCase();
      if (type === 'radio') {
        if (!field.checked) return;
        values.push({ label: label, value: field.value || 'Yes', name: name, type: type });
        return;
      }
      if (type === 'checkbox') {
        values.push({ label: label, value: field.checked ? (field.value || 'Yes') : 'No', name: name, type: type });
        return;
      }
      if (seen[name]) return;
      seen[name] = true;
      values.push({ label: label, value: String(field.value || '').trim(), name: name, type: type });
    });
    var nameValue = values.find(function (v) { return /name/i.test(v.label + ' ' + v.name) && !/company|username|file/i.test(v.name); });
    var emailValue = values.find(function (v) { return v.type === 'email' || /e-?mail/i.test(v.label + ' ' + v.name); });
    return {
      values: values,
      respondentName: nameValue ? nameValue.value : '',
      respondentEmail: emailValue ? emailValue.value : '',
    };
  }

  function saveLocally(formName, submission) {
    try {
      var key = 'webora-form-submissions';
      var existing = [];
      try { existing = JSON.parse(localStorage.getItem(key) || '[]'); } catch (err) { existing = []; }
      if (!Array.isArray(existing)) existing = [];
      existing.unshift(submission);
      localStorage.setItem(key, JSON.stringify(existing.slice(0, 500)));
    } catch (err) {}
  }

  document.querySelectorAll('[data-w-tabs]').forEach(function (group) {
    var mode = group.getAttribute('data-mode');
    var buttons = Array.prototype.slice.call(group.querySelectorAll('[data-w-tab]'));
    var panels = Array.prototype.slice.call(group.querySelectorAll('[data-w-panel]'));
    buttons.forEach(function (button, index) {
      button.addEventListener('click', function () {
        if (mode === 'navigate') {
          var target = button.getAttribute('data-target');
          if (target) go(target);
          return;
        }
        buttons.forEach(function (item, itemIndex) {
          item.classList.toggle('active', itemIndex === index);
          item.setAttribute('aria-selected', itemIndex === index ? 'true' : 'false');
        });
        panels.forEach(function (panel, panelIndex) {
          panel.hidden = panelIndex !== index;
        });
      });
    });
  });

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || !target.closest) return;
    var opener = target.closest('[data-w-modal-open]');
    if (opener) {
      event.preventDefault();
      var dialog = document.getElementById(opener.getAttribute('data-w-modal-open'));
      if (dialog) {
        dialog.hidden = false;
        var focusable = dialog.querySelector('button, a, input, select, textarea');
        if (focusable) focusable.focus();
      }
      return;
    }
    var closer = target.closest('[data-w-modal-close]');
    if (closer) {
      event.preventDefault();
      var backdrop = closer.closest('[data-w-modal]');
      if (backdrop) backdrop.hidden = true;
      return;
    }
    var modalBackdrop = target.closest('[data-w-modal]');
    if (modalBackdrop && target.classList && target.classList.contains('w-modal-backdrop')) {
      modalBackdrop.hidden = true;
      return;
    }
    var anchor = target.closest('a[href]');
    if (!anchor) return;
    var href = anchor.getAttribute('href') || '';
    if (!href) return;
    if (href.charAt(0) === '#') {
      var id = href.slice(1);
      if (!id) { event.preventDefault(); return; }
      var node = document.getElementById(id);
      if (node) {
        event.preventDefault();
        node.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
    if (/^(mailto:|tel:)/i.test(href)) {
      if (MODE === 'preview') {
        event.preventDefault();
        openExternal(href);
      }
      return;
    }
    if (/^https?:/i.test(href)) {
      if (MODE === 'preview' && IS_FRAME) {
        event.preventDefault();
        openExternal(href);
      }
      return;
    }
    if (MODE === 'preview' && IS_FRAME) {
      event.preventDefault();
      go(href);
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('[data-w-modal]').forEach(function (modal) {
      modal.hidden = true;
    });
  });

  document.querySelectorAll('[data-w-slider]').forEach(function (slider) {
    var output = slider.closest('.w-slider-field');
    var target = output ? output.querySelector('[data-w-slider-output]') : null;
    var update = function () {
      if (target) target.textContent = slider.value;
      slider.setAttribute('data-w-value', slider.value);
    };
    slider.addEventListener('input', update);
    update();
  });

  document.querySelectorAll('[data-w-progress]').forEach(function (root) {
    var value = Number(root.getAttribute('data-value') || 0);
    setProgress(root, value);
  });

  document.querySelectorAll('form[data-w-form]').forEach(function (form) {
    initFormProgress(form);
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (typeof form.checkValidity === 'function' && !form.checkValidity()) {
        form.reportValidity();
        return;
      }
      var submitter = event.submitter || form.querySelector('[data-w-submit]');
      var collected = collectValues(form);
      var formName = form.getAttribute('data-form-name') || document.title;
      var formId = form.getAttribute('data-form-id') || '';
      var pageId = document.body.getAttribute('data-webora-page-id') || '';
      var pageName = document.body.getAttribute('data-webora-page-name') || '';
      var submission = {
        formId: formId,
        formName: formName,
        pageId: pageId,
        pageName: pageName,
        respondentName: collected.respondentName,
        respondentEmail: collected.respondentEmail,
        values: collected.values
      };

      if (MODE === 'preview') {
        post('form-submit', submission);
      } else {
        saveLocally(formName, submission);
      }

      var sendEmail = submitter && submitter.getAttribute('data-send-email') === 'true';
      var emailTo = (submitter && submitter.getAttribute('data-email-to')) || form.getAttribute('data-email-to') || '';
      var emailSubject = (submitter && submitter.getAttribute('data-email-subject')) || form.getAttribute('data-email-subject') || formName;
      var webhook = form.getAttribute('data-webhook') || '';
      var openLink = submitter && submitter.getAttribute('data-open-link') === 'true';
      var link = (submitter && submitter.getAttribute('data-href')) || '';

      if (sendEmail) {
        var body = formatAnswers(collected.values);
        var mail = 'mailto:' + encodeURIComponent(emailTo).replace(/%40/g, '@') + '?subject=' + encodeURIComponent(emailSubject) + '&body=' + encodeURIComponent(body);
        openExternal(mail);
      }

      if (webhook) {
        fetch(webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submission)
        }).catch(function () {
          setStatus(form, 'The response was saved, but the webhook could not be reached.', 'error');
        });
      }

      var success = form.getAttribute('data-success') || 'Thanks — your response was recorded.';
      if (MODE === 'export' && !sendEmail && !webhook) {
        success += ' Saved locally in this browser.';
      }
      setStatus(form, success, 'success');
      form.reset();
      updateFormProgress(form);
      if (openLink && link) {
        setTimeout(function () {
          if (/^#/.test(link)) {
            var node = document.getElementById(link.slice(1));
            if (node) node.scrollIntoView({ behavior: 'smooth' });
          } else {
            openExternal(link);
          }
        }, 250);
      }
    });
  });
})();`;
}

export interface ExportFile {
  path: string;
  content: string | Uint8Array;
}

export interface ExportOptions {
  includeAssets: boolean;
  minify: boolean;
  includeProject: boolean;
}

function pageFile(page: Page): string {
  if (page.path === '/' || page.path === '') return 'index.html';
  return `${page.path.replace(/^\//, '').replace(/\/$/, '').replace(/\//g, '-')}.html`;
}

function rewritePageLinks(html: string, project: Project): string {
  let out = html;
  for (const page of project.pages) {
    const file = pageFile(page);
    const path = page.path === '' ? '/' : page.path;
    out = out.split(`href="${escapeHtml(path)}"`).join(`href="${file}"`);
    out = out.split(`data-target="${escapeHtml(path)}"`).join(`data-target="${file}"`);
    if (path !== '/') {
      out = out.split(`href="${escapeHtml(path)}/"`).join(`href="${file}"`);
      out = out.split(`data-target="${escapeHtml(path)}/"`).join(`data-target="${file}"`);
    }
  }
  return out;
}

export function generateExport(project: Project, opts: ExportOptions): ExportFile[] {
  const files: ExportFile[] = [];
  const safeSlug = (p: Page) => (p.path === '/' ? 'index' : p.path.replace(/^\//, '').replace(/\//g, '-'));

  let css = generateCss(project, { minify: opts.minify }) + '\n\n' + (project.custom.css ?? '');
  if (opts.includeAssets) css = rewriteAssetUrls(css, project);
  files.push({ path: 'css/style.css', content: opts.minify ? minifyCss(css) : css });
  files.push({
    path: 'js/script.js',
    content: [generateBaseJs({ mode: 'export' }), project.custom.js ?? '']
      .filter((chunk) => chunk && chunk.trim())
      .join('\n'),
  });

  for (const page of project.pages) {
    let html = generatePageHtml(project, page, { inline: false, minify: opts.minify, mode: 'export' });
    html = rewritePageLinks(html, project);
    if (opts.includeAssets) html = rewriteAssetUrls(html, project);
    const name = `${safeSlug(page)}.html`;
    files.push({ path: name, content: html });
  }

  if (opts.includeAssets) {
    for (const asset of project.assets) {
      const base64 = asset.dataUrl.split(',')[1];
      if (!base64) continue;
      const bin = base64ToUint8Array(base64);
      files.push({ path: `assets/${asset.name}`, content: bin });
    }
  }

  if (opts.includeProject) {
    files.push({ path: 'project.json', content: JSON.stringify(project, null, 2) });
  }

  files.push({
    path: 'README.txt',
    content: `Website exported from Webora.\n\nOpen index.html in a browser to view your site.\n\nPages: ${project.pages
      .map((p) => p.name)
      .join(', ')}\nGenerated: ${new Date().toLocaleString()}\n\nForms: forms without an email or webhook action save responses in the visitor's browser (localStorage). Add an email address or webhook URL in the form settings for real delivery.\n`,
  });

  return files;
}

function minifyCss(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{}:;,])\s*/g, '$1').trim();
}

function rewriteAssetUrls(content: string, project: Project): string {
  let out = content;
  for (const asset of project.assets) {
    if (!asset.dataUrl) continue;
    out = out.split(asset.dataUrl).join(`assets/${asset.name}`);
  }
  return out;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
