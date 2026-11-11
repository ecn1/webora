import type { ElementType, Page, Project, WebElement } from '../types';
import { clone, uid } from './utils';

export const CONTAINER_TYPES: ElementType[] = [
  'section',
  'container',
  'flex',
  'grid',
  'columns',
  'card',
  'navbar',
  'footer',
  'accordion',
  'tabs',
  'modal',
  'form',
];

export const TEXT_TYPES: ElementType[] = ['heading', 'paragraph', 'text', 'button', 'link', 'breadcrumbs'];

export interface ElementSpec {
  type: ElementType;
  label: string;
  group: string;
}

export const ELEMENT_LIBRARY: ElementSpec[] = [
  { type: 'heading', label: 'Heading', group: 'Basic' },
  { type: 'paragraph', label: 'Paragraph', group: 'Basic' },
  { type: 'button', label: 'Button', group: 'Basic' },
  { type: 'link', label: 'Link', group: 'Basic' },
  { type: 'divider', label: 'Divider', group: 'Basic' },
  { type: 'spacer', label: 'Spacer', group: 'Basic' },
  { type: 'section', label: 'Section', group: 'Layout' },
  { type: 'container', label: 'Container', group: 'Layout' },
  { type: 'flex', label: 'Flexbox', group: 'Layout' },
  { type: 'grid', label: 'Grid', group: 'Layout' },
  { type: 'columns', label: 'Columns', group: 'Layout' },
  { type: 'card', label: 'Card', group: 'Layout' },
  { type: 'image', label: 'Image', group: 'Media' },
  { type: 'video', label: 'Video', group: 'Media' },
  { type: 'icon', label: 'Icon', group: 'Media' },
  { type: 'gallery', label: 'Gallery', group: 'Media' },
  { type: 'navbar', label: 'Navbar', group: 'Navigation' },
  { type: 'breadcrumbs', label: 'Breadcrumbs', group: 'Navigation' },
  { type: 'footer', label: 'Footer', group: 'Navigation' },
  { type: 'input', label: 'Input', group: 'Forms' },
  { type: 'emailInput', label: 'Email', group: 'Forms' },
  { type: 'textarea', label: 'Textarea', group: 'Forms' },
  { type: 'checkbox', label: 'Checkbox', group: 'Forms' },
  { type: 'radio', label: 'Radio', group: 'Forms' },
  { type: 'select', label: 'Select', group: 'Forms' },
  { type: 'submit', label: 'Submit', group: 'Forms' },
  { type: 'form', label: 'Form', group: 'Forms' },
  { type: 'mail', label: 'Mail', group: 'Forms' },
  { type: 'accordion', label: 'Accordion', group: 'Advanced' },
  { type: 'tabs', label: 'Tabs', group: 'Advanced' },
  { type: 'modal', label: 'Modal', group: 'Advanced' },
  { type: 'slider', label: 'Slider', group: 'Advanced' },
  { type: 'progress', label: 'Progress', group: 'Advanced' },
  { type: 'customHtml', label: 'HTML', group: 'Advanced' },
  { type: 'customCss', label: 'CSS', group: 'Advanced' },
];

