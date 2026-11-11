import type {
  AIRequest,
  AISettings,
  ChatMessage,
  ElementType,
  Page,
  Project,
  WebElement,
} from '../types';
import { bridge } from './bridge';
import { cloneWithNewIds, createElement, createPage } from './docEngine';
import { clone, uid } from './utils';

/**
 * Runs a chat request. When `onDelta` is supplied the request is streamed and
 * deltas arrive through the Electron bridge (or are simply unavailable in the
 * browser fallback, which degrades to a single response).
 */
async function runChat(req: AIRequest, onDelta?: (delta: string) => void): Promise<string> {
  if (!onDelta) return bridge.aiChat(req);
  const streamId = uid('stream');
  const unsubscribe = bridge.onAiChunk((payload) => {
    if (payload.id === streamId) onDelta(payload.delta);
  });
  try {
    return await bridge.aiChat({ ...req, streamId });
  } finally {
    unsubscribe();
  }
}

export interface AIStage {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
}

export interface GenerateResult {
  project: Project | null;
  error?: string;
  raw?: string;
  attempts?: number;
}

const ELEMENT_TYPES: ElementType[] = [
  'heading',
  'paragraph',
  'text',
  'button',
  'link',
  'divider',
  'spacer',
  'section',
  'container',
  'flex',
  'grid',
  'columns',
  'card',
  'image',
  'video',
  'icon',
  'navbar',
  'footer',
  'accordion',
  'tabs',
  'input',
  'emailInput',
  'textarea',
  'checkbox',
  'radio',
  'select',
  'submit',
  'progress',
  'gallery',
  'breadcrumbs',
  'form',
  'mail',
  'modal',
  'slider',
  'customHtml',
];
const ELEMENT_TYPE_SET = new Set<string>(ELEMENT_TYPES);

const ELEMENT_SCHEMA = `{
  "type": "heading|paragraph|text|button|link|divider|spacer|section|container|flex|grid|columns|card|image|video|icon|navbar|footer|accordion|tabs|input|emailInput|textarea|checkbox|radio|select|submit|progress|gallery|breadcrumbs|form|mail|modal|slider|customHtml",
  "name": "optional label",
  "content": "text / label content",
  "style": { "kebab-case-css-property": "value" },
  "props": { "href": "#", "level": "h2", "src": "https://…", "glyph": "zap" },
  "children": [ …same shape… ]
}`;

const OP_SCHEMA = `Operation types:
1. {"op":"updateStyle","pageId":"<page id>","elementId":"<element id>","style":{"kebab-case":"value"}}
2. {"op":"updateContent","pageId":"<page id>","elementId":"<element id>","content":"new text"}
3. {"op":"updateProps","pageId":"<page id>","elementId":"<element id>","props":{"href":"#","level":"h2"}}
4. {"op":"updateName","elementId":"<element id>","name":"new layer name"}
5. {"op":"createElement","pageId":"<page id>","parentId":"<container id or null>","element": ELEMENT}
6. {"op":"deleteElement","elementId":"<element id>"}
7. {"op":"replaceElement","elementId":"<element id>","element": ELEMENT}
8. {"op":"duplicateElement","elementId":"<element id>"}
9. {"op":"moveElement","elementId":"<element id>","parentId":"<container id or null>","position":"inside|before|after"}
10. {"op":"createPage","page":{"name":"About","path":"/about","title":"About","description":"…","elements":[ ELEMENT, … ]}}
11. {"op":"updatePage","pageId":"<page id>","page":{"name":"…","path":"/…","title":"…","description":"…"}}
12. {"op":"deletePage","pageId":"<page id>"}
13. {"op":"replacePage","pageId":"<page id>","elements":[ ELEMENT, … ]}
14. {"op":"updateProject","project":{"name":"…","seoTitle":"…","seoDescription":"…"}}`;

/* ----------------------------- JSON recovery ----------------------------- */

function isRecord(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function stripFences(text: string): string {
  let t = String(text ?? '').replace(/^\uFEFF/, '').trim();
  const fence = t.match(/```(?:json|javascript|js)?\s*([\s\S]*?)(?:```|$)/i);
  if (fence) t = fence[1].trim();
  return t;
}

