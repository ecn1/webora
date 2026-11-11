import type { ElementType, Project, TemplateMeta, WebElement } from '../types';
import { createElement, createPage, createProject } from './docEngine';

type Style = Record<string, string>;

function el(
  type: ElementType,
  content = '',
  style: Style = {},
  props: Record<string, string> = {},
  children: WebElement[] = []
): WebElement {
  const e = createElement(type);
  e.content = content;
  e.style = { ...e.style, ...style };
  e.props = { ...e.props, ...props };
  if (children.length) e.children = children;
  return e;
}

function mobile(e: WebElement, style: Style): WebElement {
  e.responsive.mobile = { ...e.responsive.mobile, ...style };
  e.responsive.tablet = { ...e.responsive.tablet, ...style };
  return e;
}

interface Palette {
  bg: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  heroBg: string;
}

function navbar(p: Palette, brand: string, links: string[], cta: string): WebElement {
  const linkEls = links.map((l) =>
    el('link', l, { color: p.muted, 'text-decoration': 'none', 'font-size': '14px', 'font-weight': '500' }, { href: '#' })
  );
  return el(
    'navbar',
    '',
    { background: p.bg, 'border-bottom': `1px solid ${p.border}`, padding: '18px 40px' },
    {},
    [
      el('text', brand, { 'font-size': '20px', 'font-weight': '800', color: p.text, 'letter-spacing': '-0.02em' }),
      el('flex', '', { display: 'flex', gap: '28px', 'align-items': 'center', 'justify-content': 'center' }, {}, linkEls),
      el('button', cta, { background: p.accent, color: p.accentText, padding: '10px 18px', 'border-radius': '10px', 'font-size': '14px' }, { href: '#' }),
    ]
  );
}

function footer(p: Palette, brand: string, tagline: string): WebElement {
  return el(
    'footer',
    '',
    { padding: '56px 40px', 'border-top': `1px solid ${p.border}`, background: p.bg, 'text-align': 'center' },
    {},
    [
      el('text', brand, { 'display': 'block', 'font-size': '18px', 'font-weight': '800', color: p.text, 'margin-bottom': '8px' }),
      el('paragraph', tagline, { color: p.muted, 'font-size': '14px', margin: '0 0 8px' }),
      el('paragraph', '© 2026 ' + brand + '. All rights reserved.', { color: p.muted, 'font-size': '12px', margin: '0' }),
    ]
  );
}

function heroCentered(p: Palette, kicker: string, title: string, sub: string, primary: string, secondary?: string): WebElement {
  const buttons = [el('button', primary, { background: p.accent, color: p.accentText, padding: '14px 26px' }, { href: '#' })];
  if (secondary) {
    buttons.push(
      el('button', secondary, { background: 'transparent', color: p.text, border: `1px solid ${p.border}`, padding: '14px 26px' }, { href: '#' })
    );
  }
  return el(
    'section',
    '',
    { padding: '110px 32px 90px', background: p.heroBg, 'text-align': 'center', position: 'relative' },
    {},
    [
      el('container', '', { 'max-width': '880px', margin: '0 auto' }, {}, [
        el('text', kicker, {
          display: 'inline-block',
          color: p.accent,
          'font-size': '12px',
          'font-weight': '700',
          'letter-spacing': '0.14em',
          'text-transform': 'uppercase',
          border: `1px solid ${p.accent}33`,
          background: `${p.accent}14`,
          padding: '6px 14px',
          'border-radius': '999px',
          'margin-bottom': '24px',
        }),
        mobile(
          el('heading', title, { 'font-size': '68px', 'line-height': '1.02', color: p.text, margin: '0 0 22px', 'letter-spacing': '-0.03em' }, { level: 'h1' }),
          { 'font-size': '38px' }
        ),
        el('paragraph', sub, { 'font-size': '18px', color: p.muted, 'line-height': '1.7', 'max-width': '620px', margin: '0 auto 32px' }),
        el('flex', '', { display: 'flex', gap: '12px', 'justify-content': 'center', 'flex-wrap': 'wrap' }, {}, buttons),
      ]),
    ]
  );
}

function featureGrid(p: Palette, title: string, sub: string, items: Array<{ icon: string; title: string; desc: string }>): WebElement {
  return el('section', '', { padding: '88px 32px', background: p.surface === p.bg ? '#0c0c15' : p.surface }, {}, [
    el('container', '', { 'max-width': '1120px', margin: '0 auto' }, {}, [
      el('heading', title, { 'font-size': '38px', color: p.text, margin: '0 0 12px', 'text-align': 'center' }, { level: 'h2' }),
      el('paragraph', sub, { color: p.muted, 'text-align': 'center', 'max-width': '560px', margin: '0 auto 48px' }),
      el(
        'grid',
        '',
        { display: 'grid', 'grid-template-columns': 'repeat(3, 1fr)', gap: '20px' },
        {},
        items.map((it) =>
          el('card', '', { background: p.bg, border: `1px solid ${p.border}`, 'border-radius': '18px', padding: '28px' }, {}, [
            el('icon', '', { color: p.accent, 'font-size': '26px', 'margin-bottom': '18px', display: 'inline-flex' }, { glyph: it.icon }),
            el('heading', it.title, { 'font-size': '19px', color: p.text, margin: '0 0 8px' }, { level: 'h3' }),
            el('paragraph', it.desc, { color: p.muted, 'font-size': '14px', 'line-height': '1.7', margin: '0' }),
          ])
        )
      ),
    ]),
  ]);
}

function ctaBand(p: Palette, title: string, sub: string, button: string): WebElement {
  return el(
    'section',
    '',
    {
      padding: '80px 32px',
      background: `linear-gradient(120deg, ${p.accent}22, transparent 60%)`,
      'border-top': `1px solid ${p.border}`,
      'border-bottom': `1px solid ${p.border}`,
      'text-align': 'center',
    },
    {},
    [
      el('container', '', { 'max-width': '720px', margin: '0 auto' }, {}, [
        el('heading', title, { 'font-size': '36px', color: p.text, margin: '0 0 12px' }, { level: 'h2' }),
        el('paragraph', sub, { color: p.muted, 'margin': '0 0 26px' }),
        el('button', button, { background: p.accent, color: p.accentText, padding: '14px 28px' }, { href: '#' }),
      ]),
    ]
  );
}