const DEFAULT_STYLE: Record<ElementType, Record<string, string>> = {
  section: { padding: '72px 24px', position: 'relative' },
  container: { 'max-width': '1120px', margin: '0 auto', width: '100%' },
  flex: { display: 'flex', gap: '24px', 'align-items': 'center', 'justify-content': 'space-between' },
  grid: { display: 'grid', 'grid-template-columns': 'repeat(3, 1fr)', gap: '24px' },
  columns: { display: 'flex', gap: '24px', 'align-items': 'stretch' },
  card: {
    background: '#14141f',
    border: '1px solid #26263a',
    'border-radius': '16px',
    padding: '24px',
  },
  heading: {
    'font-size': '44px',
    'font-weight': '700',
    'line-height': '1.15',
    color: '#f4f4fb',
    margin: '0 0 16px',
    'letter-spacing': '-0.02em',
  },
  paragraph: {
    'font-size': '16px',
    'line-height': '1.7',
    color: '#a3a3b8',
    margin: '0 0 16px',
  },
  text: { 'font-size': '15px', color: '#c9c9d9' },
  button: {
    display: 'inline-flex',
    'align-items': 'center',
    'justify-content': 'center',
    gap: '8px',
    background: '#7c5cff',
    color: '#ffffff',
    padding: '12px 24px',
    'border-radius': '10px',
    'font-weight': '600',
    'font-size': '15px',
    'text-decoration': 'none',
    border: 'none',
    cursor: 'pointer',
  },
  link: { color: '#9b82ff', 'text-decoration': 'underline', 'font-size': '15px' },
  divider: { border: 'none', 'border-top': '1px solid #26263a', margin: '32px 0', width: '100%' },
  spacer: { height: '48px', width: '100%' },
  image: {
    'max-width': '100%',
    'border-radius': '12px',
    display: 'block',
    height: 'auto',
  },
  video: { width: '100%', 'border-radius': '12px', display: 'block' },
  icon: { display: 'inline-flex', 'align-items': 'center', 'justify-content': 'center', 'font-size': '32px' },
  gallery: { display: 'grid', 'grid-template-columns': 'repeat(3, 1fr)', gap: '12px' },
  navbar: {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    padding: '18px 32px',
    background: 'rgba(10,10,18,0.85)',
    'border-bottom': '1px solid #1d1d2e',
    'backdrop-filter': 'blur(12px)',
    position: 'sticky',
    top: '0',
    'z-index': '50',
  },
  footer: {
    padding: '56px 32px',
    'border-top': '1px solid #1d1d2e',
    background: '#0b0b13',
    'text-align': 'center',
  },
  breadcrumbs: { 'font-size': '13px', color: '#8b8ba3' },
  input: {
    width: '100%',
    padding: '12px 14px',
    background: '#0e0e18',
    border: '1px solid #2a2a3f',
    'border-radius': '10px',
    color: '#f4f4fb',
    'font-size': '14px',
  },
  emailInput: {
    width: '100%',
    padding: '12px 14px',
    background: '#0e0e18',
    border: '1px solid #2a2a3f',
    'border-radius': '10px',
    color: '#f4f4fb',
    'font-size': '14px',
  },
  textarea: {
    width: '100%',
    padding: '12px 14px',
    background: '#0e0e18',
    border: '1px solid #2a2a3f',
    'border-radius': '10px',
    color: '#f4f4fb',
    'font-size': '14px',
    'min-height': '120px',
  },
  checkbox: { display: 'flex', gap: '8px', 'align-items': 'center', color: '#c9c9d9', 'font-size': '14px' },
  radio: { display: 'flex', gap: '8px', 'align-items': 'center', color: '#c9c9d9', 'font-size': '14px' },
  select: {
    width: '100%',
    padding: '12px 14px',
    background: '#0e0e18',
    border: '1px solid #2a2a3f',
    'border-radius': '10px',
    color: '#f4f4fb',
    'font-size': '14px',
  },
  submit: {
    display: 'inline-flex',
    'align-items': 'center',
    'justify-content': 'center',
    background: '#7c5cff',
    color: '#fff',
    padding: '12px 24px',
    'border-radius': '10px',
    'font-weight': '600',
    border: 'none',
    cursor: 'pointer',
  },
  accordion: { 'border-top': '1px solid #26263a' },
  tabs: { display: 'flex', 'flex-direction': 'column', gap: '14px', 'flex-wrap': 'wrap' },
  modal: {
    display: 'inline-flex',
    'align-items': 'center',
    'justify-content': 'center',
    background: '#7c5cff',
    color: '#fff',
    padding: '12px 22px',
    'border-radius': '10px',
    'font-weight': '600',
    border: 'none',
    cursor: 'pointer',
  },
  slider: { width: '100%' },
  progress: { width: '100%', display: 'block' },
  form: {
    display: 'flex',
    'flex-direction': 'column',
    gap: '12px',
    background: '#12121e',
    border: '1px solid #26263a',
    'border-radius': '16px',
    padding: '24px',
    width: '100%',
  },
  mail: {
    display: 'flex',
    'flex-direction': 'column',
    gap: '12px',
    background: '#12121e',
    border: '1px solid #26263a',
    'border-radius': '16px',
    padding: '24px',
    width: '100%',
  },
  customHtml: { width: '100%' },
  customCss: { display: 'none' },
};

