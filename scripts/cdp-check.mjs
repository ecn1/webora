import fs from 'node:fs';

const PORT = process.env.CDP_PORT || '9222';
const targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
const target = targets.find((t) => t.type === 'page' && t.url.includes('index.html'));
if (!target) throw new Error('No Webora page target found');

const ws = new WebSocket(target.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();

ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message));
    else resolve(msg.result);
  }
});

await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true });
  ws.addEventListener('error', reject, { once: true });
});

function send(method, params = {}) {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression, awaitPromise = true) {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise,
    returnByValue: true,
    userGesture: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  }
  return result.result.value;
}

await send('Runtime.enable');
await send('Page.enable');

const basic = await evaluate(`(async () => ({
  title: document.title,
  bridge: typeof window.webora,
  isDesktop: window.webora?.isDesktop,
  appInfo: await window.webora?.appInfo(),
  projects: (await window.webora?.loadProjects())?.length,
  body: document.body.innerText.slice(0, 240),
  size: { w: innerWidth, h: innerHeight },
}))()`);

console.log(JSON.stringify(basic, null, 2));

if (process.env.CAPTURE === '1') {
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync('webora-packaged.png', Buffer.from(shot.data, 'base64'));
  console.log('screenshot: webora-packaged.png');
}

ws.close();
setTimeout(() => process.exit(0), 300);