export const TEMPLATES: TemplateMeta[] = [
  {
    id: 'gaming',
    name: 'Gaming Portal',
    category: 'Gaming',
    description: 'Neon arena landing page with game cards and season CTA.',
    gradient: 'linear-gradient(135deg,#2b1b6b 0%,#7c5cff 55%,#22d3ee 120%)',
    build: buildGaming,
  },
  {
    id: 'business',
    name: 'Business Pro',
    category: 'Business',
    description: 'Clean corporate site with services, stats and about page.',
    gradient: 'linear-gradient(135deg,#0b2a4a 0%,#2563eb 70%,#38bdf8 120%)',
    build: buildBusiness,
  },
  {
    id: 'portfolio',
    name: 'Portfolio Dark',
    category: 'Portfolio',
    description: 'Personal portfolio with selected work grid and contact CTA.',
    gradient: 'linear-gradient(135deg,#111018 0%,#3b2f63 60%,#f472b6 130%)',
    build: buildPortfolio,
  },
  {
    id: 'saas',
    name: 'SaaS Landing',
    category: 'SaaS',
    description: 'Conversion-focused SaaS page with pricing and FAQ.',
    gradient: 'linear-gradient(135deg,#1a1040 0%,#7c3aed 60%,#c084fc 120%)',
    build: buildSaas,
  },
  {
    id: 'agency',
    name: 'Creative Agency',
    category: 'Agency',
    description: 'Bold typography agency site with services and work gallery.',
    gradient: 'linear-gradient(135deg,#2b0f0a 0%,#e3502f 65%,#fbbf24 120%)',
    build: buildAgency,
  },
  {
    id: 'tech',
    name: 'Tech Innovation',
    category: 'Technology',
    description: 'Modern product site with feature grid and metrics.',
    gradient: 'linear-gradient(135deg,#062b33 0%,#0891b2 65%,#22d3ee 120%)',
    build: buildTech,
  },
  {
    id: 'blog',
    name: 'Personal Blog',
    category: 'Blog',
    description: 'Minimal writing site with articles and newsletter form.',
    gradient: 'linear-gradient(135deg,#1c1710 0%,#b45309 65%,#fcd34d 120%)',
    build: buildBlog,
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce',
    category: 'E-commerce',
    description: 'Storefront with product grid, categories and benefits.',
    gradient: 'linear-gradient(135deg,#0f172a 0%,#334155 60%,#94a3b8 120%)',
    build: buildEcommerce,
  },
];

function baseProject(name: string, category: string): Project {
  const project = createProject(name);
  project.settings.seoDescription = `${name} — built with Webora.`;
  return project;
}

/* ------------------------------- GAMING ------------------------------- */

function buildGaming(): Project {
  const p: Palette = {
    bg: '#0a0a12',
    surface: '#0d0d18',
    border: '#22223a',
    text: '#f2f2fb',
    muted: '#9b9bb4',
    accent: '#7c5cff',
    accentText: '#ffffff',
    heroBg: 'radial-gradient(120% 100% at 50% 0%, #1b1440 0%, #0a0a12 65%)',
  };
  const project = baseProject('Nexus Gaming Portal', 'Gaming');
  const games = [
    { title: 'Neon Drift', desc: 'High-speed cyber racing across rain-soaked megacities.' },
    { title: 'Void Raiders', desc: 'Squad-based extraction shooter set in abandoned orbitals.' },
    { title: 'Pixel Kingdoms', desc: 'Build, trade and conquer in a persistent pixel world.' },
  ];
  const elements: WebElement[] = [
    navbar(p, 'NEXUS', ['Home', 'Games', 'Leaderboard', 'Community'], 'Play free'),
    el(
      'section',
      '',
      { padding: '120px 32px 100px', background: p.heroBg, 'text-align': 'center', 'border-bottom': `1px solid ${p.border}` },
      {},
      [
        el('container', '', { 'max-width': '900px', margin: '0 auto' }, {}, [
          el('text', 'SEASON 04 — LIVE NOW', {
            display: 'inline-block',
            color: '#22d3ee',
            'font-size': '12px',
            'font-weight': '700',
            'letter-spacing': '0.18em',
            border: '1px solid #22d3ee44',
            background: '#22d3ee12',
            padding: '6px 16px',
            'border-radius': '999px',
            'margin-bottom': '26px',
          }),
          mobile(
            el('heading', 'ENTER THE ARENA', {
              'font-size': '82px',
              'line-height': '0.98',
              color: '#ffffff',
              margin: '0 0 20px',
              'letter-spacing': '-0.03em',
              'text-shadow': '0 0 60px rgba(124,92,255,.55)',
            }, { level: 'h1' }),
            { 'font-size': '44px' }
          ),
          el('paragraph', 'Compete in ranked arenas, unlock mythic skins and squad up with players from around the world. Your next run starts now.', {
            'font-size': '18px',
            color: '#b3b3c9',
            'line-height': '1.7',
            'max-width': '600px',
            margin: '0 auto 36px',
          }),
          el('flex', '', { display: 'flex', gap: '12px', 'justify-content': 'center', 'flex-wrap': 'wrap' }, {}, [
            el('button', 'Start playing', { background: 'linear-gradient(90deg,#7c5cff,#22d3ee)', color: '#07070c', padding: '15px 30px', 'font-weight': '700' }, { href: '#' }),
            el('button', 'Watch trailer', { background: 'transparent', color: '#ffffff', border: '1px solid #34345a', padding: '15px 30px' }, { href: '#' }),
          ]),
        ]),
      ]
    ),
    el('section', '', { padding: '36px 32px', background: '#0b0b16', 'border-bottom': `1px solid ${p.border}` }, {}, [
      el('container', '', { 'max-width': '900px', margin: '0 auto' }, {}, [
        el('flex', '', { display: 'flex', gap: '24px', 'justify-content': 'space-around', 'flex-wrap': 'wrap' }, {}, [
          el('text', '128K active players', { color: '#d6d6e8', 'font-size': '14px', 'font-weight': '600' }),
          el('text', '2.4M matches / week', { color: '#d6d6e8', 'font-size': '14px', 'font-weight': '600' }),
          el('text', '4.8★ player rating', { color: '#d6d6e8', 'font-size': '14px', 'font-weight': '600' }),
        ]),
      ]),
    ]),
    el('section', '', { padding: '90px 32px' }, {}, [
      el('container', '', { 'max-width': '1120px', margin: '0 auto' }, {}, [
        el('heading', 'Featured games', { 'font-size': '40px', color: p.text, margin: '0 0 10px' }, { level: 'h2' }),
        el('paragraph', 'Three worlds. One account. Zero loading screens.', { color: p.muted, margin: '0 0 44px' }),
        el(
          'grid',
          '',
          { display: 'grid', 'grid-template-columns': 'repeat(3, 1fr)', gap: '20px' },
          {},
          games.map((g, i) =>
            el('card', '', { background: '#0d0d1a', border: `1px solid ${p.border}`, 'border-radius': '18px', padding: '0', overflow: 'hidden' }, {}, [
              el('image', '', { width: '100%', height: '190px', 'object-fit': 'cover', 'border-radius': '0', border: 'none' }, { src: '', alt: g.title }),
              el('container', '', { padding: '22px' }, {}, [
                el('text', ['ARCADE', 'SHOOTER', 'STRATEGY'][i], { color: '#22d3ee', 'font-size': '11px', 'letter-spacing': '0.14em', 'font-weight': '700' }),
                el('heading', g.title, { 'font-size': '22px', color: p.text, margin: '8px 0 8px' }, { level: 'h3' }),
                el('paragraph', g.desc, { color: p.muted, 'font-size': '14px', 'line-height': '1.65', margin: '0 0 16px' }),
                el('link', 'View game →', { color: p.accent, 'text-decoration': 'none', 'font-weight': '600', 'font-size': '14px' }, { href: '#' }),
              ]),
            ])
          )
        ),
      ]),
    ]),
    featureGrid(p, 'Built for play', 'Everything you need to drop in and compete.', [
      { icon: 'zap', title: 'Ranked seasons', desc: 'Climb divisions every season with transparent MMR and placement matches.' },
      { icon: 'star', title: 'Mythic loot', desc: 'Earn exclusive skins, emotes and weapon wraps through ranked rewards.' },
      { icon: 'layout', title: 'Cross-play', desc: 'One account across PC, console and cloud. Progress follows you everywhere.' },
    ]),
    ctaBand(p, 'Ready to drop in?', 'Create a free account and jump into your first arena in under a minute.', 'Create free account'),
    footer(p, 'NEXUS', 'Competitive worlds, built for everyone.'),
  ];
  project.pages[0].elements = elements;
  project.pages[0].title = 'Nexus — Enter the Arena';
  return project;
}