function firstStructuredChar(text: string): number {
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{' || text[i] === '[') return i;
  }
  return -1;
}

function balancedSlice(text: string, start: number): string | null {
  if (start < 0) return null;
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{' || ch === '[') {
      stack.push(ch);
    } else if (ch === '}' || ch === ']') {
      const open = stack[stack.length - 1];
      if ((ch === '}' && open === '{') || (ch === ']' && open === '[')) stack.pop();
      else return null;
      if (stack.length === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function sanitizeJsonText(input: string): string {
  let text = input
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u00a0/g, ' ');
  let out = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        out += ch;
        escaped = false;
      } else if (ch === '\\') {
        out += ch;
        escaped = true;
      } else if (ch === '"') {
        out += ch;
        inString = false;
      } else if (ch === '\n') {
        out += '\\n';
      } else if (ch === '\r') {
        /* drop */
      } else if (ch === '\t') {
        out += '\\t';
      } else if (ch.charCodeAt(0) < 0x20) {
        /* drop other control characters */
      } else {
        out += ch;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    if (ch === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && text[i + 1] === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i++;
      continue;
    }
    out += ch;
  }
  return out
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/^\s*[\u2026.]{3,}\s*/g, '')
    .trim();
}

/** Best-effort close for responses that were cut off by a token limit. */
function closeTruncatedJson(input: string): string | null {
  const text = sanitizeJsonText(input);
  if (!text) return null;
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{' || ch === '[') stack.push(ch);
    else if (ch === '}' || ch === ']') {
      const open = stack[stack.length - 1];
      if ((ch === '}' && open === '{') || (ch === ']' && open === '[')) stack.pop();
      else return null;
    }
  }
  let candidate = text;
  if (inString) candidate += '"';
  candidate = candidate.replace(/[,:\s]+$/g, '');
  // A cut-off object key (`{"a":1,"b`) cannot be closed meaningfully; trim
  // back to the previous separator and try again.
  if (/[{\[,]\s*"[^"]*"$/.test(candidate)) {
    const cut = Math.max(candidate.lastIndexOf(',', candidate.length - 2), candidate.lastIndexOf('{'));
    if (cut >= 0) candidate = candidate.slice(0, cut + 1).replace(/,\s*$/, '');
  }
  candidate = candidate.replace(/,\s*$/g, '');
  for (let i = stack.length - 1; i >= 0; i--) candidate += stack[i] === '{' ? '}' : ']';
  return candidate;
}

function parseCandidate(text: string): any | null {
  const direct = text.trim();
  if (!direct) return null;
  const candidates = new Set<string>([direct, sanitizeJsonText(direct)]);
  const start = firstStructuredChar(direct);
  const balanced = balancedSlice(direct, start);
  if (balanced) candidates.add(balanced);
  const lastClose = Math.max(direct.lastIndexOf('}'), direct.lastIndexOf(']'));
  if (start >= 0 && lastClose > start) candidates.add(direct.slice(start, lastClose + 1));
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (typeof parsed === 'string' && /^[\[{]/.test(parsed.trim())) {
        const nested = parseCandidate(parsed);
        if (nested !== null) return nested;
      }
      return parsed;
    } catch {
      /* try next */
    }
  }
  const repaired = closeTruncatedJson(direct);
  if (repaired) {
    try {
      return JSON.parse(repaired);
    } catch {
      /* noop */
    }
  }
  // Last resort: try progressively shorter prefixes that end on a value. This
  // salvages documents where the final object is incomplete.
  const trimmedStart = start >= 0 ? direct.slice(start) : direct;
  for (let i = 0; i < 24; i++) {
    const cut = Math.max(
      trimmedStart.lastIndexOf('}', trimmedStart.length - (i + 2)),
      trimmedStart.lastIndexOf(']', trimmedStart.length - (i + 2))
    );
    if (cut < 0) break;
    const prefix = trimmedStart.slice(0, cut + 1);
    const fixed = closeTruncatedJson(prefix);
    if (!fixed) continue;
    try {
      return JSON.parse(fixed);
    } catch {
      /* keep shrinking */
    }
  }
  return null;
}

export function extractJson(text: string): any | null {
  if (!text) return null;
  const stripped = stripFences(text);
  const parsed = parseCandidate(stripped);
  if (parsed !== null) return parsed;
  return parseCandidate(text);
}

/* --------------------------- element normalisation --------------------------- */

const TYPE_ALIASES: Record<string, ElementType> = {
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  h5: 'heading',
  h6: 'heading',
  header: 'navbar',
  heading: 'heading',
  headline: 'heading',
  title: 'heading',
  p: 'paragraph',
  paragraph: 'paragraph',
  text: 'text',
  copy: 'text',
  span: 'text',
  label: 'text',
  a: 'link',
  anchor: 'link',
  link: 'link',
  button: 'button',
  btn: 'button',
  cta: 'button',
  img: 'image',
  image: 'image',
  picture: 'image',
  figure: 'image',
  video: 'video',
  iframe: 'video',
  embed: 'video',
  svg: 'icon',
  icon: 'icon',
  i: 'icon',
  div: 'container',
  section: 'section',
  main: 'section',
  article: 'section',
  aside: 'section',
  wrapper: 'container',
  container: 'container',
  box: 'container',
  group: 'container',
  content: 'container',
  row: 'flex',
  flex: 'flex',
  grid: 'grid',
  columns: 'columns',
  column: 'container',
  card: 'card',
  panel: 'card',
  nav: 'navbar',
  navigation: 'navbar',
  navbar: 'navbar',
  menu: 'navbar',
  footer: 'footer',
  hr: 'divider',
  divider: 'divider',
  spacer: 'spacer',
  br: 'spacer',
  form: 'form',
  input: 'input',
  textarea: 'textarea',
  select: 'select',
  option: 'text',
  checkbox: 'checkbox',
  radio: 'radio',
  submit: 'submit',
  ul: 'container',
  ol: 'container',
  li: 'paragraph',
  gallery: 'gallery',
  breadcrumbs: 'breadcrumbs',
  accordion: 'accordion',
  tabs: 'tabs',
  modal: 'modal',
  slider: 'slider',
  progress: 'progress',
  mail: 'mail',
  email: 'mail',
  customhtml: 'customHtml',
  html: 'customHtml',
};

const ROOT_PROP_KEYS = [
  'href',
  'src',
  'alt',
  'level',
  'placeholder',
  'name',
  'value',
  'label',
  'provider',
  'to',
  'subject',
  'body',
  'glyph',
  'poster',
  'controls',
  'autoplay',
  'loop',
  'muted',
  'target',
  'rel',
  'action',
  'method',
  'required',
  'options',
  'formId',
  'submitForm',
  'sendEmail',
  'openLink',
  'html',
];

function toCssKey(key: string): string {
  const raw = String(key).trim();
  if (!raw) return raw;
  if (raw.includes('-')) return raw;
  return raw
    .replace(/^ms([A-Z])/, 'Ms$1')
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase();
}

function parseStyleString(value: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const declaration of value.split(';')) {
    const index = declaration.indexOf(':');
    if (index <= 0) continue;
    const key = declaration.slice(0, index).trim();
    const entry = declaration.slice(index + 1).trim();
    if (key && entry) out[toCssKey(key)] = entry;
  }
  return out;
}

function styleMap(value: unknown): Record<string, string> {
  if (typeof value === 'string') return parseStyleString(value);
  if (!isRecord(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') {
      out[toCssKey(key)] = String(entry);
    }
  }
  return out;
}

function propMap(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') {
      out[key] = String(entry);
    }
  }
  return out;
}

function elementChildren(raw: Record<string, any>): any[] {
  for (const key of ['children', 'elements', 'items', 'blocks', 'sections', 'rows', 'columns']) {
    const value = raw[key];
    if (Array.isArray(value)) return value;
    if (isRecord(value)) {
      return Object.entries(value).map(([name, entry]) =>
        isRecord(entry) ? { name, ...entry } : entry
      );
    }
  }
  if (Array.isArray(raw.content) || isRecord(raw.content)) {
    const value = raw.content;
    return Array.isArray(value)
      ? value
      : Object.entries(value).map(([name, entry]) => (isRecord(entry) ? { name, ...entry } : entry));
  }
  return [];
}

function elementContent(raw: Record<string, any>): string {
  for (const key of ['content', 'text', 'title', 'label', 'caption', 'heading', 'description', 'value']) {
    const value = raw[key];
    if (typeof value === 'string' || typeof value === 'number') return String(value);
  }
  return '';
}

function inferElementType(raw: Record<string, any>): { type: ElementType; level?: string } {
  const rawType = String(raw.type ?? raw.element ?? raw.tag ?? raw.tagName ?? raw.kind ?? '')
    .toLowerCase()
    .replace(/^[a-z]+:/, '')
    .trim();
  if (/^h[1-6]$/.test(rawType)) return { type: 'heading', level: rawType };
  if (rawType && TYPE_ALIASES[rawType]) {
    const type = TYPE_ALIASES[rawType];
    if (rawType === 'input' && String(raw.inputType ?? raw.input_type ?? raw.htmlType ?? '').toLowerCase() === 'email') {
      return { type: 'emailInput' };
    }
    return { type };
  }
  if (ELEMENT_TYPE_SET.has(rawType)) return { type: rawType as ElementType };
  const children = elementChildren(raw);
  const content = elementContent(raw);
  if (children.length) return { type: 'container' };
  if (raw.href && content) return { type: 'link' };
  if (raw.src && /\.(mp4|webm|mov)(\?|$)/i.test(String(raw.src))) return { type: 'video' };
  if (raw.src) return { type: 'image' };
  if (content) return { type: 'paragraph' };
  return { type: 'container' };
}

function normalizeElement(raw: any, counter = { count: 0 }, depth = 0): WebElement | null {
  if (counter.count++ > 4000 || depth > 10) return null;
  if (typeof raw === 'string') {
    const element = createElement('paragraph', { content: raw });
    return element;
  }
  if (Array.isArray(raw)) {
    const element = createElement('container');
    element.children = raw
      .map((child) => normalizeElement(child, counter, depth + 1))
      .filter(Boolean) as WebElement[];
    return element;
  }
  if (!isRecord(raw)) return null;

  const inferred = inferElementType(raw);
  const type: ElementType = ELEMENT_TYPE_SET.has(inferred.type) ? inferred.type : 'container';
  const element = createElement(type);
  const content = elementContent(raw);
  if (content) element.content = content;

  const props: Record<string, string> = {
    ...propMap(raw.props),
    ...propMap(raw.attributes),
    ...propMap(raw.attrs),
  };
  for (const key of ROOT_PROP_KEYS) {
    const value = raw[key];
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      props[key] = String(value);
    }
  }
  if (inferred.level) props.level = inferred.level;
  if (raw.html && typeof raw.html === 'string' && type === 'customHtml') props.html = raw.html;
  if (raw.src && typeof raw.src === 'string' && !props.src) props.src = raw.src;
  if (raw.href && typeof raw.href === 'string' && !props.href) props.href = raw.href;
  element.props = { ...element.props, ...props };

  const styleSource =
    isRecord(raw.style) || typeof raw.style === 'string'
      ? raw.style
      : isRecord(raw.styles) || typeof raw.styles === 'string'
      ? raw.styles
      : null;
  if (styleSource) {
    const style = styleMap(styleSource);
    const styleObject = isRecord(styleSource) ? styleSource : {};
    const hover = isRecord(raw.hover)
      ? styleMap(raw.hover)
      : isRecord(styleObject.hover)
      ? styleMap(styleObject.hover)
      : {};
    const tablet = isRecord(raw.responsive?.tablet)
      ? styleMap(raw.responsive.tablet)
      : isRecord(styleObject.tablet)
      ? styleMap(styleObject.tablet)
      : {};
    const mobile = isRecord(raw.responsive?.mobile)
      ? styleMap(raw.responsive.mobile)
      : isRecord(styleObject.mobile)
      ? styleMap(styleObject.mobile)
      : {};
    delete style.hover;
    delete style.tablet;
    delete style.mobile;
    element.style = { ...element.style, ...style };
    element.hover = { ...element.hover, ...hover };
    element.responsive = { tablet: { ...element.responsive.tablet, ...tablet }, mobile: { ...element.responsive.mobile, ...mobile } };
  } else if (typeof raw.css === 'string' || isRecord(raw.css)) {
    element.style = { ...element.style, ...styleMap(raw.css) };
  }

  if (typeof raw.name === 'string' && raw.name.trim()) element.name = raw.name.trim();
  const children = elementChildren(raw);
  if (children.length) {
    element.children = children
      .map((child) => normalizeElement(child, counter, depth + 1))
      .filter(Boolean) as WebElement[];
  }
  return element;
}

