import { app, BrowserWindow, ipcMain, dialog, shell, safeStorage } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import type { AIRequest, ChatMessage } from '../src/types';

const isDev = !!process.env.VITE_DEV_SERVER_URL;

let win: BrowserWindow | null = null;

function compareVersions(a: string, b: string): number {
  const clean = (value: string) =>
    String(value || '0')
      .replace(/^v/i, '')
      .split(/[.+-]/)
      .map((part) => Number(part) || 0);
  const left = clean(a);
  const right = clean(b);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

function safeHttpUrl(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Invalid URL');
  const url = new URL(value);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Only http(s) URLs are allowed');
  return url.toString();
}

function dataDir(): string {
  const dir = path.join(app.getPath('userData'), 'webora-data');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function readJson<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJsonAtomic(file: string, value: unknown) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

let sessionBackupWritten = false;

/**
 * Keep a copy of the project file before every overwrite, plus a 7-day daily
 * snapshot and one snapshot from the start of this app session. This makes an
 * accidental delete recoverable even if the cause is never reproduced.
 */
function backupProjectsBeforeWrite() {
  const file = path.join(dataDir(), 'projects.json');
  if (!fs.existsSync(file)) return;
  try {
    const backupDir = path.join(dataDir(), 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    if (!sessionBackupWritten) {
      fs.copyFileSync(file, path.join(backupDir, 'projects-session.json'));
      sessionBackupWritten = true;
    }
    fs.copyFileSync(file, path.join(backupDir, 'projects-prev.json'));
    const day = new Date().toISOString().slice(0, 10);
    const daily = path.join(backupDir, `projects-${day}.json`);
    if (!fs.existsSync(daily)) fs.copyFileSync(file, daily);
    const dailyFiles = fs
      .readdirSync(backupDir)
      .filter((name) => /^projects-\d{4}-\d{2}-\d{2}\.json$/.test(name))
      .sort();
    for (const old of dailyFiles.slice(0, Math.max(0, dailyFiles.length - 10))) {
      fs.unlinkSync(path.join(backupDir, old));
    }
  } catch {
    /* backups are best-effort and must never block a save */
  }
}

function readProjectsRecovered(): any[] {
  const file = path.join(dataDir(), 'projects.json');
  const candidates = [file];
  const backupDir = path.join(dataDir(), 'backups');
  candidates.push(path.join(backupDir, 'projects-prev.json'));
  candidates.push(path.join(backupDir, 'projects-session.json'));
  try {
    const daily = fs
      .readdirSync(backupDir)
      .filter((name) => /^projects-\d{4}-\d{2}-\d{2}\.json$/.test(name))
      .sort()
      .reverse();
    for (const name of daily) candidates.push(path.join(backupDir, name));
  } catch {
    /* no backup folder yet */
  }
  for (const candidate of candidates) {
    try {
      if (!fs.existsSync(candidate)) continue;
      const parsed = JSON.parse(fs.readFileSync(candidate, 'utf8'));
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* try the next snapshot */
    }
  }
  return [];
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1180,
    minHeight: 720,
    backgroundColor: '#07070c',
    show: false,
    autoHideMenuBar: true,
    title: 'Webora — AI Website Builder',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  });

  win.once('ready-to-show', () => win?.show());

  // YouTube refuses embeds with no HTTP referer (error 153), which is the case
  // for file:// pages. Give player requests a stable referer belonging to this
  // project so YouTube and Vimeo embeds actually play inside the app.
  win.webContents.session.webRequest.onBeforeSendHeaders(
    {
      urls: [
        '*://*.youtube.com/*',
        '*://*.youtube-nocookie.com/*',
        '*://*.ytimg.com/*',
        '*://*.vimeo.com/*',
        '*://*.vimeocdn.com/*',
      ],
    },
    (details, callback) => {
      const headers = details.requestHeaders;
      if (!headers.Referer && !headers.referer) {
        headers.Referer = 'https://github.com/ecn1/webora';
      }
      callback({ requestHeaders: headers });
    }
  );

  if (isDev) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL!);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(https?:|mailto:|tel:)/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Automatic update check a few seconds after the interface is ready. No
  // user-entered feed URL is required.
  win.webContents.once('did-finish-load', () => {
    setTimeout(() => {
      void autoCheckForUpdates();
    }, 3500);
  });

  // Give the renderer a moment to flush unsaved projects before the window closes.
  let allowClose = false;
  win.on('close', (event) => {
    if (allowClose) return;
    event.preventDefault();
    const target = win;
    if (!target || target.webContents.isDestroyed()) {
      allowClose = true;
      target?.destroy();
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      ipcMain.removeListener('app:flush-done', finish);
      clearTimeout(timer);
      allowClose = true;
      if (target && !target.isDestroyed()) target.close();
    };
    const timer = setTimeout(finish, 2500);
    ipcMain.once('app:flush-done', finish);
    target.webContents.send('app:flush');
  });

  win.on('closed', () => {
    win = null;
  });
}

