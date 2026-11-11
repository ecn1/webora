import assert from 'node:assert/strict';
import { createElement, createPage, createProject, ensureProjectShape } from '../src/lib/docEngine';
import {
  generateExport,
  generatePageHtml,
  generateBaseJs,
  mailComposeUrl,
  videoEmbedUrl,
} from '../src/lib/codegen';
import {
  applyOps,
  buildSiteContext,
  extractJson,
  normalizeEditOps,
  normalizeProjectDocument,
} from '../src/lib/ai';
import { TEMPLATES } from '../src/lib/templates';
import { flattenElements } from '../src/lib/docEngine';

let passed = 0;
function ok(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (error: any) {
    console.log(`FAIL  ${name}`);
    console.log(`      ${error?.message ?? error}`);
    process.exitCode = 1;
  }
}

const proj = createProject('Test site');
const page = proj.pages[0];

function el(type: any, props: Record<string, string> = {}, content = '') {
  const node = createElement(type, { props: { ...createElement(type).props, ...props }, content: content || createElement(type).content });
  return node;
}

console.log('\nVideo');
ok('youtube watch url embeds', () => {
  assert.equal(videoEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0');
});
ok('youtu.be short url embeds', () => {
  assert.equal(videoEmbedUrl('https://youtu.be/dQw4w9WgXcQ?t=4'), 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0');
});
ok('vimeo url embeds', () => {
  assert.equal(videoEmbedUrl('https://vimeo.com/76979871'), 'https://player.vimeo.com/video/76979871?dnt=1');
});
ok('mp4 is not embedded', () => {
  assert.equal(videoEmbedUrl('https://cdn.example.com/a.mp4'), null);
});
ok('video element renders iframe', () => {
  const node = el('video', { src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
  page.elements.push(node);
  const html = generatePageHtml(proj, page);
  assert.match(html, /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);
  assert.match(html, /allowfullscreen/);
  page.elements.pop();
});
ok('video element renders native video tag', () => {
  const node = el('video', { src: 'https://cdn.example.com/a.mp4', controls: 'true', poster: 'https://cdn.example.com/p.jpg' });
  page.elements.push(node);
  const html = generatePageHtml(proj, page);
  assert.match(html, /<video[^>]+src="https:\/\/cdn\.example\.com\/a\.mp4"/);
  assert.match(html, /poster="https:\/\/cdn\.example\.com\/p\.jpg"/);
  assert.match(html, /controls/);
  page.elements.pop();
});

console.log('\nMail');
ok('gmail compose url', () => {
  const url = mailComposeUrl({ to: 'hi@site.com', subject: 'Hello there', body: 'Line one\nLine two' });
  assert.match(url, /^mailto:hi@site\.com\?/);
  assert.match(url, /subject=Hello%20there/);});
ok('mail element renders provider link', () => {
  const node = el('mail', { to: 'hi@site.com', subject: 'Hi', provider: 'gmail', buttonText: 'Write us' });
  page.elements.push(node);
  const html = generatePageHtml(proj, page);
  assert.match(html, /mail\.google\.com\/mail\/\?view=cm/);
  assert.match(html, /Write us/);
  page.elements.pop();
});

console.log('\nTabs / modal / slider / progress');
ok('tabs render panels and buttons', () => {
  const node = el('tabs', { tabs: 'One,Two', mode: 'content' });
  node.children = [createElement('card', { name: 'Panel A' }), createElement('card', { name: 'Panel B' })];
  page.elements.push(node);
  const html = generatePageHtml(proj, page);
  assert.match(html, /data-w-tabs/);
  assert.match(html, /data-w-tab="0"/);
  assert.match(html, /data-w-panel="1"/);
  page.elements.pop();
});
ok('tabs navigate mode targets', () => {
  const node = el('tabs', { tabs: 'Home,About', mode: 'navigate', targets: '/, /about' });
  page.elements.push(node);
  const html = generatePageHtml(proj, page);
  assert.match(html, /data-mode="navigate"/);
  assert.match(html, /data-target="\/about"/);
  page.elements.pop();
});
ok('modal renders backdrop and trigger', () => {
  const node = el('modal', { title: 'Details', size: 'lg' });
  page.elements.push(node);
  const html = generatePageHtml(proj, page);
  assert.match(html, /w-modal-backdrop/);
  assert.match(html, /w-modal-lg/);
  assert.match(html, /Details/);
  page.elements.pop();
});
ok('slider renders range input', () => {
  const node = el('slider', { label: 'Amount', min: '10', max: '90', value: '40', showValue: 'true' });
  page.elements.push(node);
  const html = generatePageHtml(proj, page);
  assert.match(html, /type="range"/);
  assert.match(html, /min="10"/);
  assert.match(html, /max="90"/);
  page.elements.pop();
});
ok('progress form mode marker', () => {
  const node = el('progress', { mode: 'form', label: 'Complete' });
  page.elements.push(node);
  const html = generatePageHtml(proj, page);
  assert.match(html, /data-w-progress data-mode="form"/);
  page.elements.pop();
});

console.log('\nForms');
const formNode = el('form', { formName: 'Contact', successMessage: 'Thanks!', emailTo: 'hi@site.com', webhook: 'https://hooks.example.com/x' });
formNode.children = [
  createElement('input', { props: { ...createElement('input').props, label: 'Full name', name: 'full_name', required: 'true' } }),
  createElement('emailInput', { props: { ...createElement('emailInput').props, label: 'Email', name: 'email' } }),
  createElement('textarea', { props: { ...createElement('textarea').props, label: 'Message', name: 'message' } }),
];
const submit = createElement('submit', { props: { ...createElement('submit').props, sendEmail: 'true', emailTo: 'hi@site.com' } });
formNode.children.push(submit);
page.elements.push(formNode);

const formHtml = generatePageHtml(proj, page, { inline: true });
ok('form renders fields with data labels', () => {
  assert.match(formHtml, /data-w-form/);
  assert.match(formHtml, /data-w-label="Full name"/);
  assert.match(formHtml, /name="full_name"/);
  assert.match(formHtml, /required/);
});
ok('form carries delivery config', () => {
  assert.match(formHtml, /data-success="Thanks!"/);
  assert.match(formHtml, /data-email-to="hi@site\.com"/);
  assert.match(formHtml, /data-webhook="https:\/\/hooks\.example\.com\/x"/);
});
ok('form runtime script is syntactically valid', () => {
  const js = generateBaseJs({ mode: 'export' });
  assert.doesNotThrow(() => new Function(js));
  const html = generatePageHtml(proj, page, { inline: true });
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert.ok(scripts.length > 0, 'page html has no inline scripts');
  for (const s of scripts) new Function(s);
});

console.log('\nPreview runtime');
ok('preview script posts navigate and submit', () => {
  const js = generateBaseJs({ mode: 'preview', token: 'abc123' });
  new Function(js);
  assert.match(js, /webora-preview/);
  assert.match(js, /abc123/);
  assert.match(js, /navigate/);
  assert.match(js, /form-submit/);
});
ok('preview page posts message with token', () => {
  const html = generatePageHtml(proj, page, { mode: 'preview', token: 'tok-1', inline: true });
  assert.match(html, /tok-1/);
  assert.match(html, /postMessage/);
});

console.log('\nExports');
ok('export rewrites internal page links', () => {
  const proj2 = createProject('Links');
  proj2.pages = [createPage('Home', '/'), createPage('About', '/about')];
  const button = createElement('button', { content: 'About us', props: { ...createElement('button').props, href: '/about' } });
  proj2.pages[0].elements = [button];
  const files = generateExport(proj2, {});
  const home = files.find((f) => f.path === 'index.html');
  const about = files.find((f) => f.path === 'about.html');
  assert.ok(home && about, 'expected index.html and about.html');
  assert.match(home!.content, /href="about\.html"/);
});
ok('export includes js and css assets', () => {
  const files = generateExport(proj, {});
  assert.ok(files.some((f) => f.path === 'css/style.css'));
  assert.ok(files.some((f) => f.path === 'js/script.js'));
  const js = files.find((f) => f.path === 'js/script.js')!.content;
  new Function(js);
});
ok('export page has no preview bridge', () => {
  const files = generateExport(proj, {});
  const home = files.find((f) => f.path === 'index.html')!;
  assert.doesNotMatch(home.content, /webora-preview/);
});

console.log('\nTemplates');
ok('every template builds and exports cleanly', () => {
  for (const meta of TEMPLATES) {
    const built = meta.build();
    const normalized = ensureProjectShape(built);
    assert.ok(normalized, `template ${meta.id} failed shape`);
    for (const p of normalized!.pages) {
      const html = generatePageHtml(normalized!, p, { inline: true });
      assert.ok(html.includes('</html>'), `template ${meta.id} page ${p.name} html incomplete`);
    }
    const files = generateExport(normalized!, { minify: true });
    assert.ok(files.length >= 3, `template ${meta.id} export too small`);
    for (const f of files) if (f.path.endsWith('.js')) new Function(f.content);
  }
});

console.log('\nDoc engine');
ok('ensureProjectShape preserves submissions and trash state', () => {
  const raw = JSON.parse(JSON.stringify(proj));
  raw.submissions = [
    { id: 'sub1', formId: 'f1', formName: 'Contact', pageId: 'p', pageName: 'Home', submittedAt: 1, respondentName: 'Ada', respondentEmail: 'a@b.c', values: [{ label: 'Name', value: 'Ada', name: 'name', type: 'text' }] },
  ];
  raw.trashedAt = 123;
  const shaped = ensureProjectShape(raw);
  assert.equal(shaped?.submissions?.length, 1);
  assert.equal(shaped?.trashedAt, 123);
});
ok('form library entries exist', () => {
  const shaped = ensureProjectShape({ ...proj, pages: [{ ...proj.pages[0], elements: [createElement('form'), createElement('mail')] }] });
  assert.ok(shaped);
  const types = flattenElements(shaped!.pages[0].elements).map((x) => x.el.type);
  assert.ok(types.includes('form'));
  assert.ok(types.includes('mail'));
});

console.log('\nAI JSON recovery');
ok('extracts JSON from fences and prose', () => {
  const parsed = extractJson('Here is your site:\n```json\n{"name":"Fenced","pages":[]}\n```\nEnjoy.');
  assert.equal(parsed?.name, 'Fenced');
});
ok('repairs trailing commas and smart quotes', () => {
  const parsed = extractJson('{"name":"Repaired","notes":["a","b",],"quoted":"‘ok’",}');
  assert.equal(parsed?.name, 'Repaired');
  assert.equal(parsed?.notes.length, 2);
  assert.equal(parsed?.quoted, "'ok'");
});
ok('recovers a truncated document', () => {
  const parsed = extractJson(
    '{"name":"Cut","pages":[{"name":"Home","path":"/","elements":[{"type":"heading","content":"Hello'
  );
  assert.equal(parsed?.name, 'Cut');
  assert.equal(parsed?.pages?.[0]?.elements?.[0]?.content, 'Hello');
});
ok('recovers a truncated object after a complete sibling', () => {
  const parsed = extractJson(
    '{"name":"Partial","pages":[{"name":"Home","elements":[{"type":"heading","content":"Hi"}]}],"settings":{"seoTitle":"Half'
  );
  assert.equal(parsed?.pages?.[0]?.elements?.[0]?.content, 'Hi');
});
ok('unwraps a JSON string containing JSON', () => {
  const parsed = extractJson(JSON.stringify(JSON.stringify({ name: 'Nested', pages: [] })));
  assert.equal(parsed?.name, 'Nested');
});
ok('returns null for prose without JSON', () => {
  assert.equal(extractJson('I could not build that website.'), null);
});

console.log('\nAI document normalisation');
ok('accepts site/pages aliases and html-like element names', () => {
  const doc = normalizeProjectDocument({
    site: {
      name: 'Alias Site',
      pages: {
        Home: {
          path: '/',
          sections: [
            {
              type: 'section',
              children: [
                { tag: 'h1', text: 'Hello alias', styles: { fontSize: '40px' } },
                { tag: 'img', src: 'https://example.com/hero.jpg', alt: 'Hero' },
                { tag: 'a', content: 'About', href: '/about' },
              ],
            },
          ],
        },
        About: {
          title: 'About us',
          blocks: [{ type: 'paragraph', content: 'About the studio', css: 'color: red;' }],
        },
      },
    },
  });
  assert.ok(doc, 'expected a project');
  assert.equal(doc!.name, 'Alias Site');
  assert.equal(doc!.pages.length, 2);
  assert.equal(doc!.pages[0].elements[0].children[0].type, 'heading');
  assert.equal(doc!.pages[0].elements[0].children[0].props.level, 'h1');
  assert.equal(doc!.pages[0].elements[0].children[1].type, 'image');
  assert.equal(doc!.pages[0].elements[0].children[1].props.src, 'https://example.com/hero.jpg');
  assert.equal(doc!.pages[0].elements[0].children[2].type, 'link');
  assert.equal(doc!.pages[1].path, '/about');
  assert.equal(doc!.pages[1].elements[0].style.color, 'red');
});
ok('rejects a document with no usable content', () => {
  assert.equal(normalizeProjectDocument({ name: 'Empty', pages: [] }), null);
  assert.equal(normalizeProjectDocument({ name: 'Empty', pages: [{ name: 'Home', elements: [] }] }), null);
});
ok('project chat history survives normalisation', () => {
  const doc = normalizeProjectDocument({
    name: 'Chatty',
    pages: [{ name: 'Home', elements: [{ type: 'heading', content: 'Hi' }] }],
  });
  assert.ok(doc && Array.isArray(doc.aiChat));
});

console.log('\nAI operations');
ok('normalises operation aliases and kebab-cases styles', () => {
  const ops = normalizeEditOps({
    operations: [
      { action: 'restyle', targetId: 'el-1', styles: { fontSize: '22px' } },
      { action: 'setText', targetId: 'el-2', newContent: 'New copy' },
      { action: 'addPage', page: { name: 'New page', path: '/new' } },
    ],
  });
  assert.equal(ops.length, 3);
  assert.equal(ops[0].op, 'updateStyle');
  assert.equal(ops[0].style?.['font-size'], '22px');
  assert.equal(ops[1].content, 'New copy');
  assert.equal(ops[2].op, 'createPage');
});
ok('applies element ops across a whole project', () => {
  const target = createProject('Ops');
  target.pages.push(createPage('About', '/about'));
  const hero = createElement('heading', { content: 'Old copy' });
  target.pages[0].elements = [hero];
  const result = applyOps(
    target,
    [
      { op: 'updateContent', elementId: hero.id, content: 'New copy' },
      { op: 'updateStyle', elementId: hero.id, style: { fontSize: '48px' } },
      {
        op: 'createPage',
        page: {
          name: 'Services',
          path: '/services',
          elements: [{ type: 'section', children: [{ type: 'heading', content: 'Services' }] }],
        },
      },
      { op: 'updatePage', pageId: target.pages[1].id, page: { path: '/company', title: 'Company' } },
    ],
    target.pages[0].id
  );
  assert.equal(result.errors.length, 0);
  assert.equal(result.applied, 4);
  assert.equal(result.createdPageIds.length, 1);
  assert.equal(target.pages[0].elements[0].content, 'New copy');
  assert.equal(target.pages[0].elements[0].style['font-size'], '48px');
  const created = target.pages.find((p) => p.id === result.createdPageIds[0]);
  assert.equal(created?.path, '/services');
  assert.equal(created?.elements[0].children[0].content, 'Services');
  assert.equal(target.pages[1].path, '/company');
  assert.equal(target.pages[1].title, 'Company');
});
ok('deleting the only page is refused', () => {
  const single = createProject('Single');
  const result = applyOps(single, [{ op: 'deletePage', pageId: single.pages[0].id }]);
  assert.equal(result.applied, 0);
  assert.equal(single.pages.length, 1);
});
ok('deleting an unknown element is a no-op, not a crash', () => {
  const safe = createProject('Safe');
  const result = applyOps(safe, [{ op: 'deleteElement', elementId: 'missing-id' }]);
  assert.equal(result.applied, 0);
  assert.equal(result.errors.length, 1);
  assert.equal(safe.pages.length, 1);
});
ok('deletes real elements and pages by id', () => {
  const doc = createProject('Delete');
  const hero = createElement('heading', { content: 'Remove me' });
  const keep = createElement('paragraph', { content: 'Stay' });
  doc.pages[0].elements = [hero, keep];
  doc.pages.push(createPage('About', '/about'));
  const aboutId = doc.pages[1].id;
  const result = applyOps(doc, [
    { op: 'deleteElement', elementId: hero.id },
    { op: 'deletePage', pageId: aboutId },
  ]);
  assert.equal(result.errors.length, 0);
  assert.equal(result.applied, 2);
  assert.equal(doc.pages[0].elements.length, 1);
  assert.equal(doc.pages[0].elements[0].id, keep.id);
  assert.equal(doc.pages.length, 1);
  assert.equal(doc.pages[0].path, '/');
});
ok('adds nested elements under a real parent id', () => {
  const nested = createProject('Nested');
  const parent = createElement('section');
  nested.pages[0].elements = [parent];
  const result = applyOps(
    nested,
    [
      {
        op: 'createElement',
        pageId: nested.pages[0].id,
        parentId: parent.id,
        element: { type: 'heading', content: 'Inside', props: { level: 'h2' } },
      },
    ],
    null
  );
  assert.equal(result.applied, 1);
  assert.equal(parent.children[0].content, 'Inside');
});
ok('site context exposes real page and element ids', () => {
  const context = buildSiteContext(proj);
  const parsed = JSON.parse(context);
  assert.equal(parsed.project.id, proj.id);
  assert.equal(parsed.pages[0].id, proj.pages[0].id);
  const ids = flattenElements(proj.pages[0].elements).map((x) => x.el.id);
  assert.ok(ids.length > 0);
  assert.ok(JSON.stringify(parsed).includes(ids[0]));
});

console.log('\nDeletion recovery');
ok('a project with no pages is rebuilt instead of dropped', () => {
  const recovered = ensureProjectShape({ id: 'p1', name: 'Recovered', pages: [] });
  assert.ok(recovered);
  assert.equal(recovered!.pages.length, 1);
  assert.equal(recovered!.pages[0].path, '/');
  assert.equal(recovered!.name, 'Recovered');
});
ok('a missing page list is rebuilt instead of dropped', () => {
  const recovered = ensureProjectShape({ id: 'p2', name: 'No pages', pages: undefined });
  assert.ok(recovered);
  assert.equal(recovered!.pages.length, 1);
});
ok('unknown element types keep their content', () => {
  const recovered = ensureProjectShape({
    id: 'p3',
    name: 'Unknown',
    pages: [{ id: 'pg', name: 'Home', path: '/', elements: [{ type: 'weird-widget', content: 'Keep me' }] }],
  });
  assert.ok(recovered);
  const flat = flattenElements(recovered!.pages[0].elements);
  assert.equal(flat.length, 1);
  assert.equal(flat[0].el.content, 'Keep me');
  assert.equal(flat[0].el.type, 'paragraph');
});
ok('project chat history is preserved through shape recovery', () => {
  const recovered = ensureProjectShape({
    ...proj,
    aiChat: [{ id: 'c1', role: 'assistant', content: 'Applied 2 changes', at: 1, kind: 'result', changeCount: 2 }],
  });
  assert.equal(recovered?.aiChat?.length, 1);
  assert.equal(recovered?.aiChat?.[0].kind, 'result');
});

console.log(`\n${passed} checks passed${process.exitCode ? ' · SOME FAILED' : ''}`);