const DEFAULT_CONTENT: Partial<Record<ElementType, string>> = {
  heading: 'Build something remarkable',
  paragraph:
    'A clean starting point for your next idea. Edit this text, restyle it, or ask the assistant to rewrite it for you.',
  text: 'Small supporting text',
  button: 'Get started',
  link: 'Learn more',
  icon: '✦',
  navbar: '',
  footer: '© 2026 Your Company. All rights reserved.',
  breadcrumbs: 'Home / Page',
  input: '',
  emailInput: '',
  textarea: '',
  checkbox: 'Accept terms and conditions',
  radio: 'Option one',
  select: 'Select an option',
  submit: 'Submit',
  accordion: 'Frequently asked question',
  tabs: 'Tab one',
  modal: 'Open modal',
  form: 'Contact form',
  mail: 'Send us an email',
  customHtml:
    '<div style="padding:24px;border:1px dashed #444;border-radius:12px;color:#999">Custom HTML block</div>',
  customCss: '',
};

const DEFAULT_PROPS: Partial<Record<ElementType, Record<string, string>>> = {
  heading: { level: 'h2' },
  button: { href: '#' },
  link: { href: '#' },
  image: {
    src: '',
    alt: 'Image',
  },
  video: { src: '', autoplay: 'false', controls: 'true', loop: 'false', poster: '' },
  icon: { glyph: '✦', image: '' },
  navbar: {},
  input: { label: '', name: '', required: 'false' },
  emailInput: { label: '', name: '', required: 'false' },
  textarea: { label: '', name: '', required: 'false' },
  checkbox: { label: '', name: '', required: 'false' },
  radio: { label: '', name: '', group: 'group', required: 'false' },
  select: { label: '', name: '', required: 'false', options: 'Option one,Option two,Option three' },
  submit: {
    submitForm: 'true',
    sendEmail: 'false',
    emailTo: '',
    emailSubject: '',
    openLink: 'false',
    href: '',
  },
  accordion: { answer: 'Write the answer to this question here.' },
  tabs: { tabs: 'Overview,Details', mode: 'content', targets: '' },
  modal: { title: 'More information', size: 'md' },
  slider: { label: 'Amount', min: '0', max: '100', step: '1', value: '60', showValue: 'true' },
  progress: { label: 'Progress', value: '70', mode: 'manual' },
  form: {
    formName: 'Contact form',
    successMessage: 'Thanks — your response was recorded.',
    emailTo: '',
    emailSubject: '',
    webhook: '',
  },
  mail: {
    to: '',
    subject: '',
    body: '',
    cc: '',
    provider: 'gmail',
    buttonText: 'Open email composer',
    image: '',
  },
  customCss: {},
};