/* ------------------------------ BUSINESS ------------------------------ */

function buildBusiness(): Project {
  const p: Palette = {
    bg: '#0a1020',
    surface: '#0d1528',
    border: '#1c2a44',
    text: '#f0f5ff',
    muted: '#93a4c3',
    accent: '#3b82f6',
    accentText: '#ffffff',
    heroBg: 'radial-gradient(110% 100% at 20% 0%, #10264a 0%, #0a1020 60%)',
  };
  const project = baseProject('Northwind Business', 'Business');
  const services = [
    { title: 'Strategy', desc: 'Market analysis, positioning and growth roadmaps that actually ship.' },
    { title: 'Operations', desc: 'Streamline workflows and build systems your team can rely on.' },
    { title: 'Advisory', desc: 'Hands-on guidance from operators who have scaled before.' },
  ];
  const elements: WebElement[] = [
    navbar(p, 'Northwind', ['Services', 'About', 'Insights', 'Contact'], 'Get in touch'),
    el('section', '', { padding: '100px 32px', background: p.heroBg, 'border-bottom': `1px solid ${p.border}` }, {}, [
      el('container', '', { 'max-width': '1120px', margin: '0 auto' }, {}, [
        el('columns', '', { display: 'flex', gap: '56px', 'align-items': 'center', 'flex-wrap': 'wrap' }, {}, [
          el('container', '', { 'flex': '1 1 480px' }, {}, [
            el('text', 'CONSULTING, REIMAGINED', {
              display: 'inline-block',
              color: '#60a5fa',
              'font-size': '12px',
              'font-weight': '700',
              'letter-spacing': '0.16em',
              'border': '1px solid #60a5fa44',
              background: '#60a5fa10',
              padding: '6px 14px',
              'border-radius': '999px',
              'margin-bottom': '24px',
            }),
            mobile(
              el('heading', 'Clear thinking for ambitious teams.', { 'font-size': '58px', 'line-height': '1.05', color: p.text, margin: '0 0 20px', 'letter-spacing': '-0.03em' }, { level: 'h1' }),
              { 'font-size': '36px' }
            ),
            el('paragraph', 'We help founders and operators turn messy problems into simple plans. No decks that gather dust — just work that moves the number.', {
              'font-size': '17px',
              color: p.muted,
              'line-height': '1.75',
              'max-width': '480px',
              margin: '0 0 30px',
            }),
            el('flex', '', { display: 'flex', gap: '12px', 'flex-wrap': 'wrap' }, {}, [
              el('button', 'Book a call', { background: p.accent, color: p.accentText, padding: '13px 26px' }, { href: '#' }),
              el('button', 'See our work', { background: 'transparent', color: p.text, border: `1px solid ${p.border}`, padding: '13px 26px' }, { href: '#' }),
            ]),
          ]),
          el('card', '', { 'flex': '1 1 380px', background: '#0e1729', border: `1px solid ${p.border}`, 'border-radius': '20px', padding: '32px' }, {}, [
            el('text', 'RESULTS SNAPSHOT', { color: p.muted, 'font-size': '11px', 'letter-spacing': '0.14em', 'font-weight': '700' }),
            el('flex', '', { display: 'flex', gap: '28px', 'margin-top': '22px', 'flex-wrap': 'wrap' }, {}, [
              el('container', '', { flex: '1' }, {}, [
                el('heading', '38%', { 'font-size': '40px', color: p.text, margin: '0 0 4px' }, { level: 'h3' }),
                el('text', 'avg. revenue lift', { color: p.muted, 'font-size': '13px' }),
              ]),
              el('container', '', { flex: '1' }, {}, [
                el('heading', '12 wks', { 'font-size': '40px', color: p.text, margin: '0 0 4px' }, { level: 'h3' }),
                el('text', 'to first results', { color: p.muted, 'font-size': '13px' }),
              ]),
            ]),
            el('divider', '', { 'border-top': `1px solid ${p.border}`, margin: '28px 0' }),
            el('paragraph', '“They cut through six months of debate in two workshops. We shipped the new pricing in a quarter.”', {
              color: '#c7d6ef',
              'font-size': '14px',
              'line-height': '1.7',
              margin: '0 0 10px',
            }),
            el('text', '— Maya R., COO at Fieldline', { color: p.muted, 'font-size': '13px' }),
          ]),
        ]),
      ]),
    ]),
    el('section', '', { padding: '40px 32px', 'border-bottom': `1px solid ${p.border}` }, {}, [
      el('container', '', { 'max-width': '1000px', margin: '0 auto' }, {}, [
        el('flex', '', { display: 'flex', gap: '40px', 'justify-content': 'space-around', 'flex-wrap': 'wrap', opacity: '0.7' }, {}, [
          el('text', 'FIELDWORK', { color: p.muted, 'font-size': '14px', 'font-weight': '700', 'letter-spacing': '0.1em' }),
          el('text', 'LUMEN', { color: p.muted, 'font-size': '14px', 'font-weight': '700', 'letter-spacing': '0.1em' }),
          el('text', 'ORCHARD', { color: p.muted, 'font-size': '14px', 'font-weight': '700', 'letter-spacing': '0.1em' }),
          el('text', 'NORTHBEAM', { color: p.muted, 'font-size': '14px', 'font-weight': '700', 'letter-spacing': '0.1em' }),
        ]),
      ]),
    ]),
    el('section', '', { padding: '88px 32px' }, {}, [
      el('container', '', { 'max-width': '1120px', margin: '0 auto' }, {}, [
        el('heading', 'How we help', { 'font-size': '38px', color: p.text, margin: '0 0 10px' }, { level: 'h2' }),
        el('paragraph', 'Three ways to work together, depending on where you are.', { color: p.muted, margin: '0 0 44px' }),
        el(
          'grid',
          '',
          { display: 'grid', 'grid-template-columns': 'repeat(3, 1fr)', gap: '20px' },
          {},
          services.map((s, i) =>
            el('card', '', { background: p.surface, border: `1px solid ${p.border}`, 'border-radius': '18px', padding: '28px' }, {}, [
              el('text', `0${i + 1}`, { color: p.accent, 'font-size': '13px', 'font-weight': '700', 'letter-spacing': '0.1em' }),
              el('heading', s.title, { 'font-size': '22px', color: p.text, margin: '14px 0 8px' }, { level: 'h3' }),
              el('paragraph', s.desc, { color: p.muted, 'font-size': '14px', 'line-height': '1.7', margin: '0' }),
            ])
          )
        ),
      ]),
    ]),
    ctaBand(p, 'Ready for a clearer plan?', 'Tell us what you are working on. We will reply within two business days.', 'Start a conversation'),
    footer(p, 'Northwind', 'Clarity for teams who ship.'),
  ];

  project.pages[0].elements = elements;
  project.pages[0].title = 'Northwind — Consulting';

  const about = createPage('About', '/about');
  about.elements = [
    navbar(p, 'Northwind', ['Services', 'About', 'Insights', 'Contact'], 'Get in touch'),
    el('section', '', { padding: '90px 32px', background: p.heroBg }, {}, [
      el('container', '', { 'max-width': '800px', margin: '0 auto' }, {}, [
        el('heading', 'We are a small team with a simple belief.', { 'font-size': '46px', color: p.text, margin: '0 0 20px' }, { level: 'h1' }),
        el('paragraph', 'Good strategy is not a document. It is a decision you can explain to your team on one page — and act on Monday morning.', {
          color: p.muted,
          'font-size': '17px',
          'line-height': '1.8',
        }),
      ]),
    ]),
    featureGrid(p, 'What we value', 'The principles behind every engagement.', [
      { icon: 'check', title: 'Plain language', desc: 'If a plan needs a glossary, it is not finished yet.' },
      { icon: 'zap', title: 'Momentum', desc: 'We optimize for decisions made, not pages written.' },
      { icon: 'star', title: 'Skin in the game', desc: 'We stay involved until the work is actually working.' },
    ]),
    ctaBand(p, 'Work with us', 'We take on a small number of engagements each quarter.', 'Get in touch'),
    footer(p, 'Northwind', 'Clarity for teams who ship.'),
  ];
  project.pages.push(about);
  return project;
}

