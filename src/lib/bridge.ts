import type { AIRequest } from '../types';

export interface PickedAsset {
  name: string;
  type: string;
  dataUrl: string;
  size: number;
}

export interface AppInfo {
  version: string;
  userData: string;
  platform: string;
  electron: string;
}

export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  version: string;
  notes: string;
  url: string;
  publishedAt: string;
  error?: string;
}

export interface ProjectsBackup {
  name: string;
  projects: unknown[];
}

export interface WeboraApi {
  isDesktop: boolean;
  loadProjects: () => Promise<unknown[]>;
  saveProjects: (projects: unknown) => Promise<boolean>;
  flushProjects: (projects: unknown) => Promise<boolean>;
  loadProjectsBackup: () => Promise<ProjectsBackup | null>;
  loadAISessions: () => Promise<unknown>;
  saveAISessions: (payload: unknown) => Promise<boolean>;
  loadSettings: () => Promise<Record<string, unknown>>;
  saveSettings: (settings: unknown) => Promise<boolean>;
  setSecret: (key: string, value: string) => Promise<boolean>;
  getSecret: (key: string) => Promise<string>;
  saveZip: (filename: string, data: Uint8Array) => Promise<string | null>;
  saveFile: (filename: string, data: Uint8Array, extension: string) => Promise<string | null>;
  pickAssets: () => Promise<PickedAsset[]>;
  appInfo: () => Promise<AppInfo>;
  openPath: (p: string) => Promise<string>;
  openExternal: (url: string) => Promise<boolean>;
  ollamaTags: (url: string) => Promise<string[]>;
  aiChat: (req: AIRequest) => Promise<string>;
  onAiChunk: (cb: (payload: { id: string; delta: string }) => void) => () => void;
  onFlushRequest: (cb: () => void) => () => void;
  flushDone: () => void;
  checkForUpdates: (channel?: string) => Promise<UpdateInfo>;
  downloadUpdate: (url: string) => Promise<string>;
  installUpdate: (filePath: string) => Promise<boolean>;
  onUpdateAvailable: (cb: (info: UpdateInfo) => void) => () => void;
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
}

declare global {
  interface Window {
    webora?: WeboraApi;
  }
}

const api: WeboraApi | undefined = typeof window !== 'undefined' ? window.webora : undefined;

const LS_PROJECTS = 'webora.projects';
const LS_SETTINGS = 'webora.settings';
const LS_AI_SESSIONS = 'webora.aiSessions';

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function pickAssetsBrowser(): Promise<PickedAsset[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,video/*,.woff,.woff2,.ttf,.otf';
    input.onchange = () => {
      const files = Array.from(input.files ?? []);
      if (!files.length) return resolve([]);
      Promise.all(
        files.map(
          (file) =>
            new Promise<PickedAsset>((res) => {
              const reader = new FileReader();
              reader.onload = () =>
                res({ name: file.name, type: file.type || 'application/octet-stream', dataUrl: String(reader.result), size: file.size });
              reader.onerror = () => resolve([]);
              reader.readAsDataURL(file);
            })
        )
      ).then(resolve);
    };
    input.click();
  });
}

async function directChat(req: AIRequest): Promise<string> {
  if (req.provider === 'ollama') {
    const base = (req.ollamaUrl || 'http://127.0.0.1:11434').replace(/\/$/, '');
    const res = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: req.ollamaModel,
        messages: req.messages,
        stream: false,
        ...(req.jsonMode ? { format: 'json' } : {}),
        options: {
          temperature: req.temperature,
          num_predict: req.maxTokens,
          num_ctx: req.contextTokens ?? 8192,
        },
      }),
    });
    if (!res.ok) throw new Error(`Ollama error ${res.status}`);
    const json: any = await res.json();
    return json?.message?.content ?? '';
  }
  const base = (req.apiBaseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (req.apiKey) headers.Authorization = `Bearer ${req.apiKey}`;
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: req.apiModel,
      messages: req.messages,
      temperature: req.temperature,
      max_tokens: req.maxTokens,
      ...(req.jsonMode ? { response_format: { type: 'json_object' } } : {}),
      stream: false,
    }),
  });
  if (!res.ok) throw new Error(`Provider error ${res.status}`);
  const json: any = await res.json();
  return json?.choices?.[0]?.message?.content ?? '';
}

function compareVersions(a: string, b: string): number {
  const clean = (value: string) => value.replace(/^v/i, '').split(/[.-]/).map((p) => Number(p) || 0);
  const left = clean(a);
  const right = clean(b);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

export const UPDATE_FEED_EXAMPLE =
  '{ "version": "1.2.0", "notes": "What changed", "downloadUrl": "https://example.com/Webora-Setup-1.2.0.exe", "publishedAt": "2026-01-01" }';

export const bridge: WeboraApi = api ?? {
  isDesktop: false,
  loadProjects: async () => readLS<unknown[]>(LS_PROJECTS, []),
  saveProjects: async (projects) => {
    localStorage.setItem(LS_PROJECTS, JSON.stringify(projects));
    return true;
  },
  flushProjects: async (projects) => {
    localStorage.setItem(LS_PROJECTS, JSON.stringify(projects));
    return true;
  },
  loadProjectsBackup: async () => null,
  loadAISessions: async () => readLS<unknown>(LS_AI_SESSIONS, null),
  saveAISessions: async (payload) => {
    localStorage.setItem(LS_AI_SESSIONS, JSON.stringify(payload));
    return true;
  },
  loadSettings: async () => readLS<Record<string, unknown>>(LS_SETTINGS, {}),
  saveSettings: async (settings) => {
    localStorage.setItem(LS_SETTINGS, JSON.stringify(settings));
    return true;
  },
  setSecret: async (key, value) => {
    localStorage.setItem(`webora.secret.${key}`, value);
    return true;
  },
  getSecret: async (key) => localStorage.getItem(`webora.secret.${key}`) ?? '',
  saveZip: async (filename, data) => {
    const blob = new Blob([data as unknown as BlobPart], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return filename;
  },
  saveFile: async (filename, data, extension) => {
    const type = extension === 'html' ? 'text/html' : 'application/octet-stream';
    const blob = new Blob([data as unknown as BlobPart], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return filename;
  },
  pickAssets: pickAssetsBrowser,
  appInfo: async () => ({ version: '1.2.0', userData: 'browser storage', platform: 'web', electron: '-' }),
  openPath: async () => '',
  openExternal: async (url) => {
    if (!/^(https?:|mailto:|tel:)/i.test(url)) return false;
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
  },
  ollamaTags: async (url) => {
    const base = url.replace(/\/$/, '');
    const res = await fetch(`${base}/api/tags`);
    if (!res.ok) throw new Error(`Ollama responded ${res.status}`);
    const json: any = await res.json();
    return Array.isArray(json.models) ? json.models.map((m: any) => m.name) : [];
  },
  aiChat: directChat,
  onAiChunk: () => () => {},
  onFlushRequest: () => () => {},
  flushDone: () => {},
  checkForUpdates: async () => {
    throw new Error('Update checks are only available in the Webora desktop app.');
  },
  downloadUpdate: async () => {
    throw new Error('Update downloads require the desktop app.');
  },
  installUpdate: async () => {
    throw new Error('Update installation requires the desktop app.');
  },
  onUpdateAvailable: () => () => {},
  minimize: async () => {},
  maximize: async () => {},
};