function normalizeElementList(value: unknown): WebElement[] {
  let list: any[] = [];
  if (Array.isArray(value)) list = value;
  else if (isRecord(value)) {
    list = Object.entries(value).map(([name, entry]) =>
      isRecord(entry) ? { name, ...entry } : entry
    );
  }
  const counter = { count: 0 };
  return list
    .map((item) => normalizeElement(item, counter))
    .filter(Boolean) as WebElement[];
}

/* ----------------------------- website document ----------------------------- */

function unwrapDocument(json: any): any {
  if (!isRecord(json)) return json;
  for (const key of ['website', 'project', 'site', 'document', 'result', 'data', 'output']) {
    const value = json[key];
    if (isRecord(value) && (value.pages || value.elements || value.sections || value.name)) return value;
    if (typeof value === 'string' && /^[\[{]/.test(value.trim())) {
      const parsed = extractJson(value);
      if (parsed) return unwrapDocument(parsed);
    }
  }
  return json;
}

function normalizePageName(value: unknown, index: number): string {
  const name = typeof value === 'string' ? value.trim() : '';
  return name || (index === 0 ? 'Home' : `Page ${index + 1}`);
}

function normalizePagePath(value: unknown, name: string, index: number): string {
  if (typeof value === 'string' && value.trim().startsWith('/')) return value.trim();
  if (index === 0) return '/';
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `/${slug || `page-${index + 1}`}`;
}

function pageElements(raw: Record<string, any>): any[] {
  for (const key of ['elements', 'sections', 'content', 'blocks', 'body', 'children', 'items']) {
    const value = raw[key];
    if (Array.isArray(value)) return value;
    if (isRecord(value)) return Object.values(value);
  }
  return [];
}

export function normalizeProjectDocument(json: any, fallbackName = 'AI generated website'): Project | null {
  let root = unwrapDocument(json);
  if (Array.isArray(root)) root = { pages: root };
  if (!isRecord(root)) return null;

  let rawPages: any[] = [];
  if (Array.isArray(root.pages)) rawPages = root.pages;
  else if (isRecord(root.pages)) {
    rawPages = Object.entries(root.pages).map(([name, page]) =>
      isRecord(page) ? { name, ...page } : page
    );
  } else if (isRecord(root.website) && Array.isArray(root.website.pages)) {
    rawPages = root.website.pages;
  } else if (root.elements || root.sections || root.html || root.content) {
    rawPages = [root];
  }
  if (!rawPages.length) return null;

  const name =
    (typeof root.name === 'string' && root.name.trim()) ||
    (typeof root.title === 'string' && root.title.trim()) ||
    (typeof root.siteName === 'string' && root.siteName.trim()) ||
    fallbackName;

  const pages: Page[] = [];
  const usedPaths = new Set<string>();
  for (let index = 0; index < rawPages.slice(0, 8).length; index++) {
    const rp = rawPages[index];
    if (!isRecord(rp)) continue;
    const pageName = normalizePageName(rp.name ?? rp.title, index);
    let path = normalizePagePath(rp.path ?? rp.url ?? rp.slug, pageName, index);
    if (usedPaths.has(path)) path = `${path.replace(/\/$/, '') || ''}-${index + 1}`;
    if (!path.startsWith('/')) path = `/${path}`;
    usedPaths.add(path);

    let elements = normalizeElementList(pageElements(rp));
    if (!elements.length && typeof rp.html === 'string' && rp.html.trim()) {
      elements = [createElement('customHtml', { props: { html: rp.html } })];
    }
    const page = createPage(pageName, path, elements);
    page.title = typeof rp.title === 'string' && rp.title.trim() ? rp.title.trim() : pageName;
    page.description = typeof rp.description === 'string' ? rp.description : '';
    if (typeof rp.seoTitle === 'string') page.title = rp.seoTitle;
    if (typeof rp.seoDescription === 'string') page.description = rp.seoDescription;
    pages.push(page);
  }

  if (!pages.length) return null;
  if (!pages.some((page) => page.path === '/')) {
    pages[0].path = '/';
    usedPaths.add('/');
  }
  if (pages.every((page) => page.elements.length === 0)) return null;

  return {
    id: uid('proj'),
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    pages,
    assets: [],
    custom: {},
    settings: {
      seoTitle: typeof root.seoTitle === 'string' ? root.seoTitle : name,
      seoDescription: typeof root.seoDescription === 'string' ? root.seoDescription : '',
    },
    aiChat: [],
  };
}

function systemPrompt(): string {
  return `You are Webora, an expert web designer. You output an editable website document as strict JSON.

Return ONLY a JSON object with this shape:
{
  "name": "Website name",
  "pages": [
    {
      "name": "Home",
      "path": "/",
      "title": "Page title",
      "description": "meta description",
      "elements": [ ELEMENT ]
    }
  ]
}

ELEMENT is: ${ELEMENT_SCHEMA}

RULES:
- Follow the requested brand, palette, mood and content. If no palette is requested, use a polished, high-contrast, modern aesthetic rather than forcing dark mode.
- Use a navbar on every page, a strong hero, 2-4 content sections, and a footer. Every page needs real content.
- Use realistic copy that matches the request. Never "Lorem ipsum".
- CSS properties must be kebab-case. Responsive values can be supplied with "tablet" and "mobile" objects inside "style".
- Image elements may use a real https URL in props.src. If you do not have a real image, leave src empty rather than inventing a broken URL.
- Video elements may use a YouTube or Vimeo URL in props.src. Do not invent video URLs.
- Forms use input/emailInput/textarea/select/checkbox/radio, a progress element and a submit element. Mail buttons use type "mail" with props.to and props.subject.
- Prefer 1 to 3 pages. The home page must use "/" and each page path must be unique.
- No markdown fences, comments or explanations. JSON only.`;
}

/* -------------------------------- editing -------------------------------- */

export type EditOpKind =
  | 'updateStyle'
  | 'updateContent'
  | 'updateProps'
  | 'updateName'
  | 'createElement'
  | 'deleteElement'
  | 'replaceElement'
  | 'duplicateElement'
  | 'moveElement'
  | 'createPage'
  | 'updatePage'
  | 'deletePage'
  | 'replacePage'
  | 'updateProject';

export interface EditOp {
  op: EditOpKind;
  elementId?: string;
  elementName?: string;
  pageId?: string;
  pageName?: string;
  pagePath?: string;
  style?: Record<string, string>;
  content?: string;
  props?: Record<string, string>;
  name?: string;
  parentId?: string | null;
  element?: any;
  position?: 'inside' | 'before' | 'after';
  target?: 'style' | 'hover' | 'tablet' | 'mobile';
  page?: {
    id?: string;
    name?: string;
    path?: string;
    title?: string;
    description?: string;
    elements?: any[];
  };
  project?: { name?: string; seoTitle?: string; seoDescription?: string };
  elements?: any[];
}

const OP_ALIASES: Record<string, EditOpKind> = {
  updatestyle: 'updateStyle',
  setstyle: 'updateStyle',
  changestyle: 'updateStyle',
  restyle: 'updateStyle',
  style: 'updateStyle',
  updatecontent: 'updateContent',
  setcontent: 'updateContent',
  changecontent: 'updateContent',
  settext: 'updateContent',
  updatetext: 'updateContent',
  edittext: 'updateContent',
  rewrite: 'updateContent',
  updateprops: 'updateProps',
  setprops: 'updateProps',
  updateattributes: 'updateProps',
  setattributes: 'updateProps',
  setattr: 'updateProps',
  updatename: 'updateName',
  setname: 'updateName',
  renameelement: 'updateName',
  createelement: 'createElement',
  addelement: 'createElement',
  insertelement: 'createElement',
  create: 'createElement',
  add: 'createElement',
  insert: 'createElement',
  deleteelement: 'deleteElement',
  removeelement: 'deleteElement',
  delete: 'deleteElement',
  remove: 'deleteElement',
  replaceelement: 'replaceElement',
  duplicateelement: 'duplicateElement',
  cloneelement: 'duplicateElement',
  moveelement: 'moveElement',
  createpage: 'createPage',
  addpage: 'createPage',
  newpage: 'createPage',
  updatepage: 'updatePage',
  updatepagemeta: 'updatePage',
  editpage: 'updatePage',
  deletepage: 'deletePage',
  removepage: 'deletePage',
  replacepage: 'replacePage',
  setpage: 'replacePage',
  updateproject: 'updateProject',
  renameproject: 'updateProject',
  setprojectname: 'updateProject',
};

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.length) return value;
    if (typeof value === 'number') return String(value);
  }
  return undefined;
}