/* ------------------------------ PORTFOLIO ------------------------------ */

function buildPortfolio(): Project {
  const p: Palette = {
    bg: '#0a0a10',
    surface: '#101018',
    border: '#232331',
    text: '#f2f0f7',
    muted: '#9c98ab',
    accent: '#f472b6',
    accentText: '#16070f',
    heroBg: 'radial-gradient(90% 100% at 80% 0%, #211a2e 0%, #0a0a10 60%)',
  };
  const project = baseProject('Ava Chen Portfolio', 'Portfolio');
  const works = [
    { title: 'Lumen Finance', tag: 'Product design' },
    { title: 'Atlas Travel', tag: 'Brand + site' },
    { title: 'Orbit Notes', tag: 'Design system' },
    { title: 'Field Journal', tag: 'Editorial' },
  ];
  project.pages[0].elements = [
    navbar(p, 'Ava Chen', ['Work', 'About', 'Contact'], "Let's talk"),
    el('section', '', { padding: '110px 32px 90px', background: p.heroBg }, {}, [
      el('container', '', { 'max-width': '1120px', margin: '0 auto' }, {}, [
        el('text', 'DESIGNER & FRONT-END DEVELOPER', { color: p.accent, 'font-size': '12px', 'font-weight': '700', 'letter-spacing': '0.16em', 'margin-bottom': '22px', display: 'block' }),
        mobile(
          el('heading', 'Designing digital products with clarity and character.', {
            'font-size': '64px',
            'line-height': '1.04',
            color: p.text,
            margin: '0 0 24px',
            'letter-spacing': '-0.03em',
            'max-width': '900px',
          }, { level: 'h1' }),
          { 'font-size': '38px' }
        ),
        el('paragraph', 'I help early-stage teams turn complicated ideas into interfaces people actually understand. Ten years across product, brand and code.', {
          'font-size': '18px',
          color: p.muted,
          'line-height': '1.75',
          'max-width': '560px',
          margin: '0 0 30px',
        }),
        el('flex', '', { display: 'flex', gap: '22px', 'align-items': 'center', 'flex-wrap': 'wrap' }, {}, [
          el('button', 'View selected work', { background: p.accent, color: p.accentText, padding: '13px 26px' }, { href: '#work' }),
          el('link', 'Download CV', { color: p.text, 'text-decoration': 'underline', 'font-size': '15px' }, { href: '#' }),
        ]),
      ]),
    ]),
    el('section', '', { padding: '80px 32px', id: 'work' }, {}, [
      el('container', '', { 'max-width': '1120px', margin: '0 auto' }, {}, [
        el('flex', '', { display: 'flex', 'justify-content': 'space-between', 'align-items': 'baseline', 'margin-bottom': '36px', 'flex-wrap': 'wrap', gap: '12px' }, {}, [
          el('heading', 'Selected work', { 'font-size': '38px', color: p.text, margin: '0' }, { level: 'h2' }),
          el('text', '2021 — 2026', { color: p.muted, 'font-size': '13px' }),
        ]),
        el(
          'grid',
          '',
          { display: 'grid', 'grid-template-columns': 'repeat(2, 1fr)', gap: '20px' },
          {},
          works.map((w, i) =>
            el('card', '', { background: p.surface, border: `1px solid ${p.border}`, 'border-radius': '18px', padding: '0', overflow: 'hidden' }, {}, [
              el('image', '', { width: '100%', height: '260px', 'object-fit': 'cover', 'border-radius': '0' }, { src: '', alt: w.title }),
              el('container', '', { padding: '20px 22px' }, {}, [
                el('flex', '', { display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', gap: '10px' }, {}, [
                  el('heading', w.title, { 'font-size': '20px', color: p.text, margin: '0' }, { level: 'h3' }),
                  el('text', w.tag, { color: p.muted, 'font-size': '12px' }),
                ]),
              ]),
            ])
          )
        ),
      ]),
    ]),
    el('section', '', { padding: '80px 32px', background: p.surface, 'border-top': `1px solid ${p.border}`, 'border-bottom': `1px solid ${p.border}` }, {}, [
      el('container', '', { 'max-width': '1120px', margin: '0 auto' }, {}, [
        el('columns', '', { display: 'flex', gap: '64px', 'flex-wrap': 'wrap' }, {}, [
          el('container', '', { 'flex': '1 1 260px' }, {}, [
            el('text', 'ABOUT', { color: p.muted, 'font-size': '11px', 'letter-spacing': '0.16em', 'font-weight': '700', 'margin-bottom': '14px', display: 'block' }),
            el('heading', 'A designer who codes.', { 'font-size': '30px', color: p.text, margin: '0 0 14px' }, { level: 'h3' }),
          ]),
          el('container', '', { 'flex': '2 1 520px' }, {}, [
            el('paragraph', 'I started as a front-end developer, moved into product design, and never lost the habit of building what I draw. These days I work with founders on the messy zero-to-one problems: positioning, first interfaces, and the systems underneath them.', {
              color: p.muted,
              'font-size': '16px',
              'line-height': '1.8',
              margin: '0 0 16px',
            }),
            el('paragraph', 'Previously at Studio Nine, Fieldwork and two startups you have probably never heard of. Currently taking on one project per quarter.', {
              color: p.muted,
              'font-size': '16px',
              'line-height': '1.8',
              margin: '0',
            }),
          ]),
        ]),
      ]),
    ]),
    ctaBand(p, 'Have something in mind?', 'I take on one new project per quarter. Tell me what you are building.', 'Start a conversation'),
    footer(p, 'Ava Chen', 'Product design and front-end development.'),
  ];
  project.pages[0].title = 'Ava Chen — Designer';
  return project;
}

