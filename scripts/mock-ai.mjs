import http from 'node:http';

const PORT = Number(process.env.MOCK_AI_PORT || 5199);

const document = {
  name: 'Mock Streaming Site',
  pages: [
    {
      name: 'Home',
      path: '/',
      title: 'Mock Streaming Site',
      description: 'A generated test site.',
      elements: [
        {
          type: 'navbar',
          style: {
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'space-between',
            padding: '20px 48px',
            background: '#0b0b12',
            color: '#f4f4fb',
          },
          children: [
            { type: 'text', content: 'MOCKCO', style: { 'font-weight': '700', 'letter-spacing': '0.12em' } },
            {
              type: 'flex',
              style: { display: 'flex', gap: '20px', 'align-items': 'center' },
              children: [
                { type: 'link', content: 'Product', props: { href: '#product' }, style: { color: '#a9a9c0' } },
                { type: 'link', content: 'Pricing', props: { href: '#pricing' }, style: { color: '#a9a9c0' } },
                {
                  type: 'button',
                  content: 'Get started',
                  style: {
                    background: '#7c5cff',
                    color: '#ffffff',
                    padding: '10px 18px',
                    'border-radius': '8px',
                    'font-weight': '600',
                  },
                },
              ],
            },
          ],
        },
        {
          type: 'section',
          id: 'hero',
          style: { padding: '96px 48px', background: '#0b0b12', color: '#f4f4fb', 'text-align': 'center' },
          children: [
            {
              type: 'text',
              content: 'STREAMING TEST',
              style: {
                display: 'inline-block',
                padding: '6px 12px',
                border: '1px solid rgba(124,92,255,0.4)',
                'border-radius': '999px',
                color: '#b9a8ff',
                'font-size': '11px',
                'letter-spacing': '0.18em',
              },
            },
            {
              type: 'heading',
              content: 'This site arrived one token at a time.',
              props: { level: 'h1' },
              style: {
                'font-size': '56px',
                'line-height': '1.05',
                'letter-spacing': '-0.03em',
                'max-width': '760px',
                margin: '24px auto 0',
              },
            },
            {
              type: 'paragraph',
              content:
                'The local mock provider streamed this structured document through Webora so the pipeline could be verified end to end.',
              style: {
                'font-size': '17px',
                'line-height': '1.7',
                color: '#9a9ab4',
                'max-width': '560px',
                margin: '20px auto 0',
              },
            },
            {
              type: 'button',
              content: 'Explore the result',
              props: { href: '#product' },
              style: {
                background: '#7c5cff',
                color: '#ffffff',
                padding: '14px 24px',
                'border-radius': '10px',
                'font-weight': '600',
                margin: '28px auto 0',
              },
            },
          ],
        },
        {
          type: 'section',
          id: 'product',
          style: { padding: '72px 48px', background: '#111119', color: '#f4f4fb' },
          children: [
            {
              type: 'heading',
              content: 'A generated feature grid',
              props: { level: 'h2' },
              style: { 'font-size': '32px', 'letter-spacing': '-0.02em' },
            },
            {
              type: 'grid',
              style: { display: 'grid', 'grid-template-columns': 'repeat(3, 1fr)', gap: '16px', 'margin-top': '24px' },
              children: [
                {
                  type: 'card',
                  style: {
                    padding: '24px',
                    background: '#171722',
                    border: '1px solid rgba(255,255,255,0.08)',
                    'border-radius': '14px',
                  },
                  children: [
                    { type: 'heading', content: 'Composable', props: { level: 'h3' }, style: { 'font-size': '18px' } },
                    {
                      type: 'paragraph',
                      content: 'Every block stays editable on the canvas.',
                      style: { color: '#9a9ab4', 'font-size': '14px', 'line-height': '1.6' },
                    },
                  ],
                },
                {
                  type: 'card',
                  style: {
                    padding: '24px',
                    background: '#171722',
                    border: '1px solid rgba(255,255,255,0.08)',
                    'border-radius': '14px',
                  },
                  children: [
                    { type: 'heading', content: 'Responsive', props: { level: 'h3' }, style: { 'font-size': '18px' } },
                    {
                      type: 'paragraph',
                      content: 'Breakpoint overrides export as real CSS.',
                      style: { color: '#9a9ab4', 'font-size': '14px', 'line-height': '1.6' },
                    },
                  ],
                },
                {
                  type: 'card',
                  style: {
                    padding: '24px',
                    background: '#171722',
                    border: '1px solid rgba(255,255,255,0.08)',
                    'border-radius': '14px',
                  },
                  children: [
                    { type: 'heading', content: 'Portable', props: { level: 'h3' }, style: { 'font-size': '18px' } },
                    {
                      type: 'paragraph',
                      content: 'The ZIP runs on any static host.',
                      style: { color: '#9a9ab4', 'font-size': '14px', 'line-height': '1.6' },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'Pricing',
      path: '/pricing',
      title: 'Pricing',
      description: 'Mock pricing page.',
      elements: [
        {
          type: 'section',
          style: { padding: '96px 48px', background: '#0b0b12', color: '#f4f4fb', 'text-align': 'center' },
          children: [
            {
              type: 'heading',
              content: 'Pricing that streams with you',
              props: { level: 'h1' },
              style: { 'font-size': '48px', 'letter-spacing': '-0.03em' },
            },
            {
              type: 'paragraph',
              content: 'A second page generated in the same response.',
              style: { color: '#9a9ab4', 'font-size': '17px', 'margin-top': '16px' },
            },
          ],
        },
      ],
    },
  ],
};

const payload = JSON.stringify(document);

function jsonAfter(text, marker, searchFrom = 0) {
  const markerAt = text.indexOf(marker, searchFrom);
  if (markerAt === -1) return null;
  const start = text.indexOf('{', markerAt + marker.length);
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{' || ch === '[') depth++;
    else if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function flattenElements(list, out = []) {
  for (const element of Array.isArray(list) ? list : []) {
    if (!element || typeof element !== 'object') continue;
    out.push(element);
    flattenElements(element.children, out);
  }
  return out;
}

function editOpsFor(text) {
  const site = jsonAfter(text, 'CURRENT WEBSITE:');
  const pages = Array.isArray(site?.pages) ? site.pages : [];
  const page = pages[0];
  const pageId = page?.id;
  const elements = flattenElements(page?.elements);
  const selected = jsonAfter(text, 'SELECTED ELEMENT (full JSON):');
  const heading = elements.find((el) => el.type === 'heading') || elements.find((el) => el.id);
  const targetId = selected?.id || heading?.id;
  const requestAt = text.lastIndexOf('REQUEST:');
  const request = (requestAt === -1 ? text : text.slice(requestAt + 'REQUEST:'.length)).toLowerCase();
  const wantsNewPage = /\b(add|create|new|make)\b[^.]*\bpage\b/.test(request);
  const wantsVideo = /\b(video|youtube|vimeo)\b/.test(request);
  const wantsForm = /\b(form|contact|gmail|mail|email)\b/.test(request);

  if (wantsNewPage) {
    return [
      {
        op: 'createPage',
        page: {
          name: 'Services',
          path: '/services',
          title: 'Services',
          description: 'Services added by the mock assistant.',
          elements: [
            {
              type: 'section',
              style: { padding: '88px 48px', background: '#0b0b12', color: '#f4f4fb' },
              children: [
                {
                  type: 'heading',
                  content: 'Services built in a follow-up',
                  props: { level: 'h1' },
                  style: { 'font-size': '46px', 'letter-spacing': '-0.03em' },
                },
                {
                  type: 'paragraph',
                  content: 'This page targets the real project from the previous chat turn.',
                  style: { color: '#9a9ab4', 'font-size': '16px', 'line-height': '1.7' },
                },
                { type: 'form', props: { formName: 'Project enquiry', successMessage: 'Thanks, we will reply soon.' } },
              ],
            },
          ],
        },
      },
    ];
  }

  if (wantsVideo) {
    return [
      {
        op: 'createElement',
        pageId,
        parentId: null,
        element: {
          type: 'section',
          style: { padding: '72px 48px', background: '#0b0b12', color: '#f4f4fb' },
          children: [
            {
              type: 'heading',
              content: 'Watch the overview',
              props: { level: 'h2' },
              style: { 'font-size': '30px', 'letter-spacing': '-0.02em' },
            },
            {
              type: 'video',
              props: { src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', controls: 'true' },
              style: { width: '100%', 'max-width': '860px', 'margin-top': '20px', 'border-radius': '14px' },
            },
          ],
        },
      },
    ];
  }

  if (wantsForm) {
    return [
      {
        op: 'createElement',
        pageId,
        parentId: null,
        element: {
          type: 'section',
          style: { padding: '72px 48px', background: '#111119', color: '#f4f4fb' },
          children: [
            {
              type: 'heading',
              content: 'Tell us about the project',
              props: { level: 'h2' },
              style: { 'font-size': '30px' },
            },
            { type: 'form', props: { formName: 'Contact', emailTo: 'hello@example.com' } },
            {
              type: 'mail',
              content: 'Email us in Gmail',
              props: { to: 'hello@example.com', subject: 'Project enquiry', provider: 'gmail' },
              style: { 'margin-top': '16px' },
            },
          ],
        },
      },
    ];
  }

  if (!targetId) {
    return [
      {
        op: 'createElement',
        pageId,
        parentId: null,
        element: {
          type: 'section',
          style: { padding: '56px 48px', background: '#171722', color: '#ffffff' },
          children: [{ type: 'heading', content: 'A section added by the mock assistant', props: { level: 'h2' } }],
        },
      },
    ];
  }

  const ops = [
    {
      op: 'updateContent',
      elementId: targetId,
      content: `Updated in follow-up #${(site?.pages?.length || 1)} by the mock assistant`,
    },
    {
      op: 'updateStyle',
      elementId: targetId,
      style: { color: '#b9a8ff', 'letter-spacing': '-0.02em' },
    },
  ];
  return ops;
}


function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
}

const server = http.createServer((req, res) => {
  cors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, chars: payload.length }));
    return;
  }

  if (req.method === 'GET' && req.url === '/v1/models') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ object: 'list', data: [{ id: 'mock-chat', object: 'model' }] }));
    return;
  }

  if (req.method === 'POST' && req.url === '/v1/chat/completions') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      let parsed = {};
      try {
        parsed = JSON.parse(body || '{}');
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Invalid JSON body' } }));
        return;
      }

      const wantsStream = !!parsed.stream;
      const allText = (parsed.messages || []).map((m) => String(m.content || '')).join('\n');
      const isEditRequest =
        allText.includes("You are Webora's website editor") || allText.includes('"ops": [ Operation ]');
      let content = payload;
      if (isEditRequest) {
        content = JSON.stringify({ ops: editOpsFor(allText) });
      }
      console.log(
        `[mock-ai] ${wantsStream ? 'stream' : 'json'} ${isEditRequest ? 'edit-ops' : 'document'} model=${
          parsed.model || '?'
        } messages=${parsed.messages?.length || 0}`
      );

      if (!wantsStream) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            id: 'chatcmpl-mock',
            object: 'chat.completion',
            model: parsed.model || 'mock-chat',
            choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 100, completion_tokens: 1000, total_tokens: 1100 },
          })
        );
        return;
      }

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      const chunkSize = 160;
      let index = 0;
      const send = () => {
        if (index >= content.length) {
          res.write('data: [DONE]\n\n');
          res.end();
          return;
        }
        const slice = content.slice(index, index + chunkSize);
        index += chunkSize;
        res.write(
          `data: ${JSON.stringify({
            id: 'chatcmpl-mock',
            object: 'chat.completion.chunk',
            model: parsed.model || 'mock-chat',
            choices: [{ index: 0, delta: { content: slice }, finish_reason: null }],
          })}\n\n`
        );
        setTimeout(send, 70);
      };
      send();
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[mock-ai] listening on http://127.0.0.1:${PORT} (${payload.length} chars)`);
});