function pickText(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
  }
  return undefined;
}

function opKind(raw: Record<string, any>): EditOpKind | null {
  const key = String(raw.op ?? raw.operation ?? raw.action ?? raw.kind ?? raw.type ?? '')
    .toLowerCase()
    .replace(/[_\s-]/g, '');
  if (OP_ALIASES[key]) return OP_ALIASES[key];
  if (raw.element || raw.newElement) return 'createElement';
  if (raw.style || raw.styles) return 'updateStyle';
  if (raw.content || raw.text) return 'updateContent';
  if (raw.pages) return 'replacePage';
  return null;
}

function normalizeEditOp(raw: any): EditOp | null {
  if (!isRecord(raw)) return null;
  const kind = opKind(raw);
  if (!kind) return null;
  const elementOps: EditOpKind[] = [
    'updateStyle',
    'updateContent',
    'updateProps',
    'updateName',
    'createElement',
    'deleteElement',
    'replaceElement',
    'duplicateElement',
    'moveElement',
  ];
  const elementId = elementOps.includes(kind)
    ? pickString(raw.elementId, raw.element_id, raw.targetId, raw.target_id, raw.ref, raw.id)
    : undefined;
  const elementName = elementOps.includes(kind)
    ? pickString(raw.elementName, raw.element_name, raw.selector, raw.targetName, raw.target_name)
    : undefined;
  const pageValue = isRecord(raw.page) ? raw.page : null;
  const pageId = pickString(raw.pageId, raw.page_id, pageValue?.id);
  const pageName = pickString(raw.pageName, raw.page_name, raw.pageTitle, raw.page_title);
  const pagePath = pickString(raw.pagePath, raw.page_path);
  const page = pageValue
    ? {
        id: pickString(pageValue.id),
        name: pickString(pageValue.name, pageValue.title),
        path: pickString(pageValue.path, pageValue.url, pageValue.slug),
        title: pickString(pageValue.title),
        description: pickString(pageValue.description),
        elements: Array.isArray(pageValue.elements) ? pageValue.elements : undefined,
      }
    : undefined;

  const op: EditOp = {
    op: kind,
    elementId,
    elementName,
    pageId,
    pageName,
    pagePath,
    style: styleMap(raw.style ?? raw.styles ?? raw.css ?? raw.design),
    content: pickText(raw.content, raw.text, raw.value, raw.newContent, raw.new_content, raw.updatedContent),
    props: {
      ...propMap(raw.props),
      ...propMap(raw.attributes),
      ...propMap(raw.attrs),
    },
    name: pickString(raw.name, raw.newName, raw.new_name),
    parentId:
      raw.parentId === null || raw.parent_id === null || raw.parent === null
        ? null
        : pickString(raw.parentId, raw.parent_id, raw.containerId, raw.into),
    element: raw.element ?? raw.newElement ?? raw.node ?? raw.data ?? (raw.type && raw.children ? raw : undefined),
    position: ['inside', 'before', 'after'].includes(String(raw.position ?? raw.placement))
      ? (String(raw.position ?? raw.placement) as EditOp['position'])
      : undefined,
    target: ['style', 'hover', 'tablet', 'mobile'].includes(String(raw.target ?? raw.targetType))
      ? (String(raw.target ?? raw.targetType) as EditOp['target'])
      : undefined,
    page,
    project:
      kind === 'updateProject'
        ? {
            name: pickString(raw.name, raw.projectName, raw.project_name, raw.project?.name),
            seoTitle: pickString(raw.seoTitle, raw.seo_title, raw.project?.seoTitle),
            seoDescription: pickString(raw.seoDescription, raw.seo_description, raw.project?.seoDescription),
          }
        : undefined,
    elements: Array.isArray(raw.elements)
      ? raw.elements
      : Array.isArray(raw.page?.elements)
      ? raw.page.elements
      : kind === 'replacePage' && Array.isArray(raw.content)
      ? raw.content
      : undefined,
  };

  if (kind === 'createPage') {
    op.page = {
      name: page?.name ?? pickString(raw.name, raw.pageName, raw.title),
      path: page?.path ?? pickString(raw.path, raw.url, raw.slug, raw.pagePath),
      title: page?.title ?? pickString(raw.title),
      description: page?.description ?? pickString(raw.description),
      elements: page?.elements ?? (Array.isArray(raw.elements) ? raw.elements : undefined),
    };
  }
  if (kind === 'updatePage') {
    op.page = {
      name: page?.name ?? pickString(raw.name, raw.newName, raw.new_name),
      path: page?.path ?? pickString(raw.path, raw.url, raw.slug, raw.newPath, raw.new_path),
      title: page?.title ?? pickString(raw.title, raw.newTitle, raw.new_title),
      description: page?.description ?? pickString(raw.description, raw.newDescription, raw.new_description),
    };
  }
  if (kind === 'updateContent' && op.content === undefined) return null;
  if (kind === 'updateStyle' && !Object.keys(op.style ?? {}).length) return null;
  if (kind === 'createElement' && !op.element) {
    if (raw.type || raw.name || raw.content) op.element = raw;
    else return null;
  }
  return op;
}