/* -------------------------------- SAAS -------------------------------- */

function buildSaas(): Project {
  const p: Palette = {
    bg: '#0a0812',
    surface: '#0f0c1a',
    border: '#241d3a',
    text: '#f5f2ff',
    muted: '#a79cc4',
    accent: '#8b5cf6',
    accentText: '#ffffff',
    heroBg: 'radial-gradient(90% 90% at 50% 0%, #2a1655 0%, #0a0812 65%)',
  };
  const project = baseProject('Orbit SaaS Landing', 'SaaS');
  const features = [
    { icon: 'zap', title: 'Instant sync', desc: 'Changes appear across every device before you lift your finger.' },
    { icon: 'layout', title: 'Unified workspace', desc: 'Docs, tasks and decisions in one place your team actually opens.' },
    { icon: 'check', title: 'Automations', desc: 'Turn repetitive steps into one-click flows without writing code.' },
  ];
  const plans = [
    { name: 'Starter', price: '$0', desc: 'For solo makers.', items: ['3 projects', '1 workspace', 'Community support'], highlight: false },
    { name: 'Pro', price: '$19', desc: 'For growing teams.', items: ['Unlimited projects', '5 workspaces', 'Priority support'], highlight: true },
    { name: 'Scale', price: '$49', desc: 'For companies.', items: ['SSO + audit log', 'Unlimited workspaces', 'Dedicated manager'], highlight: false },
  ];
  project.pages[0].elements = [
    navbar(p, 'Orbit', ['Features', 'Pricing', 'Docs'], 'Start free'),
    heroCentered(
      p,
      'NEW — ORBIT 2.0',
      'The workspace that thinks with your team.',
      'Plan, write and ship in one calm place. Orbit keeps everyone aligned without another status meeting.',
      'Start for free',
      'Book a demo'
    ),
    el('section', '', { padding: '0 32px 40px' }, {}, [
      el('container', '', { 'max-width': '680px', margin: '0 auto' }, {}, [
        el('flex', '', { display: 'flex', gap: '10px', 'justify-content': 'center', 'flex-wrap': 'wrap' }, {}, [
          el('input', '', { 'max-width': '320px' }, { placeholder: 'Enter your work email' }),
          el('submit', 'Get started', { background: p.accent, color: p.accentText, padding: '12px 22px' }, {}),
        ]),
        el('paragraph', 'Free for 14 days. No card required.', { color: p.muted, 'font-size': '12px', 'text-align': 'center', margin: '12px 0 0' }),
      ]),
    ]),
    featureGrid(p, 'Everything in one motion', 'Orbit removes the seams between thinking and shipping.', features),
    el('section', '', { padding: '20px 32px 80px' }, {}, [
      el('container', '', { 'max-width': '1120px', margin: '0 auto' }, {}, [
        el('flex', '', { display: 'flex', gap: '24px', 'justify-content': 'space-around', 'flex-wrap': 'wrap' }, {}, [
          el('container', '', { 'text-align': 'center' }, {}, [
            el('heading', '12k+', { 'font-size': '40px', color: p.text, margin: '0' }, { level: 'h3' }),
            el('text', 'teams onboard', { color: p.muted, 'font-size': '13px' }),
          ]),
          el('container', '', { 'text-align': 'center' }, {}, [
            el('heading', '99.98%', { 'font-size': '40px', color: p.text, margin: '0' }, { level: 'h3' }),
            el('text', 'uptime, last 12 months', { color: p.muted, 'font-size': '13px' }),
          ]),
          el('container', '', { 'text-align': 'center' }, {}, [
            el('heading', '4.9 / 5', { 'font-size': '40px', color: p.text, margin: '0' }, { level: 'h3' }),
            el('text', 'average review', { color: p.muted, 'font-size': '13px' }),
          ]),
        ]),
      ]),
    ]),
    el('section', '', { padding: '80px 32px', background: p.surface, 'border-top': `1px solid ${p.border}` }, {}, [
      el('container', '', { 'max-width': '1120px', margin: '0 auto' }, {}, [
        el('heading', 'Simple pricing', { 'font-size': '38px', color: p.text, margin: '0 0 10px', 'text-align': 'center' }, { level: 'h2' }),
        el('paragraph', 'Start free, upgrade when it pays for itself.', { color: p.muted, 'text-align': 'center', margin: '0 0 46px' }),
        el(
          'grid',
          '',
          { display: 'grid', 'grid-template-columns': 'repeat(3, 1fr)', gap: '20px', 'align-items': 'stretch' },
          {},
          plans.map((plan) =>
            el(
              'card',
              '',
              {
                background: plan.highlight ? '#151026' : p.bg,
                border: `1px solid ${plan.highlight ? p.accent : p.border}`,
                'border-radius': '20px',
                padding: '30px',
                'box-shadow': plan.highlight ? '0 0 50px -12px rgba(139,92,246,.55)' : 'none',
              },
              {},
              [
                el('text', plan.name, { color: plan.highlight ? p.accent : p.muted, 'font-size': '13px', 'font-weight': '700', 'letter-spacing': '0.1em' }),
                el('flex', '', { display: 'flex', 'align-items': 'baseline', gap: '6px', margin: '14px 0 4px' }, {}, [
                  el('heading', plan.price, { 'font-size': '46px', color: p.text, margin: '0' }, { level: 'h3' }),
                  el('text', '/ month', { color: p.muted, 'font-size': '13px' }),
                ]),
                el('paragraph', plan.desc, { color: p.muted, 'font-size': '14px', margin: '0 0 20px' }),
                ...plan.items.map((item) =>
                  el('text', '✓  ' + item, { display: 'block', color: '#d6cdf0', 'font-size': '14px', 'margin-bottom': '10px' })
                ),
                el('button', plan.highlight ? 'Start free trial' : 'Choose plan', {
                  display: 'block',
                  'text-align': 'center',
                  background: plan.highlight ? p.accent : 'transparent',
                  color: plan.highlight ? '#fff' : p.text,
                  border: plan.highlight ? 'none' : `1px solid ${p.border}`,
                  padding: '12px',
                  'margin-top': '18px',
                }, { href: '#' }),
              ]
            )
          )
        ),
      ]),
    ]),
    el('section', '', { padding: '80px 32px' }, {}, [
      el('container', '', { 'max-width': '760px', margin: '0 auto' }, {}, [
        el('heading', 'Questions, answered', { 'font-size': '34px', color: p.text, margin: '0 0 26px', 'text-align': 'center' }, { level: 'h2' }),
        el('accordion', 'Can I import from Notion?', { 'border-bottom': `1px solid ${p.border}` }, { answer: 'Yes — one-click import brings over pages, databases and permissions.' }),
        el('accordion', 'Does Orbit work offline?', { 'border-bottom': `1px solid ${p.border}` }, { answer: 'Edits are cached locally and sync when you reconnect.' }),
        el('accordion', 'Is there a free plan?', { 'border-bottom': `1px solid ${p.border}` }, { answer: 'The Starter plan is free forever for up to three projects.' }),
      ]),
    ]),
    ctaBand(p, 'Bring your team into orbit', 'Start free today. Invite your whole team in under a minute.', 'Create free workspace'),
    footer(p, 'Orbit', 'The workspace that thinks with your team.'),
  ];
  project.pages[0].title = 'Orbit — Team Workspace';
  return project;
}