function createDefaultChildren(type: ElementType): WebElement[] {
  if (type === 'form') {
    return [
      createElement('heading', {
        content: 'Send us a message',
        style: { 'font-size': '26px', margin: '0 0 4px', 'letter-spacing': '-0.01em' },
      }),
      createElement('paragraph', {
        content: 'Tell us what you need and we will get back to you.',
        style: { 'font-size': '14px', margin: '0 0 4px' },
      }),
      createElement('input', {
        content: 'Your name',
        props: { label: 'Your name', name: 'name', required: 'true' },
      }),
      createElement('emailInput', {
        content: 'Email address',
        props: { label: 'Email address', name: 'email', required: 'true' },
      }),
      createElement('textarea', {
        content: 'How can we help?',
        props: { label: 'Message', name: 'message', required: 'true' },
      }),
      createElement('progress', {
        props: { label: 'Form completion', value: '0', mode: 'form' },
        style: { 'margin-top': '2px' },
      }),
      createElement('submit', {
        content: 'Send message',
        props: { submitForm: 'true', sendEmail: 'false', openLink: 'false' },
      }),
    ];
  }
  if (type === 'tabs') {
    return [
      createElement('container', {
        name: 'Overview panel',
        style: { padding: '20px', background: '#101019', border: '1px solid #24243a', 'border-radius': '12px' },
        children: [
          createElement('heading', {
            content: 'Overview',
            style: { 'font-size': '22px', margin: '0 0 8px' },
          }),
          createElement('paragraph', {
            content: 'Use each panel to show a different set of content without leaving the page.',
            style: { 'font-size': '14px', margin: '0' },
          }),
        ],
      }),
      createElement('container', {
        name: 'Details panel',
        style: { padding: '20px', background: '#101019', border: '1px solid #24243a', 'border-radius': '12px' },
        children: [
          createElement('heading', {
            content: 'Details',
            style: { 'font-size': '22px', margin: '0 0 8px' },
          }),
          createElement('paragraph', {
            content: 'Edit the labels in the Content tab and replace this panel content with anything you need.',
            style: { 'font-size': '14px', margin: '0' },
          }),
        ],
      }),
    ];
  }
  if (type === 'modal') {
    return [
      createElement('heading', {
        content: 'More information',
        style: { 'font-size': '24px', margin: '0 0 8px' },
      }),
      createElement('paragraph', {
        content: 'Put any content here — details, a form, images, or a call to action. The visitor opens it from the button.',
        style: { 'font-size': '14px', margin: '0' },
      }),
    ];
  }
  return [];
}

export function createElement(type: ElementType, overrides: Partial<WebElement> = {}): WebElement {
  const base: WebElement = {
    id: uid(),
    type,
    name: type.charAt(0).toUpperCase() + type.slice(1),
    content: DEFAULT_CONTENT[type] ?? '',
    props: { ...(DEFAULT_PROPS[type] ?? {}) },
    style: { ...(DEFAULT_STYLE[type] ?? {}) },
    hover: {},
    responsive: { tablet: {}, mobile: {} },
    children: createDefaultChildren(type),
  };
  return { ...base, ...overrides, style: { ...base.style, ...(overrides.style ?? {}) } };
}

export function createPage(name = 'Home', path = '/', elements: WebElement[] = []): Page {
  return {
    id: uid('page'),
    name,
    path,
    title: name,
    description: '',
    elements,
  };
}

export function createProject(name = 'Untitled website'): Project {
  return {
    id: uid('proj'),
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    pages: [createPage('Home', '/')],
    assets: [],
    custom: {},
    settings: { seoTitle: name, seoDescription: '' },
  };
}

export function findElement(
  elements: WebElement[],
  id: string,
  parent: WebElement | null = null
): { el: WebElement; parent: WebElement | null; list: WebElement[]; index: number } | null {
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (el.id === id) return { el, parent, list: elements, index: i };
    const found = findElement(el.children, id, el);
    if (found) return found;
  }
  return null;
}

export function removeElementById(elements: WebElement[], id: string): boolean {
  const found = findElement(elements, id);
  if (!found) return false;
  found.list.splice(found.index, 1);
  return true;
}

export function cloneWithNewIds(el: WebElement): WebElement {
  return {
    ...clone(el),
    id: uid(),
    children: el.children.map(cloneWithNewIds),
  };
}

export function flattenElements(elements: WebElement[], depth = 0): Array<{ el: WebElement; depth: number }> {
  const out: Array<{ el: WebElement; depth: number }> = [];
  for (const el of elements) {
    out.push({ el, depth });
    out.push(...flattenElements(el.children, depth + 1));
  }
  return out;
}

export function countElements(elements: WebElement[]): number {
  return elements.reduce((acc, el) => acc + 1 + countElements(el.children), 0);
}

const ELEMENT_TYPE_SET = new Set<string>(ELEMENT_LIBRARY.map((item) => item.type));

function isRecord(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function stringMap(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') {
      out[String(key)] = String(entry);
    }
  }
  return out;
}

/**
 * Rebuilds a stored/imported element without discarding unknown-but-usable
 * content. This is deliberately forgiving: a project should never disappear
 * because one element was written in an older shape.
 */