export function normalizeEditOps(json: any): EditOp[] {
  let rawOps: any[] = [];
  if (Array.isArray(json)) rawOps = json;
  else if (isRecord(json)) {
    for (const key of ['ops', 'operations', 'edits', 'changes', 'actions', 'patch']) {
      if (Array.isArray(json[key])) {
        rawOps = json[key];
        break;
      }
      if (isRecord(json[key])) {
        rawOps = Object.values(json[key]);
        break;
      }
    }
    if (!rawOps.length && (json.op || json.operation || json.action)) rawOps = [json];
    if (!rawOps.length && Array.isArray(json.pages)) {
      // A model that ignored the operation format but returned a fresh page
      // list still gets a safe, page-scoped interpretation.
      rawOps = json.pages.map((page: any) => ({
        op: 'replacePage',
        pageName: page?.name,
        pagePath: page?.path,
        elements: page?.elements ?? page?.sections ?? [],
      }));
    }
  }
  return rawOps
    .map((raw) => normalizeEditOp(raw))
    .filter(Boolean)
    .slice(0, 80) as EditOp[];
}

function editSystemPrompt(): string {
  return `You are Webora's website editor. You can see the current website as structured JSON and change it.

Return ONLY a JSON object: { "ops": [ Operation ] }. ${OP_SCHEMA}

ELEMENT shape: ${ELEMENT_SCHEMA}

RULES:
- Use the real page and element IDs from CURRENT WEBSITE. Never invent an ID.
- Make the smallest set of operations that completes the request. Preserve everything the user did not ask to change.
- Use pageId whenever an operation targets a page or a new element on a page.
- To add a section, use createElement with the page's pageId and parentId null. To nest content, use a container/card/section ID as parentId.
- To add a page, use createPage with a complete page object. To edit page metadata, use updatePage. Never delete the only page.
- To redesign a whole page, use replacePage with the complete new element tree for that page.
- Use updateProject for the website name or SEO fields.
- For imagery, only use real https image URLs. For video, use a YouTube or Vimeo URL in props.src. Forms must use real form elements.
- Return several focused operations rather than one giant replacement when changing part of a page.
- JSON only, no markdown.`;
}

export interface SiteContextOptions {
  focusPageId?: string | null;
  maxChars?: number;
}

function compactElement(el: WebElement, depth = 0, counter = { count: 0 }): any {
  if (counter.count++ > 900 || depth > 9) return null;
  const node: any = { id: el.id, type: el.type, name: el.name };
  if (el.content) node.content = el.content.slice(0, 220);
  if (Object.keys(el.props).length) node.props = el.props;
  if (Object.keys(el.style).length) node.style = el.style;
  if (Object.keys(el.hover).length) node.hover = el.hover;
  if (Object.keys(el.responsive.tablet).length || Object.keys(el.responsive.mobile).length) {
    node.responsive = el.responsive;
  }
  const children = el.children
    .map((child) => compactElement(child, depth + 1, counter))
    .filter(Boolean);
  if (children.length) node.children = children;
  return node;
}