/* ------------------------------- AGENCY ------------------------------- */

function buildAgency(): Project {
  const p: Palette = {
    bg: '#0d0906',
    surface: '#141008',
    border: '#2b2114',
    text: '#fdf6ea',
    muted: '#b8a894',
    accent: '#f97316',
    accentText: '#1a0b02',
    heroBg: 'radial-gradient(100% 100% at 10% 0%, #2c1505 0%, #0d0906 60%)',
  };
  const project = baseProject('Studio Mono Agency', 'Agency');
  const services = [
    { n: '01', title: 'Brand identity', desc: 'Names, marks and systems that hold up outside the pitch deck.' },
    { n: '02', title: 'Web & product', desc: 'Sites and interfaces built with the same care as the brand.' },
    { n: '03', title: 'Art direction', desc: 'Photography, motion and campaign worlds that feel like you.' },
  ];
  project.pages[0].elements = [
    navbar(p, 'Studio Mono', ['Work', 'Services', 'Process', 'Contact'], 'Start a project'),
    el('section', '', { padding: '110px 32px 90px', background: p.heroBg }, {}, [
      el('container', '', { 'max-width': '1120px', margin: '0 auto' }, {}, [
        el('columns', '', { display: 'flex', gap: '56px', 'align-items': 'flex-end', 'flex-wrap': 'wrap' }, {}, [
          el('container', '', { 'flex': '1 1 600px' }, {}, [
            el('text', 'INDEPENDENT STUDIO — EST. 2019', { color: p.accent, 'font-size': '12px', 'font-weight': '700', 'letter-spacing': '0.16em', display: 'block', 'margin-bottom': '22px' }),
            mobile(
              el('heading', 'We build brands that refuse to blend in.', {
                'font-size': '72px',
                'line-height': '0.98',
                color: p.text,
                margin: '0 0 24px',
                'letter-spacing': '-0.04em',
              }, { level: 'h1' }),
              { 'font-size': '40px' }
            ),
            el('paragraph', 'A small studio working with founders who would rather be remembered than liked by everyone.', {
              color: p.muted,
              'font-size': '18px',
              'line-height': '1.7',
              'max-width': '520px',
              margin: '0 0 30px',
            }),
            el('button', 'See the work', { background: p.accent, color: p.accentText, padding: '14px 28px', 'font-weight': '700' }, { href: '#work' }),
          ]),
          el('card', '', { 'flex': '0 1 380px', background: '#171008', border: `1px solid ${p.border}`, 'border-radius': '24px', padding: '0', overflow: 'hidden' }, {}, [
            el('image', '', { width: '100%', height: '380px', 'object-fit': 'cover', 'border-radius': '0' }, { src: '', alt: 'Studio work' }),
          ]),
        ]),
      ]),
    ]),
    el('section', '', { padding: '80px 32px', 'border-top': `1px solid ${p.border}` }, {}, [
      el('container', '', { 'max-width': '1120px', margin: '0 auto' }, {}, [
        el('heading', 'What we do', { 'font-size': '38px', color: p.text, margin: '0 0 40px' }, { level: 'h2' }),
        ...services.map((s) =>
          el('flex', '', { display: 'flex', gap: '24px', 'align-items': 'flex-start', padding: '26px 0', 'border-top': `1px solid ${p.border}`, 'flex-wrap': 'wrap' }, {}, [
            el('text', s.n, { color: p.accent, 'font-size': '14px', 'font-weight': '700', width: '48px' }),
            el('heading', s.title, { 'font-size': '26px', color: p.text, margin: '0', 'flex': '0 1 260px' }, { level: 'h3' }),
            el('paragraph', s.desc, { color: p.muted, 'font-size': '15px', 'line-height': '1.7', margin: '0', 'max-width': '460px' }),
          ])
        ),
      ]),
    ]),
    el('section', '', { padding: '80px 32px', background: p.surface, id: 'work' }, {}, [
      el('container', '', { 'max-width': '1120px', margin: '0 auto' }, {}, [
        el('heading', 'Selected work', { 'font-size': '38px', color: p.text, margin: '0 0 36px' }, { level: 'h2' }),
        el('grid', '', { display: 'grid', 'grid-template-columns': 'repeat(3, 1fr)', gap: '18px' }, {}, [
          el('image', '', { width: '100%', height: '300px', 'object-fit': 'cover', 'border-radius': '14px' }, { src: '', alt: 'Project one' }),
          el('image', '', { width: '100%', height: '300px', 'object-fit': 'cover', 'border-radius': '14px' }, { src: '', alt: 'Project two' }),
          el('image', '', { width: '100%', height: '300px', 'object-fit': 'cover', 'border-radius': '14px' }, { src: '', alt: 'Project three' }),
        ]),
      ]),
    ]),
    ctaBand(p, 'Got something stubborn?', 'We take on four projects a year. Tell us what you are trying to make unforgettable.', 'Start a project'),
    footer(p, 'Studio Mono', 'Independent brand and digital studio.'),
  ];
  project.pages[0].title = 'Studio Mono — Brand Studio';
  return project;
}

/* -------------------------------- TECH -------------------------------- */

