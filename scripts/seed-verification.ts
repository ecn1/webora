// Seeds a disposable "Verification Site" fixture for manual QA.
// This replaces projects.json, so it requires an explicit --confirm flag.
import fs from 'node:fs';
import path from 'node:path';
import { createElement, createPage, createProject } from '../src/lib/docEngine';
import type { ElementType, WebElement } from '../src/types';

if (!process.argv.includes('--confirm')) {
  console.error('Refusing to replace projects.json without --confirm.');
  console.error('Run: npx esbuild scripts/seed-verification.ts --bundle --platform=node --format=esm --packages=external --outfile=scripts/.seed-verification.mjs');
  console.error('     node scripts/.seed-verification.mjs --confirm');
  process.exit(1);
}

function el(type: ElementType, props: Record<string, string> = {}, extra: Partial<WebElement> = {}): WebElement {
  const base = createElement(type);
  return {
    ...base,
    ...extra,
    props: { ...base.props, ...props },
  };
}

const project = createProject('Verification Site');
project.id = 'proj_verify';
project.pages = [];

const home = createPage('Home', '/');
home.id = 'page_home';

const form = el(
  'form',
  { formName: 'Contact us', successMessage: 'Thanks — your message was saved!', emailTo: '', webhook: '' },
  { id: 'form_contact' }
);
form.children = [
  el('input', { label: 'Full name', name: 'full_name', placeholder: 'Ada Lovelace', required: 'true' }),
  el('emailInput', { label: 'Email', name: 'email', placeholder: 'ada@example.com', required: 'true' }),
  el('textarea', { label: 'Message', name: 'message', placeholder: 'Tell us what you need' }),
  el('select', { label: 'Budget', name: 'budget', options: 'Under $1k,$1k-$5k,$5k+' }),
  el('submit', { sendEmail: 'false', openLink: 'false' }),
];

const tabs = el('tabs', { tabs: 'Home,About', mode: 'navigate', targets: '/, /about' }, { id: 'tabs_nav' });

const video = el('video', {
  src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  title: 'Product walkthrough',
});

const modal = el('modal', { title: 'How it works', size: 'md' }, { id: 'modal_info' });
modal.children = [el('paragraph', {}, { content: 'Everything in this dialog is real page content.' })];

const slider = el('slider', { label: 'Monthly budget', min: '0', max: '100', step: '5', value: '45' }, { id: 'slider_budget' });
const progress = el('progress', { label: 'Profile complete', value: '72', mode: 'manual' });
const mail = el(
  'mail',
  {
    to: 'hello@webora.test',
    subject: 'Project enquiry',
    body: 'Hi Webora team,\n\nI would like to build a site.',
    provider: 'gmail',
    buttonText: 'Open Gmail',
  },
  { id: 'mail_cta' }
);

home.elements = [
  el('navbar'),
  el('heading', { level: 'h1' }, { content: 'Built with Webora' }),
  el('paragraph', {}, { content: 'This project verifies preview interactivity, forms, tabs, media and the workspace.' }),
  form,
  tabs,
  el('heading', { level: 'h2' }, { content: 'Media and controls' }),
  video,
  modal,
  slider,
  progress,
  mail,
  el('button', { href: '/about' }, { content: 'Read about us' }),
];

const about = createPage('About', '/about');
about.id = 'page_about';
about.elements = [
  el('heading', { level: 'h1' }, { content: 'About us' }),
  el('paragraph', {}, { content: 'A second page used to verify preview navigation.' }),
  el('button', { href: '/' }, { content: 'Back home' }),
];
about.title = 'About';
about.description = 'About this site';

project.pages = [home, about];

const png =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAJUlEQVR42u3OMQEAAAgDoC251a3gLwSgTZqFgICAgICAgICAgICAgIC1AJkPAAH8pQ0iAAAAAElFTkSuQmCC';
project.assets = [
  { id: 'asset_logo', name: 'webora-mark.png', type: 'image/png', dataUrl: png, size: 90, createdAt: Date.now() },
];

const dir = path.join(process.env.APPDATA || '', 'webora', 'webora-data');
fs.mkdirSync(dir, { recursive: true });
const settingsFile = path.join(dir, 'settings.json');
let settings: Record<string, unknown> = {};
try {
  settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
} catch {
  // No existing settings — write the fixture defaults.
}
fs.writeFileSync(path.join(dir, 'projects.json'), JSON.stringify([project], null, 2), 'utf8');
fs.writeFileSync(
  settingsFile,
  JSON.stringify({ ...settings, autosave: true, autosaveDelay: 250 }, null, 2),
  'utf8'
);
console.log('seeded', path.join(dir, 'projects.json'));
console.log('pages', project.pages.map((p) => `${p.name}:${p.path}`).join(', '));
console.log('formId', form.id);