app.whenReady().then(() => {
  try {
    const { Menu } = require('electron');
    Menu.setApplicationMenu(null);
  } catch {
    /* noop */
  }
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

/* ----------------------------- storage ----------------------------- */

ipcMain.handle('storage:loadProjects', () => {
  return readProjectsRecovered();
});

ipcMain.handle('storage:loadProjectsBackup', () => {
  const backupDir = path.join(dataDir(), 'backups');
  const files = ['projects-prev.json', 'projects-session.json'];
  try {
    const daily = fs
      .readdirSync(backupDir)
      .filter((name) => /^projects-\d{4}-\d{2}-\d{2}\.json$/.test(name))
      .sort()
      .reverse();
    files.push(...daily);
  } catch {
    /* no backups */
  }
  for (const name of files) {
    try {
      const file = path.join(backupDir, name);
      if (!fs.existsSync(file)) continue;
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (Array.isArray(parsed) && parsed.length) return { name, projects: parsed };
    } catch {
      /* try older */
    }
  }
  return null;
});

ipcMain.handle('storage:saveProjects', (_e, projects: unknown) => {
  if (!Array.isArray(projects)) throw new Error('Invalid projects payload');
  backupProjectsBeforeWrite();
  writeJsonAtomic(path.join(dataDir(), 'projects.json'), projects);
  return true;
});

ipcMain.handle('storage:flushProjects', (_e, projects: unknown) => {
  if (!Array.isArray(projects)) throw new Error('Invalid projects payload');
  backupProjectsBeforeWrite();
  writeJsonAtomic(path.join(dataDir(), 'projects.json'), projects);
  return true;
});

ipcMain.handle('storage:loadAISessions', () => {
  return readJson<any>(path.join(dataDir(), 'ai-sessions.json'), null);
});

ipcMain.handle('storage:saveAISessions', (_e, payload: unknown) => {
  if (!payload || typeof payload !== 'object') throw new Error('Invalid AI session payload');
  writeJsonAtomic(path.join(dataDir(), 'ai-sessions.json'), payload);
  return true;
});

ipcMain.handle('storage:loadSettings', () => {
  return readJson<Record<string, unknown>>(path.join(dataDir(), 'settings.json'), {});
});

ipcMain.handle('storage:saveSettings', (_e, settings: unknown) => {
  if (!settings || typeof settings !== 'object') throw new Error('Invalid settings payload');
  writeJsonAtomic(path.join(dataDir(), 'settings.json'), settings);
  return true;
});

/* ----------------------------- secrets ----------------------------- */

function secretsPath(): string {
  return path.join(dataDir(), 'secrets.bin');
}

function readSecrets(): Record<string, string> {
  try {
    if (!fs.existsSync(secretsPath())) return {};
    const raw = fs.readFileSync(secretsPath());
    if (safeStorage.isEncryptionAvailable()) {
      const decrypted = safeStorage.decryptString(raw);
      return JSON.parse(decrypted);
    }
    return JSON.parse(raw.toString('utf8'));
  } catch {
    return {};
  }
}

function writeSecrets(secrets: Record<string, string>) {
  const payload = JSON.stringify(secrets);
  if (safeStorage.isEncryptionAvailable()) {
    fs.writeFileSync(secretsPath(), safeStorage.encryptString(payload));
  } else {
    fs.writeFileSync(secretsPath(), payload, 'utf8');
  }
}

ipcMain.handle('secrets:set', (_e, key: string, value: string) => {
  if (typeof key !== 'string' || typeof value !== 'string') throw new Error('Invalid secret payload');
  const secrets = readSecrets();
  if (value) secrets[key] = value;
  else delete secrets[key];
  writeSecrets(secrets);
  return true;
});

ipcMain.handle('secrets:get', (_e, key: string) => {
  if (typeof key !== 'string') throw new Error('Invalid key');
  return readSecrets()[key] ?? '';
});

/* ----------------------------- dialogs ----------------------------- */

ipcMain.handle('dialog:saveZip', async (_e, filename: string, data: Uint8Array) => {
  if (typeof filename !== 'string' || !data) throw new Error('Invalid save payload');
  const target = await dialog.showSaveDialog({
    title: 'Export website',
    defaultPath: filename,
    filters: [{ name: 'ZIP archive', extensions: ['zip'] }],
  });
  if (target.canceled || !target.filePath) return null;
  fs.writeFileSync(target.filePath, Buffer.from(data));
  return target.filePath;
});

ipcMain.handle('dialog:saveFile', async (_e, filename: string, data: Uint8Array, extension: string) => {
  if (typeof filename !== 'string' || !data) throw new Error('Invalid save payload');
  const ext = typeof extension === 'string' && /^[a-z0-9]+$/i.test(extension) ? extension : 'txt';
  const target = await dialog.showSaveDialog({
    title: 'Save file',
    defaultPath: filename,
    filters: [{ name: `${ext.toUpperCase()} file`, extensions: [ext] }],
  });
  if (target.canceled || !target.filePath) return null;
  fs.writeFileSync(target.filePath, Buffer.from(data));
  return target.filePath;
});

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

ipcMain.handle('dialog:pickAssets', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Import assets',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Media & fonts', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'mp4', 'webm', 'woff', 'woff2', 'ttf', 'otf'] },
    ],
  });
  if (result.canceled) return [];
  const out: Array<{ name: string; type: string; dataUrl: string; size: number }> = [];
  for (const file of result.filePaths) {
    try {
      const stat = fs.statSync(file);
      if (stat.size > 30 * 1024 * 1024) continue;
      const ext = path.extname(file).toLowerCase();
      const mime = MIME[ext] ?? 'application/octet-stream';
      const buf = fs.readFileSync(file);
      out.push({
        name: path.basename(file),
        type: mime,
        dataUrl: `data:${mime};base64,${buf.toString('base64')}`,
        size: stat.size,
      });
    } catch {
      /* skip unreadable file */
    }
  }
  return out;
});