function buildTech(): Project {
  const p: Palette = {
    bg: '#060d10',
    surface: '#0a151a',
    border: '#173038',
    text: '#eefcff',
    muted: '#8fb3bd',
    accent: '#22d3ee',
    accentText: '#04222a',
    heroBg: 'radial-gradient(100% 100% at 70% 0%, #0c3a45 0%, #060d10 60%)',
  };
  const project = baseProject('Helix Technology', 'Technology');
  project.pages[0].elements = [
    navbar(p, 'HELIX', ['Product', 'Solutions', 'Developers', 'Company'], 'Book a demo'),
    el('section', '', { padding: '100px 32px', background: p.heroBg, 'border-bottom': `1px solid ${p.border}` }, {}, [
      el('container', '', { 'max-width': '1120px', margin: '0 auto' }, {}, [
        el('columns', '', { display: 'flex', gap: '60px', 'align-items': 'center', 'flex-wrap': 'wrap' }, {}, [
          el('container', '', { 'flex': '1 1 500px' }, {}, [
            el('text', 'INFRASTRUCTURE FOR REAL-TIME TEAMS', { color: p.accent, 'font-size': '12px', 'font-weight': '700', 'letter-spacing': '0.16em', display: 'block', 'margin-bottom': '22px' }),
            mobile(
              el('heading', 'Data that moves as fast as your team.', { 'font-size': '58px', 'line-height': '1.05', color: p.text, margin: '0 0 20px', 'letter-spacing': '-0.03em' }, { level: 'h1' }),
              { 'font-size': '36px' }
            ),
            el('paragraph', 'Helix is the realtime layer for products that cannot afford to feel slow. Deploy in minutes, scale to millions.', {
              color: p.muted,
              'font-size': '17px',
              'line-height': '1.75',
              'max-width': '480px',
              margin: '0 0 30px',
            }),
            el('flex', '', { display: 'flex', gap: '12px', 'flex-wrap': 'wrap' }, {}, [
              el('button', 'Start building', { background: p.accent, color: p.accentText, padding: '13px 26px', 'font-weight': '700' }, { href: '#' }),
              el('link', 'Read the docs →', { color: p.text, 'font-size': '15px', 'align-self': 'center' }, { href: '#' }),
            ]),
          ]),
          el('card', '', { 'flex': '1 1 380px', background: '#0b1b21', border: `1px solid ${p.border}`, 'border-radius': '20px', padding: '28px' }, {}, [
            el('flex', '', { display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }, {}, [
              el('text', 'helix status', { color: p.muted, 'font-size': '12px', 'letter-spacing': '0.08em' }),
              el('text', '● all systems normal', { color: '#4ade80', 'font-size': '12px' }),
            ]),
            el('divider', '', { 'border-top': `1px solid ${p.border}`, margin: '18px 0' }),
            el('text', 'p99 latency', { color: p.muted, 'font-size': '12px' }),
            el('heading', '18 ms', { 'font-size': '42px', color: p.text, margin: '4px 0 16px' }, { level: 'h3' }),
            el('progress', '', { width: '100%', height: '10px', 'accent-color': p.accent }, { value: '82' }),
            el('paragraph', 'Median across 14 regions. No cold starts.', { color: p.muted, 'font-size': '12px', margin: '12px 0 0' }),
          ]),
        ]),
      ]),
    ]),
    featureGrid(p, 'Built for the hard parts', 'The primitives you would otherwise build yourself — done properly.', [
      { icon: 'zap', title: 'Realtime sync', desc: 'Presence, broadcast and live state with sub-20ms fanout.' },
      { icon: 'layout', title: 'Edge network', desc: '14 regions, automatic failover, zero configuration.' },
      { icon: 'code', title: 'Developer first', desc: 'Typed SDKs, local emulator and a CLI that behaves.' },
    ]),
    el('section', '', { padding: '40px 32px 90px' }, {}, [
      el('container', '', { 'max-width': '1120px', margin: '0 auto' }, {}, [
        el('grid', '', { display: 'grid', 'grid-template-columns': 'repeat(3, 1fr)', gap: '20px' }, {}, [
          el('card', '', { background: p.surface, border: `1px solid ${p.border}`, 'border-radius': '16px', padding: '26px' }, {}, [
            el('heading', '2.4B', { 'font-size': '38px', color: p.text, margin: '0 0 6px' }, { level: 'h3' }),
            el('text', 'messages delivered daily', { color: p.muted, 'font-size': '13px' }),
          ]),
          el('card', '', { background: p.surface, border: `1px solid ${p.border}`, 'border-radius': '16px', padding: '26px' }, {}, [
            el('heading', '99.99%', { 'font-size': '38px', color: p.text, margin: '0 0 6px' }, { level: 'h3' }),
            el('text', 'uptime across regions', { color: p.muted, 'font-size': '13px' }),
          ]),
          el('card', '', { background: p.surface, border: `1px solid ${p.border}`, 'border-radius': '16px', padding: '26px' }, {}, [
            el('heading', '14', { 'font-size': '38px', color: p.text, margin: '0 0 6px' }, { level: 'h3' }),
            el('text', 'edge regions', { color: p.muted, 'font-size': '13px' }),
          ]),
        ]),
      ]),
    ]),
    ctaBand(p, 'Ship your first realtime feature this week', 'Free tier includes 100k messages per month. No credit card.', 'Start building'),
    footer(p, 'Helix', 'Realtime infrastructure for teams that ship.'),
  ];
  project.pages[0].title = 'Helix — Realtime Infrastructure';
  return project;
}

/* --------------------------------- BLOG --------------------------------- */

function buildBlog(): Project {
  const p: Palette = {
    bg: '#0d0b08',
    surface: '#151209',
    border: '#2c2516',
    text: '#faf3e4',
    muted: '#b3a68c',
    accent: '#f59e0b',
    accentText: '#1a1203',
    heroBg: 'radial-gradient(90% 100% at 20% 0%, #2a2008 0%, #0d0b08 60%)',
  };
  const project = baseProject('Sam\'s Notes', 'Blog');
  const posts = [
    { date: 'NOV 02, 2026', title: 'The quiet advantage of writing things down', desc: 'Most decisions die in your head. A note is a vote for your future self.' },
    { date: 'OCT 21, 2026', title: 'Small tools, sharp thinking', desc: 'Why the best workflows are usually three files and a script.' },
    { date: 'OCT 09, 2026', title: 'On finishing things badly', desc: 'A finished rough draft beats a perfect plan that never ships.' },
  ];
  project.pages[0].elements = [
    navbar(p, "Sam's Notes", ['Writing', 'About', 'Newsletter'], 'Subscribe'),
    el('section', '', { padding: '100px 32px 70px', background: p.heroBg }, {}, [
      el('container', '', { 'max-width': '860px', margin: '0 auto' }, {}, [
        el('text', 'ESSAYS & FIELD NOTES', { color: p.accent, 'font-size': '12px', 'font-weight': '700', 'letter-spacing': '0.16em', display: 'block', 'margin-bottom': '20px' }),
        mobile(
          el('heading', 'Essays on building things.', { 'font-size': '64px', 'line-height': '1.02', color: p.text, margin: '0 0 20px', 'letter-spacing': '-0.03em' }, { level: 'h1' }),
          { 'font-size': '38px' }
        ),
        el('paragraph', 'Notes on software, craft and the small habits that compound. Written slowly, published when ready.', {
          color: p.muted,
          'font-size': '18px',
          'line-height': '1.75',
          'max-width': '560px',
          margin: '0',
        }),
      ]),
    ]),
    el('section', '', { padding: '60px 32px 80px' }, {}, [
      el('container', '', { 'max-width': '860px', margin: '0 auto' }, {}, [
        el('heading', 'Latest writing', { 'font-size': '30px', color: p.text, margin: '0 0 28px' }, { level: 'h2' }),
        ...posts.map((post) =>
          el('card', '', { background: p.surface, border: `1px solid ${p.border}`, 'border-radius': '16px', padding: '26px', 'margin-bottom': '14px' }, {}, [
            el('text', post.date, { color: p.accent, 'font-size': '11px', 'font-weight': '700', 'letter-spacing': '0.12em', display: 'block', 'margin-bottom': '10px' }),
            el('heading', post.title, { 'font-size': '24px', color: p.text, margin: '0 0 8px' }, { level: 'h3' }),
            el('paragraph', post.desc, { color: p.muted, 'font-size': '15px', 'line-height': '1.7', margin: '0 0 14px' }),
            el('link', 'Read essay →', { color: p.accent, 'text-decoration': 'none', 'font-weight': '600', 'font-size': '14px' }, { href: '#' }),
          ])
        ),
      ]),
    ]),
    el('section', '', { padding: '70px 32px', background: p.surface, 'border-top': `1px solid ${p.border}`, 'border-bottom': `1px solid ${p.border}` }, {}, [
      el('container', '', { 'max-width': '640px', margin: '0 auto' }, {}, [
        el('heading', 'One letter, most Sundays', { 'font-size': '30px', color: p.text, margin: '0 0 10px', 'text-align': 'center' }, { level: 'h2' }),
        el('paragraph', 'A short note about whatever I am building or thinking about. No tracking, no spam.', { color: p.muted, 'text-align': 'center', margin: '0 0 24px' }),
        el('flex', '', { display: 'flex', gap: '10px', 'justify-content': 'center', 'flex-wrap': 'wrap' }, {}, [
          el('input', '', { 'max-width': '300px' }, { placeholder: 'you@example.com' }),
          el('submit', 'Subscribe', { background: p.accent, color: p.accentText, padding: '12px 22px', 'font-weight': '700' }, {}),
        ]),
      ]),
    ]),
    el('section', '', { padding: '70px 32px' }, {}, [
      el('container', '', { 'max-width': '760px', margin: '0 auto' }, {}, [
        el('columns', '', { display: 'flex', gap: '40px', 'align-items': 'flex-start', 'flex-wrap': 'wrap' }, {}, [
          el('card', '', { background: p.surface, border: `1px solid ${p.border}`, 'border-radius': '16px', padding: '10px' }, {}, [
            el('image', '', { width: '120px', height: '120px', 'border-radius': '12px', 'object-fit': 'cover' }, { src: '', alt: 'Sam' }),
          ]),
          el('container', '', { flex: '1 1 380px' }, {}, [
            el('heading', 'About Sam', { 'font-size': '24px', color: p.text, margin: '0 0 10px' }, { level: 'h3' }),
            el('paragraph', 'Engineer, occasional writer, chronic note-taker. Currently building small tools for people who make things.', {
              color: p.muted,
              'font-size': '15px',
              'line-height': '1.8',
              margin: '0 0 12px',
            }),
            el('link', 'More about me →', { color: p.accent, 'text-decoration': 'none', 'font-weight': '600', 'font-size': '14px' }, { href: '#' }),
          ]),
        ]),
      ]),
    ]),
    footer(p, "Sam's Notes", 'Written slowly. Published when ready.'),
  ];
  project.pages[0].title = "Sam's Notes — Essays";
  return project;
}

