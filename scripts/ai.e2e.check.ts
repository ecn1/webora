import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { flattenElements } from '../src/lib/docEngine';
import { applyOps, generateEditOps, generateWebsite } from '../src/lib/ai';

const here = path.dirname(fileURLToPath(import.meta.url));
const port = 5211;
const base = `http://127.0.0.1:${port}`;

function waitForHealth(timeoutMs = 8000) {
  const started = Date.now();
  return new Promise<void>((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(`${base}/health`);
        if (res.ok) return resolve();
      } catch {
        /* not up yet */
      }
      if (Date.now() - started > timeoutMs) return reject(new Error('mock provider did not start'));
      setTimeout(tick, 120);
    };
    void tick();
  });
}

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

const server = spawn(process.execPath, [path.join(here, 'mock-ai.mjs')], {
  env: { ...process.env, MOCK_AI_PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stderr.on('data', (chunk) => process.stderr.write(chunk));

const ai = {
  provider: 'openai' as const,
  ollamaUrl: 'http://127.0.0.1:11434',
  ollamaModel: 'llama3.2',
  apiBaseUrl: `${base}/v1`,
  apiModel: 'mock-chat',
  temperature: 0.7,
  maxTokens: 8192,
};

try {
  await waitForHealth();
  console.log('\nAI Studio end-to-end');

  const generated = await generateWebsite(ai, 'mock-key', 'Create a streaming test website', () => {});
  ok('initial generation returns a usable project', () => {
    assert.equal(generated.error, undefined);
    assert.ok(generated.project);
    assert.ok((generated.project?.pages.length ?? 0) >= 2);
  });

  let project = generated.project!;
  const firstPageId = project.pages[0].id;
  const contextIds = flattenElements(project.pages[0].elements).map((entry) => entry.el.id);
  assert.ok(contextIds.length > 0, 'generated page has no elements');
  const history: Array<{ role: 'user' | 'assistant'; content: string }> = [
    { role: 'user', content: 'Create a streaming test website' },
    { role: 'assistant', content: `Created ${project.name}.` },
  ];

  const pageEdit = await generateEditOps(
    ai,
    'mock-key',
    'Add a Services page with a hero and a contact form',
    null,
    project,
    undefined,
    { history, focusPageId: firstPageId }
  );
  ok('follow-up creates a page against the existing project', () => {
    assert.equal(pageEdit.error, undefined);
    assert.ok(pageEdit.ops.length > 0);
    const outcome = applyOps(project, pageEdit.ops, firstPageId);
    assert.equal(outcome.errors.length, 0);
    assert.equal(outcome.createdPageIds.length, 1);
    assert.ok(project.pages.length >= 3);
    const created = project.pages.find((page) => page.id === outcome.createdPageIds[0]);
    assert.equal(created?.path, '/services');
    assert.ok((created?.elements.length ?? 0) > 0);
  });

  const videoEdit = await generateEditOps(
    ai,
    'mock-key',
    'Add a YouTube video section below the hero',
    null,
    project,
    undefined,
    { history, focusPageId: firstPageId }
  );
  ok('follow-up adds a real video element', () => {
    assert.equal(videoEdit.error, undefined);
    const outcome = applyOps(project, videoEdit.ops, firstPageId);
    assert.equal(outcome.errors.length, 0);
    assert.ok(outcome.applied > 0);
    const video = flattenElements(project.pages[0].elements).find((entry) => entry.el.type === 'video');
    assert.ok(video, 'expected a video element');
    assert.match(video!.el.props.src, /youtube\.com\/watch/);
  });

  const copyEdit = await generateEditOps(
    ai,
    'mock-key',
    'Make the hero feel warmer and more premium',
    null,
    project,
    undefined,
    { history, focusPageId: firstPageId }
  );
  ok('follow-up edits existing copy and styles', () => {
    assert.equal(copyEdit.error, undefined);
    const outcome = applyOps(project, copyEdit.ops, firstPageId);
    assert.equal(outcome.errors.length, 0);
    assert.ok(copyEdit.ops.some((op) => op.op === 'updateContent'));
    assert.ok(copyEdit.ops.some((op) => op.op === 'updateStyle'));
  });

  const unknownTarget = await generateEditOps(
    ai,
    'mock-key',
    'Add a contact form and a Gmail button',
    null,
    project,
    undefined,
    { history, focusPageId: firstPageId }
  );
  ok('follow-up adds a working form and mail action', () => {
    assert.equal(unknownTarget.error, undefined);
    applyOps(project, unknownTarget.ops, firstPageId);
    const flat = flattenElements(project.pages[0].elements);
    assert.ok(flat.some((entry) => entry.el.type === 'form'));
    assert.ok(flat.some((entry) => entry.el.type === 'mail'));
  });

  const untouchedPages = project.pages.length;
  ok('follow-ups never drop existing pages', () => {
    assert.ok(untouchedPages >= 3);
    assert.ok(project.pages.some((page) => page.path === '/pricing'));
  });

  console.log(`\n${passed} checks passed${process.exitCode ? ' · SOME FAILED' : ''}`);
} finally {
  server.kill();
}