ipcMain.handle('app:info', () => ({
  version: app.getVersion(),
  userData: app.getPath('userData'),
  platform: process.platform,
  electron: process.versions.electron,
}));

ipcMain.handle('shell:openPath', async (_e, target: string) => {
  if (typeof target !== 'string') throw new Error('Invalid path');
  const err = await shell.openPath(target);
  return err;
});

ipcMain.handle('shell:openExternal', async (_e, target: string) => {
  if (typeof target !== 'string') throw new Error('Invalid URL');
  if (!/^(https?:|mailto:|tel:)/i.test(target.trim())) throw new Error('Unsupported link scheme');
  await shell.openExternal(target.trim());
  return true;
});

/* ------------------------------ updates ----------------------------- */

interface FeedEntry {
  version?: string;
  notes?: string;
  downloadUrl?: string;
  url?: string;
  publishedAt?: string;
}

/**
 * Updates are published as GitHub Releases, so users never paste a feed URL.
 * WEBORA_UPDATE_FEED and a stored settings.updateFeedUrl remain as explicit
 * overrides for local testing and custom mirrors.
 */
const GITHUB_RELEASES_REPO = 'ecn1/webora';
const GITHUB_API_ROOT = `https://api.github.com/repos/${GITHUB_RELEASES_REPO}`;
const GITHUB_REQUEST_HEADERS = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'Webora-Update-Checker',
  'X-GitHub-Api-Version': '2022-11-28',
};

interface GithubReleaseAsset {
  name?: string;
  state?: string;
  browser_download_url?: string;
}

interface GithubRelease {
  tag_name?: string;
  name?: string;
  body?: string;
  html_url?: string;
  published_at?: string;
  draft?: boolean;
  prerelease?: boolean;
  assets?: GithubReleaseAsset[];
}