/**
 * Compact, ID-rich description of the current website. Both AI surfaces send
 * this so the model can target real elements instead of guessing.
 */
export function buildSiteContext(project: Project, opts: SiteContextOptions = {}): string {
  const maxChars = opts.maxChars ?? 36000;
  const focusId = opts.focusPageId ?? null;
  const orderedPages = [...project.pages].sort((a, b) => {
    if (a.id === focusId) return -1;
    if (b.id === focusId) return 1;
    return 0;
  });
  const pages = orderedPages.map((page) => {
    const isFocus = !focusId || page.id === focusId;
    const counter = { count: 0 };
    const elements = page.elements
      .map((element) => compactElement(element, 0, counter))
      .filter(Boolean);
    return {
      id: page.id,
      name: page.name,
      path: page.path,
      title: page.title,
      description: page.description,
      ...(page.custom?.html || page.custom?.css || page.custom?.js ? { custom: page.custom } : {}),
      elements: isFocus ? elements : elements.slice(0, 8),
    };
  });
  const context = {
    project: {
      id: project.id,
      name: project.name,
      seoTitle: project.settings.seoTitle,
      seoDescription: project.settings.seoDescription,
    },
    pages,
  };
  let serialized = JSON.stringify(context);
  if (serialized.length > maxChars) {
    serialized = serialized.slice(0, maxChars) + '… (context truncated; ask for a specific page/section if needed)';
  }
  return serialized;
}

function cleanHistory(history: Array<{ role: 'user' | 'assistant'; content: string; kind?: string }> = []): ChatMessage[] {
  return history
    .filter((entry) => entry.role === 'user' || entry.role === 'assistant')
    .filter((entry) => entry.kind !== 'error')
    .filter((entry) => entry.content.trim().length > 0)
    .slice(-10)
    .map((entry) => ({
      role: entry.role,
      content: entry.content.slice(0, 1600),
    }));
}

/* -------------------------------- apply ops -------------------------------- */

interface FoundElement {
  page: Page;
  el: WebElement;
  list: WebElement[];
  index: number;
}

function walkElements(
  page: Page,
  list: WebElement[],
  idOrName: string,
  matchName: boolean
): FoundElement | null {
  for (let index = 0; index < list.length; index++) {
    const el = list[index];
    if (el.id === idOrName) return { page, el, list, index };
    if (matchName && (el.name === idOrName || el.name.toLowerCase() === idOrName.toLowerCase())) {
      return { page, el, list, index };
    }
    const inner = walkElements(page, el.children, idOrName, matchName);
    if (inner) return inner;
  }
  return null;
}

function findElementByRef(project: Project, ref?: string, name?: string): FoundElement | null {
  if (ref) {
    for (const page of project.pages) {
      const found = walkElements(page, page.elements, ref, false);
      if (found) return found;
    }
  }
  if (name) {
    for (const page of project.pages) {
      const found = walkElements(page, page.elements, name, true);
      if (found) return found;
    }
  }
  if (ref) {
    for (const page of project.pages) {
      const found = walkElements(page, page.elements, ref, true);
      if (found) return found;
    }
  }
  return null;
}

function resolvePage(project: Project, op: EditOp, fallbackPageId?: string | null): Page | null {
  const id = op.pageId ?? op.page?.id;
  if (id) {
    const match = project.pages.find((page) => page.id === id);
    if (match) return match;
  }
  const path = op.pagePath ?? op.page?.path;
  if (path) {
    const match = project.pages.find((page) => page.path === path);
    if (match) return match;
  }
  const name = op.pageName ?? op.page?.name;
  if (name) {
    const match = project.pages.find(
      (page) => page.name.toLowerCase() === name.toLowerCase() || page.path === name
    );
    if (match) return match;
  }
  if (fallbackPageId) {
    const match = project.pages.find((page) => page.id === fallbackPageId);
    if (match) return match;
  }
  return project.pages[0] ?? null;
}

function uniquePagePath(project: Project, desired: string, skipId?: string): string {
  let path = desired.startsWith('/') ? desired : `/${desired}`;
  if (!path || path === '/') return path;
  let suffix = 2;
  while (
    project.pages.some(
      (page) => page.path === path && page.id !== skipId
    )
  ) {
    path = `${desired.replace(/\/$/, '')}-${suffix++}`;
  }
  return path;
}

function insertIntoParent(
  page: Page,
  parentId: string | null | undefined,
  element: WebElement,
  position: EditOp['position']
) {
  if (!parentId) {
    page.elements.push(element);
    return;
  }
  const parent = walkElements(page, page.elements, parentId, true);
  if (!parent) {
    page.elements.push(element);
    return;
  }
  if (position === 'before') {
    parent.list.splice(parent.index, 0, element);
  } else if (position === 'after') {
    parent.list.splice(parent.index + 1, 0, element);
  } else {
    parent.el.children.push(element);
  }
}

function normalizePagePatch(op: EditOp): { name?: string; path?: string; title?: string; description?: string } {
  const page = op.page ?? {};
  return {
    name: page.name ?? op.name,
    path: page.path,
    title: page.title,
    description: page.description,
  };
}