export function ensureElementShape(raw: unknown, depth = 0): WebElement | null {
  if (!isRecord(raw) || depth > 12) return null;
  let type: ElementType = ELEMENT_TYPE_SET.has(String(raw.type))
    ? (raw.type as ElementType)
    : raw.children
    ? 'container'
    : raw.content || raw.text || raw.title
    ? 'paragraph'
    : 'container';
  if (type === 'customCss') type = 'customHtml';
  const children = Array.isArray(raw.children)
    ? (raw.children.map((child) => ensureElementShape(child, depth + 1)).filter(Boolean) as WebElement[])
    : [];
  const content =
    typeof raw.content === 'string'
      ? raw.content
      : typeof raw.text === 'string'
      ? raw.text
      : typeof raw.title === 'string'
      ? raw.title
      : '';
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : uid(),
    type,
    name:
      typeof raw.name === 'string' && raw.name
        ? raw.name
        : type.charAt(0).toUpperCase() + type.slice(1),
    content,
    props: stringMap(raw.props),
    style: stringMap(raw.style),
    hover: stringMap(raw.hover),
    responsive: {
      tablet: isRecord(raw.responsive) ? stringMap(raw.responsive.tablet) : {},
      mobile: isRecord(raw.responsive) ? stringMap(raw.responsive.mobile) : {},
    },
    children,
  };
}

export function ensureProjectShape(raw: unknown): Project | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Partial<Project>;
  // A project with a missing or empty page list is still the user's project.
  // Recreate a Home page instead of silently dropping the whole project.
  const rawPages = Array.isArray(p.pages) ? p.pages : [];
  const pages = rawPages.length
    ? rawPages.map((pg) => {
        const page = pg as Partial<Page>;
        return {
          id: page.id ?? uid('page'),
          name: page.name ?? 'Page',
          path: page.path ?? '/',
          title: page.title ?? page.name ?? 'Page',
          description: page.description ?? '',
          elements: Array.isArray(page.elements)
            ? (page.elements.map((element) => ensureElementShape(element)).filter(Boolean) as WebElement[])
            : [],
          custom:
            page.custom && typeof page.custom === 'object'
              ? {
                  html: typeof page.custom.html === 'string' ? page.custom.html : undefined,
                  css: typeof page.custom.css === 'string' ? page.custom.css : undefined,
                  js: typeof page.custom.js === 'string' ? page.custom.js : undefined,
                }
              : undefined,
        };
      })
    : [createPage('Home', '/')];

  if (!pages.some((page) => page.path === '/')) pages[0].path = '/';

  const aiChat = Array.isArray(p.aiChat)
    ? p.aiChat
        .filter((entry) => entry && typeof entry === 'object' && typeof entry.content === 'string')
        .slice(-100)
        .map((entry) => ({
          id: typeof entry.id === 'string' && entry.id ? entry.id : uid('chat'),
          role: entry.role === 'assistant' ? ('assistant' as const) : ('user' as const),
          content: entry.content,
          at: typeof entry.at === 'number' ? entry.at : Date.now(),
          kind:
            entry.kind === 'result' || entry.kind === 'error'
              ? (entry.kind as 'result' | 'error')
              : ('text' as const),
          changeCount: typeof entry.changeCount === 'number' ? entry.changeCount : undefined,
        }))
    : undefined;

  const project: Project = {
    id: p.id ?? uid('proj'),
    name: p.name ?? 'Imported project',
    createdAt: p.createdAt ?? Date.now(),
    updatedAt: p.updatedAt ?? Date.now(),
    trashedAt: typeof p.trashedAt === 'number' ? p.trashedAt : undefined,
    submissions: Array.isArray(p.submissions)
      ? p.submissions.filter(
          (submission) =>
            !!submission &&
            typeof submission === 'object' &&
            typeof submission.id === 'string' &&
            typeof submission.formId === 'string' &&
            Array.isArray(submission.values)
        )
      : [],
    pages,
    assets: Array.isArray(p.assets) ? p.assets : [],
    custom: p.custom ?? {},
    settings: {
      seoTitle: p.settings?.seoTitle ?? p.name ?? 'Website',
      seoDescription: p.settings?.seoDescription ?? '',
      favicon: p.settings?.favicon,
    },
    aiChat,
  };
  return project;
}