function settingsFile(): string {
  return path.join(dataDir(), 'settings.json');
}

function storedUpdateChannel(): string {
  const settings = readJson<Record<string, any>>(settingsFile(), {});
  return typeof settings.updateChannel === 'string' && settings.updateChannel
    ? settings.updateChannel
    : 'stable';
}

function updateFeedOverrides(): string[] {
  const out: string[] = [];
  const env = process.env.WEBORA_UPDATE_FEED;
  if (env) out.push(...env.split(','));
  const settings = readJson<Record<string, any>>(settingsFile(), {});
  if (typeof settings.updateFeedUrl === 'string' && settings.updateFeedUrl.trim()) {
    out.push(settings.updateFeedUrl.trim());
  }
  return [...new Set(out.map((value) => value.trim()).filter(Boolean))];
}

function githubReleaseCandidates(channel: string): string[] {
  if (channel === 'beta' || channel === 'prerelease') {
    return [`${GITHUB_API_ROOT}/releases?per_page=20`];
  }
  // /latest excludes prereleases. The list fallback is filtered to stable
  // entries as well, so the stable channel never offers a beta by accident.
  return [`${GITHUB_API_ROOT}/releases/latest`, `${GITHUB_API_ROOT}/releases?per_page=20`];
}

function updateFeedCandidates(channel: string): string[] {
  return [...new Set([...updateFeedOverrides(), ...githubReleaseCandidates(channel)])];
}

function parseGithubRelease(raw: any, channel: string) {
  if (!raw || typeof raw !== 'object' || raw.draft) return null;
  const allowPrerelease = channel === 'beta' || channel === 'prerelease';
  if (!allowPrerelease && raw.prerelease) return null;
  const version = String(raw.tag_name ?? raw.name ?? '')
    .replace(/^v/i, '')
    .trim();
  if (!version) return null;
  const assets: GithubReleaseAsset[] = Array.isArray(raw.assets) ? raw.assets : [];
  const installers = assets.filter((asset) => {
    const url = String(asset?.browser_download_url ?? '');
    if (!/\.exe(?:$|\?)/i.test(url)) return false;
    // Assets still uploading are reported with state "open".
    return String(asset?.state ?? 'uploaded') !== 'open';
  });
  const asset =
    installers.find((candidate) =>
      /setup|install/i.test(String(candidate?.name ?? candidate?.browser_download_url ?? ''))
    ) ?? installers[0];
  const downloadUrl = String(asset?.browser_download_url ?? '').trim();
  if (!downloadUrl) return null;
  return {
    version,
    notes: String(raw.body ?? ''),
    url: downloadUrl,
    publishedAt: String(raw.published_at ?? ''),
  };
}

async function readGithubReleases(sourceUrl: string, channel: string) {
  const res = await fetch(sourceUrl, {
    headers: GITHUB_REQUEST_HEADERS,
    signal: AbortSignal.timeout(15000),
  });
  if (res.status === 404) throw new Error('Webora has no published release for this channel yet.');
  if (res.status === 403 || res.status === 429) {
    throw new Error('GitHub is rate-limiting update checks right now. Try again later.');
  }
  if (!res.ok) throw new Error(`GitHub Releases responded ${res.status}`);
  const json: any = await res.json();
  const releases = Array.isArray(json) ? json : [json];
  for (const release of releases) {
    const parsed = parseGithubRelease(release, channel);
    if (parsed) return parsed;
  }
  throw new Error('Webora has no published release for this channel yet.');
}