export function applyOps(
  project: Project,
  ops: EditOp[],
  fallbackPageId?: string | null
): { applied: number; errors: string[]; pageIds: string[]; createdPageIds: string[] } {
  const errors: string[] = [];
  const pageIds = new Set<string>();
  const createdPageIds: string[] = [];
  let applied = 0;

  for (const op of ops) {
    try {
      if (op.op === 'updateProject') {
        const patch = op.project ?? {};
        if (typeof op.name === 'string' && !patch.name) patch.name = op.name;
        if (patch.name) project.name = patch.name;
        if (patch.seoTitle) project.settings.seoTitle = patch.seoTitle;
        if (patch.seoDescription) project.settings.seoDescription = patch.seoDescription;
        applied++;
        continue;
      }

      if (op.op === 'createPage') {
        const page = op.page ?? {};
        const name = (page.name ?? op.name ?? `Page ${project.pages.length + 1}`).trim() || `Page ${project.pages.length + 1}`;
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const desiredPath = page.path ?? op.pagePath ?? `/${slug || `page-${project.pages.length + 1}`}`;
        const path = uniquePagePath(project, desiredPath);
        const elements = op.elements ?? page.elements ?? [];
        const newPage = createPage(name, path, normalizeElementList(elements));
        newPage.title = page.title ?? op.name ?? name;
        newPage.description = page.description ?? '';
        project.pages.push(newPage);
        pageIds.add(newPage.id);
        createdPageIds.push(newPage.id);
        applied++;
        continue;
      }

      if (op.op === 'updatePage') {
        const page = resolvePage(project, op, fallbackPageId);
        if (!page) throw new Error('page not found');
        const patch = normalizePagePatch(op);
        if (patch.name?.trim()) page.name = patch.name.trim();
        if (patch.path?.trim()) page.path = uniquePagePath(project, patch.path.trim(), page.id);
        if (typeof patch.title === 'string') page.title = patch.title;
        if (typeof patch.description === 'string') page.description = patch.description;
        pageIds.add(page.id);
        applied++;
        continue;
      }

      if (op.op === 'deletePage') {
        const page = resolvePage(project, op, fallbackPageId);
        if (!page) throw new Error('page not found');
        if (project.pages.length <= 1) throw new Error('a project needs at least one page');
        project.pages = project.pages.filter((item) => item.id !== page.id);
        if (project.pages.length && !project.pages.some((item) => item.path === '/')) {
          project.pages[0].path = '/';
        }
        applied++;
        continue;
      }

      if (op.op === 'replacePage') {
        const page = resolvePage(project, op, fallbackPageId);
        if (!page) throw new Error('page not found');
        const list = op.elements ?? op.page?.elements ?? [];
        const elements = normalizeElementList(list);
        if (!elements.length) throw new Error('replacement page has no elements');
        page.elements = elements;
        pageIds.add(page.id);
        applied++;
        continue;
      }

      if (op.op === 'createElement') {
        const element = normalizeElement(op.element);
        if (!element) throw new Error('invalid element');
        const page = resolvePage(project, op, fallbackPageId);
        if (!page) throw new Error('page not found');
        insertIntoParent(page, op.parentId, element, op.position ?? 'inside');
        pageIds.add(page.id);
        applied++;
        continue;
      }

      const found = findElementByRef(project, op.elementId, op.elementName);
      if (!found && op.op === 'deleteElement') {
        // Deleting an unknown id is a no-op rather than a catastrophic action.
        errors.push(`deleteElement: element not found (${op.elementId ?? op.elementName ?? '?'})`);
        continue;
      }
      if (!found) throw new Error(`element not found (${op.elementId ?? op.elementName ?? '?'})`);
      const { page, el, list, index } = found;
      pageIds.add(page.id);

      switch (op.op) {
        case 'updateStyle': {
          const style = op.style ?? {};
          if (!Object.keys(style).length) throw new Error('no style properties supplied');
          const target = op.target ?? 'style';
          const bucket =
            target === 'hover'
              ? el.hover
              : target === 'tablet'
              ? el.responsive.tablet
              : target === 'mobile'
              ? el.responsive.mobile
              : el.style;
          for (const [key, value] of Object.entries(style)) bucket[toCssKey(key)] = value;
          applied++;
          break;
        }
        case 'updateContent':
          if (typeof op.content !== 'string') throw new Error('no content supplied');
          el.content = op.content;
          applied++;
          break;
        case 'updateProps': {
          const props = op.props ?? {};
          if (!Object.keys(props).length) throw new Error('no properties supplied');
          el.props = { ...el.props, ...props };
          applied++;
          break;
        }
        case 'updateName':
          if (!op.name) throw new Error('no name supplied');
          el.name = op.name;
          applied++;
          break;
        case 'deleteElement':
          list.splice(index, 1);
          applied++;
          break;
        case 'duplicateElement': {
          const copy = cloneWithNewIds(el);
          list.splice(index + 1, 0, copy);
          applied++;
          break;
        }
        case 'replaceElement': {
          const replacement = normalizeElement(op.element);
          if (!replacement) throw new Error('invalid replacement element');
          list.splice(index, 1, replacement);
          applied++;
          break;
        }
        case 'moveElement': {
          if (op.parentId && op.parentId === el.id) throw new Error('cannot move an element inside itself');
          list.splice(index, 1);
          insertIntoParent(page, op.parentId, el, op.position ?? 'inside');
          applied++;
          break;
        }
        default:
          throw new Error(`unknown operation: ${String(op.op)}`);
      }
    } catch (error: any) {
      errors.push(`${op.op}: ${error?.message ?? 'failed'}`);
    }
  }

  project.updatedAt = Date.now();
  return { applied, errors, pageIds: [...pageIds], createdPageIds };
}

/* ------------------------------- generation ------------------------------- */

export async function generateWebsite(
  ai: AISettings,
  apiKey: string,
  description: string,
  onStage: (stages: AIStage[]) => void,
  onDelta?: (delta: string) => void
): Promise<GenerateResult> {
  const stages: AIStage[] = [
    { id: 'request', label: 'Sending request to provider', status: 'active' },
    { id: 'parse', label: 'Parsing structured document', status: 'pending' },
    { id: 'validate', label: 'Validating layout tree', status: 'pending' },
    { id: 'apply', label: 'Applying to canvas', status: 'pending' },
  ];
  onStage(clone(stages));

  const baseMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt() },
    { role: 'user', content: `Create a complete website for: ${description}` },
  ];
  const maxTokens = Math.max(Number(ai.maxTokens) || 0, 8192);
  let lastRaw = '';
  let lastError = '';

  for (let attempt = 1; attempt <= 3; attempt++) {
    const messages = [...baseMessages];
    if (attempt > 1 && lastRaw) {
      messages.push({ role: 'assistant', content: lastRaw.slice(0, 14000) });
      messages.push({
        role: 'user',
        content: `That response could not be used (${lastError}). Return the complete corrected website as ONE valid JSON object with a non-empty "pages" array and real "elements". No markdown, no explanation.`,
      });
      stages[0].label = `Repairing model response (attempt ${attempt})`;
    }
    stages[0].status = 'active';
    stages[1].status = 'pending';
    stages[2].status = 'pending';
    stages[3].status = 'pending';
    onStage(clone(stages));

    let text = '';
    try {
      text = await runChat(
        {
          provider: ai.provider,
          ollamaUrl: ai.ollamaUrl,
          ollamaModel: ai.ollamaModel,
          apiBaseUrl: ai.apiBaseUrl,
          apiModel: ai.apiModel,
          apiKey,
          temperature: attempt === 1 ? ai.temperature : Math.min(0.35, ai.temperature),
          maxTokens,
          messages,
          jsonMode: true,
          contextTokens: 16384,
        },
        onDelta
      );
    } catch (error: any) {
      stages[0].status = 'error';
      onStage(clone(stages));
      return {
        project: null,
        error: error?.message || 'The AI provider request failed.',
        raw: lastRaw,
        attempts: attempt,
      };
    }
    lastRaw = text;
    stages[0].status = 'done';
    stages[1].status = 'active';
    onStage(clone(stages));

    const json = extractJson(text);
    if (json === null) {
      lastError = 'the response was not valid JSON';
      stages[1].status = 'error';
      onStage(clone(stages));
      continue;
    }

    stages[1].status = 'done';
    stages[2].status = 'active';
    onStage(clone(stages));

    const project = normalizeProjectDocument(json, 'AI generated website');
    if (!project) {
      lastError = 'the document contained no usable pages or elements';
      stages[2].status = 'error';
      onStage(clone(stages));
      continue;
    }

    stages[2].status = 'done';
    stages[3].status = 'active';
    onStage(clone(stages));
    await new Promise((resolve) => setTimeout(resolve, 180));
    stages[3].status = 'done';
    onStage(clone(stages));
    return { project, raw: text, attempts: attempt };
  }

  return {
    project: null,
    error:
      'The model did not return a usable website after automatic retries. Try a more specific prompt, a smaller site, or a stronger model.',
    raw: lastRaw.slice(0, 4000),
    attempts: 3,
  };
}