/* ----------------------------- ECOMMERCE ------------------------------ */

function buildEcommerce(): Project {
  const p: Palette = {
    bg: '#0a0c10',
    surface: '#10141a',
    border: '#232b36',
    text: '#f2f6fa',
    muted: '#9aa7b5',
    accent: '#e2e8f0',
    accentText: '#0b0e13',
    heroBg: 'radial-gradient(90% 100% at 50% 0%, #1a222d 0%, #0a0c10 60%)',
  };
  const project = baseProject('Atlas Storefront', 'E-commerce');
  const products = [
    { name: 'Wool Field Jacket', price: '$180', tag: 'Outerwear' },
    { name: 'Canvas Weekender', price: '$95', tag: 'Bags' },
    { name: 'Merino Crew', price: '$70', tag: 'Knitwear' },
  ];
  project.pages[0].elements = [
    navbar(p, 'ATLAS', ['Shop', 'New in', 'Collections', 'Journal'], 'Cart (0)'),
    heroCentered(
      p,
      'FALL / WINTER 2026',
      'Objects with intent.',
      'Hard-wearing essentials made from honest materials. Designed to be used, repaired and kept.',
      'Shop the collection'
    ),
    el('section', '', { padding: '40px 32px 20px' }, {}, [
      el('container', '', { 'max-width': '1120px', margin: '0 auto' }, {}, [
        el('flex', '', { display: 'flex', 'justify-content': 'space-between', 'align-items': 'baseline', 'flex-wrap': 'wrap', gap: '12px' }, {}, [
          el('heading', 'Featured pieces', { 'font-size': '30px', color: p.text, margin: '0' }, { level: 'h2' }),
          el('link', 'View all →', { color: p.muted, 'text-decoration': 'none', 'font-size': '14px' }, { href: '#' }),
        ]),
      ]),
    ]),
    el('section', '', { padding: '24px 32px 80px' }, {}, [
      el('container', '', { 'max-width': '1120px', margin: '0 auto' }, {}, [
        el('grid', '', { display: 'grid', 'grid-template-columns': 'repeat(3, 1fr)', gap: '20px' }, {}, products.map((prod) =>
          el('card', '', { background: p.surface, border: `1px solid ${p.border}`, 'border-radius': '16px', padding: '0', overflow: 'hidden' }, {}, [
            el('image', '', { width: '100%', height: '280px', 'object-fit': 'cover', 'border-radius': '0' }, { src: '', alt: prod.name }),
            el('container', '', { padding: '20px 22px' }, {}, [
              el('text', prod.tag, { color: p.muted, 'font-size': '11px', 'letter-spacing': '0.1em', 'text-transform': 'uppercase' }),
              el('flex', '', { display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-top': '8px', gap: '10px' }, {}, [
                el('heading', prod.name, { 'font-size': '18px', color: p.text, margin: '0' }, { level: 'h3' }),
                el('text', prod.price, { color: p.text, 'font-size': '15px', 'font-weight': '700' }),
              ]),
              el('button', 'Add to cart', { display: 'block', width: '100%', 'text-align': 'center', background: 'transparent', color: p.text, border: `1px solid ${p.border}`, padding: '11px', 'margin-top': '16px', 'border-radius': '10px' }, { href: '#' }),
            ]),
          ])
        )),
      ]),
    ]),
    el('section', '', { padding: '60px 32px', background: p.surface, 'border-top': `1px solid ${p.border}`, 'border-bottom': `1px solid ${p.border}` }, {}, [
      el('container', '', { 'max-width': '1120px', margin: '0 auto' }, {}, [
        el('heading', 'Shop by category', { 'font-size': '30px', color: p.text, margin: '0 0 24px' }, { level: 'h2' }),
        el('grid', '', { display: 'grid', 'grid-template-columns': 'repeat(3, 1fr)', gap: '16px' }, {}, ['Outerwear', 'Bags', 'Knitwear'].map((c) =>
          el('card', '', { background: p.bg, border: `1px solid ${p.border}`, 'border-radius': '14px', padding: '30px', 'text-align': 'center' }, {}, [
            el('heading', c, { 'font-size': '20px', color: p.text, margin: '0' }, { level: 'h3' }),
          ])
        )),
      ]),
    ]),
    featureGrid(p, 'Why Atlas', 'Fewer, better things — and the service to match.', [
      { icon: 'check', title: 'Free repairs', desc: 'Every piece comes with lifetime repairs on seams and hardware.' },
      { icon: 'zap', title: 'Fast shipping', desc: 'Orders leave the workshop within one business day.' },
      { icon: 'star', title: 'Honest materials', desc: 'Full traceability from mill to finished piece.' },
    ]),
    footer(p, 'ATLAS', 'Objects with intent. Made to be kept.'),
  ];
  project.pages[0].title = 'Atlas — Storefront';
  return project;
}