function isGithubReleaseApi(url: string) {
  return /^https:\/\/api\.github\.com\/repos\/[^/]+\/[^/]+\/releases(?:[/?#]|$)/i.test(url);
}

function pickFeedEntry(json: any, channel: string): FeedEntry | null {
  if (!json || typeof json !== 'object') return null;
  if (json.channels && typeof json.channels === 'object') {
    const entry = json.channels[channel] ?? json.channels.stable ?? json.channels.beta;
    if (entry && typeof entry === 'object') return entry;
  }
  if (json.latest && typeof json.latest === 'object') return json.latest;
  if (Array.isArray(json.releases)) {
    const match =
      json.releases.find((release: any) => !release?.channel || release.channel === channel) ??
      json.releases[0];
    return match && typeof match === 'object' ? match : null;
  }
  return json;
}

async function readUpdateFeed(feedUrl: string, channel: string) {
  const url = safeHttpUrl(feedUrl);
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Release feed responded ${res.status}`);
  const json: any = await res.json();
  const entry = pickFeedEntry(json, channel);
  if (!entry) throw new Error('Release feed did not contain a release entry');
  const version = String(entry.version ?? '').replace(/^v/i, '').trim();
  if (!version) throw new Error('Release feed entry has no version');
  const rawUrl = String(entry.downloadUrl ?? entry.url ?? '').trim();
  const downloadUrl = rawUrl ? new URL(rawUrl, url).toString() : '';
  return {
    version,
    notes: String(entry.notes ?? ''),
    url: downloadUrl,
    publishedAt: String(entry.publishedAt ?? ''),
  };
}

async function readUpdateSource(feed: string, channel: string) {
  const url = safeHttpUrl(feed);
  return isGithubReleaseApi(url) ? readGithubReleases(url, channel) : readUpdateFeed(url, channel);
}

async function checkForUpdate(channel?: string, feedOverride?: string) {
  const currentVersion = app.getVersion();
  const selectedChannel =
    typeof channel === 'string' && channel.trim() ? channel.trim() : storedUpdateChannel();
  const base = {
    available: false,
    currentVersion,
    version: currentVersion,
    notes: '',
    url: '',
    publishedAt: '',
  };
  const feeds =
    typeof feedOverride === 'string' && feedOverride.trim()
      ? [...new Set([feedOverride.trim(), ...updateFeedCandidates(selectedChannel)])]
      : updateFeedCandidates(selectedChannel);
  let lastError = '';
  for (const feed of feeds) {
    try {
      const result = await readUpdateSource(feed, selectedChannel);
      return {
        available: compareVersions(result.version, currentVersion) > 0,
        currentVersion,
        version: result.version,
        notes: result.notes,
        url: result.url,
        publishedAt: result.publishedAt,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'The update check failed.';
    }
  }
  return {
    ...base,
    error: lastError || 'The update service could not be reached.',
  };
}

ipcMain.handle('update:check', async (_e, channel?: string, feedOverride?: string) => {
  return checkForUpdate(channel, feedOverride);
});

async function autoCheckForUpdates() {
  try {
    const result = await checkForUpdate();
    if (result.available && win && !win.webContents.isDestroyed()) {
      win.webContents.send('update:available', result);
    }
  } catch {
    /* an automatic check never interrupts the user */
  }
}

ipcMain.handle('update:download', async (_e, rawUrl: string) => {
  const url = safeHttpUrl(rawUrl);
  if (!/\.exe(?:$|\?)/i.test(new URL(url).pathname + new URL(url).search)) {
    throw new Error('Release feed must point to a Windows .exe installer');
  }
  const res = await fetch(url, { signal: AbortSignal.timeout(300000) });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (!buffer.length) throw new Error('The downloaded installer is empty');
  const dir = path.join(app.getPath('temp'), 'webora-updates');
  fs.mkdirSync(dir, { recursive: true });
  let rawName = path.basename(new URL(url).pathname);
  try {
    rawName = decodeURIComponent(rawName);
  } catch {
    /* keep the encoded name if it contains an invalid escape */
  }
  rawName = rawName || `Webora-Setup-${Date.now()}.exe`;
  const name = rawName.replace(/[^a-z0-9._-]/gi, '_');
  const target = path.join(dir, name.endsWith('.exe') ? name : `${name}.exe`);
  fs.writeFileSync(target, buffer);
  return target;
});

ipcMain.handle('update:install', async (_e, filePath: string) => {
  if (typeof filePath !== 'string' || !filePath.toLowerCase().endsWith('.exe')) {
    throw new Error('Invalid installer file');
  }
  const resolved = path.resolve(filePath);
  const root = path.resolve(app.getPath('temp'), 'webora-updates');
  if (!resolved.startsWith(root + path.sep)) throw new Error('Installer is outside the update folder');
  if (!fs.existsSync(resolved)) throw new Error('The downloaded installer no longer exists');
  const child = spawn(resolved, ['/S'], { detached: true, stdio: 'ignore' });
  child.unref();
  setTimeout(() => app.quit(), 700);
  return true;
});

/* -------------------------------- AI -------------------------------- */

ipcMain.handle('ai:ollamaTags', async (_e, url: string) => {
  if (typeof url !== 'string') throw new Error('Invalid url');
  const base = url.replace(/\/$/, '');
  const res = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Ollama responded ${res.status}`);
  const json: any = await res.json();
  return Array.isArray(json.models) ? json.models.map((m: any) => m.name as string) : [];
});