export interface EditResult {
  ops: EditOp[];
  error?: string;
  raw?: string;
  applied?: number;
  warnings?: string[];
  attempts?: number;
}

export async function generateEditOps(
  ai: AISettings,
  apiKey: string,
  instruction: string,
  element: WebElement | null,
  project: Project,
  onDelta?: (delta: string) => void,
  options: {
    history?: Array<{ role: 'user' | 'assistant'; content: string; kind?: string }>;
    focusPageId?: string | null;
  } = {}
): Promise<EditResult> {
  const siteContext = buildSiteContext(project, {
    focusPageId: options.focusPageId,
    maxChars: 30000,
  });
  const selected = element
    ? `SELECTED ELEMENT (full JSON):\n${JSON.stringify(element).slice(0, 14000)}`
    : 'No single element is selected. Use pageId and element IDs from the site context.';
  const history = cleanHistory(options.history);
  const messages: ChatMessage[] = [
    { role: 'system', content: editSystemPrompt() },
    ...history,
    {
      role: 'user',
      content: `CURRENT WEBSITE:\n${siteContext}\n\n${selected}\n\nREQUEST: ${instruction}`,
    },
  ];

  const maxTokens = Math.max(Number(ai.maxTokens) || 0, 4096);
  let best: { ops: EditOp[]; raw: string; applied: number; errors: string[] } = {
    ops: [],
    raw: '',
    applied: 0,
    errors: [],
  };
  let lastError = '';

  for (let attempt = 1; attempt <= 2; attempt++) {
    let text = '';
    try {
      text = await runChat(
        {
          provider: ai.provider,
          ollamaUrl: ai.ollamaUrl,
          ollamaModel: ai.ollamaModel,
          apiBaseUrl: ai.apiBaseUrl,
          apiModel: ai.apiModel,
          apiKey,
          temperature: attempt === 1 ? Math.min(0.55, ai.temperature) : 0.15,
          maxTokens,
          messages,
          jsonMode: true,
          contextTokens: 16384,
        },
        onDelta
      );
    } catch (error: any) {
      return { ops: [], error: error?.message || 'The AI provider request failed.', raw: best.raw, attempts: attempt };
    }

    const json = extractJson(text);
    const ops = json === null ? [] : normalizeEditOps(json);
    if (!ops.length) {
      lastError = 'the response contained no usable operations';
      messages.push({ role: 'assistant', content: text.slice(0, 10000) });
      messages.push({
        role: 'user',
        content: `That response did not contain an "ops" array. Return ONLY {"ops":[...]} using the operation schema and the real IDs from CURRENT WEBSITE.`,
      });
      continue;
    }

    const dry = applyOps(clone(project), ops, options.focusPageId ?? project.pages[0]?.id ?? null);
    if (dry.applied > best.applied) best = { ops, raw: text, applied: dry.applied, errors: dry.errors };
    if (dry.errors.length === 0) {
      return { ops, raw: text, applied: dry.applied, warnings: [], attempts: attempt };
    }
    if (dry.applied > 0) {
      // Keep the partial result, but let the model fix the remaining ops once.
      lastError = dry.errors.slice(0, 6).join('; ');
    } else {
      lastError = dry.errors.slice(0, 6).join('; ');
    }
    messages.push({ role: 'assistant', content: text.slice(0, 10000) });
    messages.push({
      role: 'user',
      content: `Some operations could not be applied: ${lastError}. Return a corrected {"ops":[...]}. Use only element/page IDs that appear in CURRENT WEBSITE. Do not mention this correction in the output.`,
    });
  }

  if (best.ops.length && best.applied > 0) {
    return {
      ops: best.ops,
      raw: best.raw,
      applied: best.applied,
      warnings: best.errors,
      attempts: 2,
    };
  }
  return {
    ops: [],
    error:
      'The assistant could not turn that request into safe document changes. Try naming the page or section you want changed, or ask for a smaller edit.',
    raw: best.raw.slice(0, 4000),
    attempts: 2,
  };
}

/* --------------------------- op descriptions --------------------------- */

export function describeEditOp(op: EditOp): string {
  switch (op.op) {
    case 'updateStyle':
      return `Restyle ${op.elementName ?? op.elementId ?? 'element'} · ${Object.keys(op.style ?? {})
        .slice(0, 3)
        .join(', ')}`;
    case 'updateContent':
      return `Rewrite ${op.elementName ?? op.elementId ?? 'text'} · ${(op.content ?? '').slice(0, 60)}`;
    case 'updateProps':
      return `Update props · ${Object.keys(op.props ?? {}).join(', ')}`;
    case 'updateName':
      return `Rename layer · ${op.name ?? 'element'}`;
    case 'createElement':
      return `Add ${op.element?.type ?? 'element'}${op.pageName ? ` to ${op.pageName}` : ''}`;
    case 'deleteElement':
      return `Delete ${op.elementName ?? op.elementId ?? 'element'}`;
    case 'replaceElement':
      return `Replace ${op.elementName ?? op.elementId ?? 'element'}`;
    case 'duplicateElement':
      return `Duplicate ${op.elementName ?? op.elementId ?? 'element'}`;
    case 'moveElement':
      return `Move ${op.elementName ?? op.elementId ?? 'element'}`;
    case 'createPage':
      return `Create page · ${op.page?.name ?? op.name ?? 'new page'}`;
    case 'updatePage':
      return `Update page · ${op.page?.name ?? op.pageName ?? op.pageId ?? 'page'}`;
    case 'deletePage':
      return `Delete page · ${op.pageName ?? op.pageId ?? 'page'}`;
    case 'replacePage':
      return `Rebuild page · ${op.pageName ?? op.pageId ?? 'page'}`;
    case 'updateProject':
      return `Update website settings`;
    default:
      return 'Change';
  }
}