async function readStreamLines(
  body: ReadableStream<Uint8Array>,
  onLine: (line: string) => void
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n');
    buffer = parts.pop() ?? '';
    for (const line of parts) onLine(line.trim());
  }
  if (buffer.trim()) onLine(buffer.trim());
}

ipcMain.handle('ai:chat', async (event, req: AIRequest): Promise<string> => {
  if (!req || !Array.isArray(req.messages)) throw new Error('Invalid AI request');
  const sender = event.sender;
  const emit = (delta: string) => {
    if (req.streamId) sender.send('ai:chunk', { id: req.streamId, delta });
  };

  if (req.provider === 'ollama') {
    const base = (req.ollamaUrl || 'http://127.0.0.1:11434').replace(/\/$/, '');
    const model = req.ollamaModel || 'llama3.2';
    const res = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: req.messages,
        stream: !!req.streamId,
        ...(req.jsonMode ? { format: 'json' } : {}),
        options: {
          temperature: req.temperature ?? 0.7,
          num_predict: req.maxTokens ?? 4096,
          num_ctx: req.contextTokens ?? 8192,
        },
      }),
      signal: AbortSignal.timeout(180000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Ollama error ${res.status}: ${text.slice(0, 300)}`);
    }
    if (!req.streamId || !res.body) {
      const json: any = await res.json();
      return json?.message?.content ?? '';
    }
    let full = '';
    await readStreamLines(res.body, (line) => {
      if (!line) return;
      try {
        const parsed = JSON.parse(line);
        const delta = parsed?.message?.content ?? '';
        if (delta) {
          full += delta;
          emit(delta);
        }
      } catch {
        /* partial line */
      }
    });
    return full;
  }

  // OpenAI-compatible provider
  const base = (req.apiBaseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (req.apiKey) headers.Authorization = `Bearer ${req.apiKey}`;
  const body: Record<string, unknown> = {
    model: req.apiModel || 'gpt-4o-mini',
    messages: req.messages,
    temperature: req.temperature ?? 0.7,
    max_tokens: req.maxTokens ?? 4096,
    stream: !!req.streamId,
  };
  if (req.jsonMode) body.response_format = { type: 'json_object' };
  const send = () =>
    fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(180000),
    });
  let res = await send();
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    // Several OpenAI-compatible servers do not implement response_format.
    // Retry once without it rather than failing the whole AI request.
    if (req.jsonMode && res.status === 400 && /response_format|json_object/i.test(text)) {
      delete body.response_format;
      res = await send();
      if (!res.ok) {
        const retryText = await res.text().catch(() => '');
        throw new Error(`Provider error ${res.status}: ${retryText.slice(0, 300)}`);
      }
    } else {
      throw new Error(`Provider error ${res.status}: ${text.slice(0, 300)}`);
    }
  }
  if (!req.streamId || !res.body) {
    const json: any = await res.json();
    return json?.choices?.[0]?.message?.content ?? '';
  }
  let full = '';
  await readStreamLines(res.body, (line) => {
    if (!line || !line.startsWith('data:')) return;
    const data = line.slice(5).trim();
    if (!data || data === '[DONE]') return;
    try {
      const parsed = JSON.parse(data);
      const delta = parsed?.choices?.[0]?.delta?.content ?? '';
      if (delta) {
        full += delta;
        emit(delta);
      }
    } catch {
      /* ignore malformed SSE frame */
    }
  });
  return full;
});

/* --------------------------- window state --------------------------- */

ipcMain.handle('window:minimize', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize();
});

ipcMain.handle('window:maximize', (event) => {
  const w = BrowserWindow.fromWebContents(event.sender);
  if (!w) return;
  if (w.isMaximized()) w.unmaximize();
  else w.maximize();
});
