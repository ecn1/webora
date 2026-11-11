import { create } from 'zustand';
import type {
  AIChatEntry,
  AISession,
  AISessionStore,
  AppSettings,
  Asset,
  Breakpoint,
  ElementType,
  FormSubmission,
  Page,
  Project,
  View,
  WebElement,
} from '../types';
import { bridge, type PickedAsset } from '../lib/bridge';
import { clone, uid, slugify } from '../lib/utils';
import {
  CONTAINER_TYPES,
  cloneWithNewIds,
  createElement,
  createPage,
  createProject,
  ensureProjectShape,
  findElement,
} from '../lib/docEngine';
import { TEMPLATES } from '../lib/templates';
import { applyOps, type EditOp } from '../lib/ai';

export const DEFAULT_SETTINGS: AppSettings = {
  ai: {
    provider: 'ollama',
    ollamaUrl: 'http://127.0.0.1:11434',
    ollamaModel: 'llama3.2',
    apiBaseUrl: 'https://api.openai.com/v1',
    apiModel: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 8192,
  },
  autosave: true,
  autosaveDelay: 500,
  defaultViewport: 'desktop',
  showGrid: false,
  gridSize: 8,
  updateChannel: 'stable',
  updateFeedUrl: '',
};

interface Toast {
  id: number;
  message: string;
  kind: 'info' | 'success' | 'error';
}

interface UIState {
  aiOpen: boolean;
  codeOpen: boolean;
  previewOpen: boolean;
  exportOpen: boolean;
  aiBusy: boolean;
}

interface Store extends UIState {
  ready: boolean;
  view: View;
  projects: Project[];
  current: Project | null;
  history: Project[];
  historyIndex: number;
  selectedId: string | null;
  selectedPageId: string | null;
  device: Breakpoint;
  zoom: number;
  saveState: 'saved' | 'saving' | 'unsaved';
  settings: AppSettings;
  apiKey: string;
  toasts: Toast[];
  aiSessions: AISession[];
  activeAISessionId: string | null;

  init: () => Promise<void>;
  setView: (view: View) => void;
  setUI: (partial: Partial<UIState>) => void;
  toast: (message: string, kind?: Toast['kind']) => void;

  createFromTemplate: (templateId: string) => void;
  createBlankProject: (name: string) => void;
  openProject: (id: string) => void;
  duplicateProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
  restoreProject: (id: string) => void;
  purgeProject: (id: string) => void;
  emptyTrash: () => void;
  updateCurrentName: (name: string) => void;

  addSubmission: (
    projectId: string,
    submission: Omit<FormSubmission, 'id' | 'submittedAt'>
  ) => void;
  deleteSubmission: (projectId: string, submissionId: string) => void;
  clearSubmissions: (projectId: string, formId?: string) => void;

  commit: (mutator: (project: Project) => void, opts?: { silent?: boolean; coalesceKey?: string }) => void;
  undo: () => void;
  redo: () => void;

  selectElement: (id: string | null) => void;
  setPage: (id: string) => void;
  setDevice: (device: Breakpoint) => void;
  setZoom: (zoom: number) => void;

  addElement: (type: ElementType, parentId?: string | null) => void;
  addElementObject: (el: WebElement, parentId?: string | null) => void;
  insertElement: (
    type: ElementType,
    targetId: string | null,
    position: 'inside' | 'before' | 'after'
  ) => void;
  moveElement: (id: string, targetId: string | null, position: 'inside' | 'before' | 'after') => void;
  pasteElement: (element: WebElement) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  moveSelected: (dir: 'up' | 'down') => void;
  setContent: (value: string) => void;
  setName: (value: string) => void;
  setStyle: (key: string, value: string, target: Breakpoint | 'hover') => void;
  setStyleBulk: (style: Record<string, string>, target: Breakpoint | 'hover') => void;
  setProp: (key: string, value: string) => void;

  addPage: () => void;
  renamePage: (id: string, name: string) => void;
  deletePage: (id: string) => void;
  duplicatePage: (id: string) => void;
  setHomePage: (id: string) => void;
  updatePageMeta: (id: string, patch: Partial<Pick<Page, 'title' | 'description' | 'path'>>) => void;

  addAssets: (picked: PickedAsset[]) => Promise<void>;
  addAssetsToProject: (projectId: string, picked: PickedAsset[]) => Promise<void>;
  removeAsset: (id: string) => void;
  removeAssetFromProject: (projectId: string, id: string) => void;
  renameAsset: (id: string, name: string) => void;
  renameAssetInProject: (projectId: string, id: string, name: string) => void;

  setCustom: (kind: 'html' | 'css' | 'js', code: string) => void;
  clearCustom: (kind: 'html' | 'css' | 'js') => void;
  setPageCustom: (kind: 'html' | 'css' | 'js', code: string) => void;
  clearPageCustom: (kind: 'html' | 'css' | 'js') => void;

  updateSettings: (patch: Omit<Partial<AppSettings>, 'ai'> & { ai?: Partial<AppSettings['ai']> }) => void;
  saveApiKey: (key: string) => Promise<void>;

  importProjects: (projects: Project[]) => void;
  saveNow: () => Promise<void>;
  flushSave: () => Promise<boolean>;

  newAISession: (title?: string) => string;
  selectAISession: (id: string | null) => void;
  renameAISession: (id: string, title: string) => void;
  deleteAISession: (id: string) => void;
  appendAISessionMessage: (
    id: string,
    entry: Omit<AIChatEntry, 'id' | 'at'> & { id?: string; at?: number }
  ) => void;
  setAISessionProject: (id: string, project: Project) => void;
  applyAISessionProject: (id: string) => void;
  appendProjectAIChat: (projectId: string, entry: Omit<AIChatEntry, 'id' | 'at'>) => void;

  applyAIProject: (project: Project) => void;
  applyAIOps: (ops: EditOp[]) => {
    applied: number;
    errors: string[];
    pageIds: string[];
    createdPageIds: string[];
  };
}

let toastId = 0;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let lastCommitAt = 0;
let lastCommitKey = '';

function persistProjects() {
  if (saveTimer) clearTimeout(saveTimer);
  const configured = Number(useStore.getState().settings.autosaveDelay ?? 500);
  const delay = Number.isFinite(configured) ? Math.max(0, configured) : 500;
  saveTimer = setTimeout(async () => {
    const state = useStore.getState();
    useStore.setState({ saveState: 'saving' });
    try {
      await bridge.saveProjects(state.projects);
      useStore.setState({ saveState: 'saved' });
    } catch {
      useStore.setState({ saveState: 'unsaved' });
    }
  }, delay);
}

async function persistProjectsNow() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  const state = useStore.getState();
  useStore.setState({ saveState: 'saving' });
  try {
    await bridge.saveProjects(state.projects);
    useStore.setState({ saveState: 'saved' });
  } catch {
    useStore.setState({ saveState: 'unsaved' });
    throw new Error('Could not write project data to disk.');
  }
}

let aiSaveTimer: ReturnType<typeof setTimeout> | null = null;
function persistAISessions() {
  if (aiSaveTimer) clearTimeout(aiSaveTimer);
  aiSaveTimer = setTimeout(() => {
    const state = useStore.getState();
    const payload: AISessionStore = {
      sessions: state.aiSessions,
      activeId: state.activeAISessionId,
    };
    void bridge.saveAISessions(payload).catch(() => {});
  }, 350);
}

async function persistAISessionsNow() {
  if (aiSaveTimer) {
    clearTimeout(aiSaveTimer);
    aiSaveTimer = null;
  }
  const state = useStore.getState();
  await bridge.saveAISessions({ sessions: state.aiSessions, activeId: state.activeAISessionId });
}

function cleanChatEntries(raw: unknown): AIChatEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry) => entry && typeof entry === 'object' && typeof entry.content === 'string')
    .slice(-120)
    .map((entry) => ({
      id: typeof entry.id === 'string' && entry.id ? entry.id : uid('chat'),
      role: entry.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: entry.content.slice(0, 20000),
      at: typeof entry.at === 'number' ? entry.at : Date.now(),
      kind:
        entry.kind === 'result' || entry.kind === 'error'
          ? (entry.kind as 'result' | 'error')
          : ('text' as const),
      changeCount: typeof entry.changeCount === 'number' ? entry.changeCount : undefined,
    }));
}

function restoreAISessions(raw: unknown): AISessionStore {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as any) : null;
  const list = Array.isArray(raw) ? raw : Array.isArray(source?.sessions) ? source.sessions : [];
  const sessions: AISession[] = list
    .filter((entry: any) => entry && typeof entry === 'object')
    .slice(0, 30)
    .map((entry: any) => {
      const project = entry.project ? ensureProjectShape(entry.project) : null;
      return {
        id: typeof entry.id === 'string' && entry.id ? entry.id : uid('ais'),
        title: typeof entry.title === 'string' && entry.title.trim() ? entry.title : 'New chat',
        createdAt: typeof entry.createdAt === 'number' ? entry.createdAt : Date.now(),
        updatedAt: typeof entry.updatedAt === 'number' ? entry.updatedAt : Date.now(),
        messages: cleanChatEntries(entry.messages),
        project,
        projectApplied: !!entry.projectApplied,
      };
    });
  const requested = typeof source?.activeId === 'string' ? source.activeId : null;
  const activeId = sessions.some((session) => session.id === requested)
    ? requested
    : sessions[0]?.id ?? null;
  return { sessions, activeId };
}

function insertNode(
  elements: WebElement[],
  el: WebElement,
  targetId: string | null,
  position: 'inside' | 'before' | 'after'
) {
  if (!targetId) {
    elements.push(el);
    return;
  }
  const found = findElement(elements, targetId);
  if (!found) {
    elements.push(el);
    return;
  }
  if (position === 'inside' && CONTAINER_TYPES.includes(found.el.type)) {
    found.el.children.push(el);
    return;
  }
  const index = found.index + (position === 'after' ? 1 : 0);
  found.list.splice(Number.isFinite(index) ? index : found.list.length, 0, el);
}

function persistSettings(settings: AppSettings) {
  bridge.saveSettings(settings).catch(() => {});
}

function currentPageOf(state: { current: Project | null; selectedPageId: string | null }): Page | null {
  if (!state.current) return null;
  return state.current.pages.find((p) => p.id === state.selectedPageId) ?? state.current.pages[0] ?? null;
}

export const useStore = create<Store>((set, get) => ({
  ready: false,
  view: 'dashboard',
  projects: [],
  current: null,
  history: [],
  historyIndex: -1,
  selectedId: null,
  selectedPageId: null,
  device: 'desktop',
  zoom: 1,
  saveState: 'saved',
  settings: DEFAULT_SETTINGS,
  apiKey: '',
  toasts: [],
  aiSessions: [],
  activeAISessionId: null,
  aiOpen: false,
  codeOpen: false,
  previewOpen: false,
  exportOpen: false,
  aiBusy: false,

  init: async () => {
    try {
      const [rawProjects, rawSettings, key, rawSessions] = await Promise.all([
        bridge.loadProjects(),
        bridge.loadSettings(),
        bridge.getSecret('openai_key'),
        bridge.loadAISessions().catch(() => null),
      ]);
      const projects = (Array.isArray(rawProjects) ? rawProjects : [])
        .map((p) => ensureProjectShape(p))
        .filter(Boolean) as Project[];
      const stored = (rawSettings ?? {}) as Partial<AppSettings>;
      const settings: AppSettings = {
        ...DEFAULT_SETTINGS,
        ...stored,
        autosaveDelay: Number.isFinite(Number(stored.autosaveDelay))
          ? Math.max(0, Number(stored.autosaveDelay))
          : DEFAULT_SETTINGS.autosaveDelay,
        ai: { ...DEFAULT_SETTINGS.ai, ...(stored.ai ?? {}) },
      };
      const restored = restoreAISessions(rawSessions);
      set({
        projects,
        settings,
        apiKey: key || '',
        aiSessions: restored.sessions,
        activeAISessionId: restored.activeId,
        ready: true,
        saveState: 'saved',
      });
    } catch {
      set({ ready: true });
    }
  },

  setView: (view) => set({ view }),
  setUI: (partial) => set(partial),
  toast: (message, kind = 'info') => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts, { id, message, kind }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4200);
  },

  createFromTemplate: (templateId) => {
    const meta = TEMPLATES.find((t) => t.id === templateId);
    if (!meta) return;
    const project = meta.build();
    set((s) => ({
      projects: [project, ...s.projects],
      current: clone(project),
      selectedPageId: project.pages[0].id,
      selectedId: null,
      history: [clone(project)],
      historyIndex: 0,
      view: 'editor',
      saveState: 'unsaved',
    }));
    persistProjects();
    get().toast(`Created “${project.name}” from template`, 'success');
  },

  createBlankProject: (name) => {
    const project = createProject(name || 'Untitled website');
    set((s) => ({
      projects: [project, ...s.projects],
      current: clone(project),
      selectedPageId: project.pages[0].id,
      selectedId: null,
      history: [clone(project)],
      historyIndex: 0,
      view: 'editor',
      saveState: 'unsaved',
    }));
    persistProjects();
    get().toast('New project created', 'success');
  },

  openProject: (id) => {
    const project = get().projects.find((p) => p.id === id);
    if (!project) return;
    if (project.trashedAt) {
      get().toast('Restore this project from Trash before opening it', 'info');
      return;
    }
    const snapshot = clone(project);
    set({
      current: clone(project),
      selectedPageId: project.pages[0]?.id ?? null,
      selectedId: null,
      history: [snapshot],
      historyIndex: 0,
      view: 'editor',
      device: get().settings.defaultViewport,
      zoom: 1,
      saveState: 'saved',
    });
  },

  duplicateProject: (id) => {
    const project = get().projects.find((p) => p.id === id);
    if (!project) return;
    const copy: Project = clone(project);
    copy.id = uid('proj');
    copy.name = `${project.name} copy`;
    copy.createdAt = Date.now();
    copy.updatedAt = Date.now();
    copy.trashedAt = undefined;
    set((s) => ({ projects: [copy, ...s.projects] }));
    persistProjects();
    get().toast('Project duplicated', 'success');
  },

  renameProject: (id, name) => {
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? { ...p, name, updatedAt: Date.now() } : p)),
      current: s.current && s.current.id === id ? { ...s.current, name } : s.current,
    }));
    persistProjects();
  },

  deleteProject: (id) => {
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === id ? { ...p, trashedAt: Date.now(), updatedAt: Date.now() } : p
      ),
      current: s.current?.id === id ? null : s.current,
      view: s.current?.id === id && s.view === 'editor' ? 'projects' : s.view,
      // Keep the AI Studio draft, but stop it from writing into a trashed project.
      aiSessions: s.aiSessions.map((session) =>
        session.project?.id === id ? { ...session, projectApplied: false } : session
      ),
    }));
    persistProjects();
    persistAISessions();
    get().toast('Project moved to Trash', 'info');
  },

  restoreProject: (id) => {
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === id ? { ...p, trashedAt: undefined, updatedAt: Date.now() } : p
      ),
    }));
    persistProjects();
    get().toast('Project restored', 'success');
  },

  purgeProject: (id) => {
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      current: s.current?.id === id ? null : s.current,
      view: s.current?.id === id && s.view === 'editor' ? 'projects' : s.view,
      // The AI Studio draft can still bring this project back from its history.
      aiSessions: s.aiSessions.map((session) =>
        session.project?.id === id ? { ...session, projectApplied: false } : session
      ),
    }));
    persistProjects();
    persistAISessions();
    get().toast('Project permanently deleted', 'info');
  },

  emptyTrash: () => {
    const trashed = get().projects.filter((p) => p.trashedAt);
    if (!trashed.length) return;
    const ids = new Set(trashed.map((project) => project.id));
    set((s) => ({
      projects: s.projects.filter((p) => !p.trashedAt),
      aiSessions: s.aiSessions.map((session) =>
        session.project && ids.has(session.project.id) ? { ...session, projectApplied: false } : session
      ),
    }));
    persistProjects();
    persistAISessions();
    get().toast(`Deleted ${trashed.length} project${trashed.length === 1 ? '' : 's'} permanently`, 'info');
  },

  addSubmission: (projectId, submission) => {
    const full: FormSubmission = {
      ...submission,
      id: uid('sub'),
      submittedAt: Date.now(),
    };
    const apply = (project: Project): Project =>
      project.id === projectId
        ? {
            ...project,
            submissions: [full, ...(project.submissions ?? [])].slice(0, 1000),
            updatedAt: Date.now(),
          }
        : project;
    set((s) => ({
      projects: s.projects.map(apply),
      current: s.current ? apply(s.current) : s.current,
    }));
    persistProjects();
  },

  deleteSubmission: (projectId, submissionId) => {
    const apply = (project: Project): Project =>
      project.id === projectId
        ? {
            ...project,
            submissions: (project.submissions ?? []).filter((item) => item.id !== submissionId),
            updatedAt: Date.now(),
          }
        : project;
    set((s) => ({
      projects: s.projects.map(apply),
      current: s.current ? apply(s.current) : s.current,
    }));
    persistProjects();
  },

  clearSubmissions: (projectId, formId) => {
    const apply = (project: Project): Project =>
      project.id === projectId
        ? {
            ...project,
            submissions: formId
              ? (project.submissions ?? []).filter((item) => item.formId !== formId)
              : [],
            updatedAt: Date.now(),
          }
        : project;
    set((s) => ({
      projects: s.projects.map(apply),
      current: s.current ? apply(s.current) : s.current,
    }));
    persistProjects();
    get().toast('Responses cleared', 'info');
  },

  updateCurrentName: (name) => {
    get().commit(
      (p) => {
        p.name = name;
      },
      { coalesceKey: 'project-name' }
    );
  },

  commit: (mutator, opts) => {
    const state = get();
    if (!state.current) return;
    const next = clone(state.current);
    mutator(next);
    next.updatedAt = Date.now();
    const history = state.history.slice(0, state.historyIndex + 1);
    const coalesce =
      !!opts?.coalesceKey &&
      opts.coalesceKey === lastCommitKey &&
      Date.now() - lastCommitAt < 700 &&
      history.length > 0;
    if (coalesce) history[history.length - 1] = clone(next);
    else history.push(clone(next));
    if (history.length > 60) history.shift();
    lastCommitKey = opts?.coalesceKey ?? '';
    lastCommitAt = Date.now();
    set({
      current: next,
      history,
      historyIndex: history.length - 1,
      projects: state.projects.some((p) => p.id === next.id)
        ? state.projects.map((p) => (p.id === next.id ? clone(next) : p))
        : [clone(next), ...state.projects],
      saveState: 'unsaved',
    });
    if (!opts?.silent) {
      if (get().settings.autosave) persistProjects();
      else set({ saveState: 'unsaved' });
    }
  },

  undo: () => {
    const { history, historyIndex, projects } = get();
    if (historyIndex <= 0) return;
    const snapshot = clone(history[historyIndex - 1]);
    set({
      current: snapshot,
      historyIndex: historyIndex - 1,
      projects: projects.map((p) => (p.id === snapshot.id ? clone(snapshot) : p)),
      saveState: 'unsaved',
    });
    if (get().settings.autosave) persistProjects();
  },

  redo: () => {
    const { history, historyIndex, projects } = get();
    if (historyIndex >= history.length - 1) return;
    const snapshot = clone(history[historyIndex + 1]);
    set({
      current: snapshot,
      historyIndex: historyIndex + 1,
      projects: projects.map((p) => (p.id === snapshot.id ? clone(snapshot) : p)),
      saveState: 'unsaved',
    });
    if (get().settings.autosave) persistProjects();
  },

  selectElement: (id) => set({ selectedId: id }),
  setPage: (id) => set({ selectedPageId: id, selectedId: null }),
  setDevice: (device) => set({ device }),
  setZoom: (zoom) => set({ zoom }),

  addElement: (type, parentId) => {
    const state = get();
    const page = currentPageOf(state);
    if (!page) return;
    const el = createElement(type);
    get().commit((p) => {
      const pg = p.pages.find((x) => x.id === page.id);
      if (!pg) return;
      if (parentId) {
        const found = findElement(pg.elements, parentId);
        if (found && CONTAINER_TYPES.includes(found.el.type)) {
          found.el.children.push(el);
          return;
        }
      }
      pg.elements.push(el);
    });
    set({ selectedId: el.id });
  },

  insertElement: (type, targetId, position) => {
    const state = get();
    const page = currentPageOf(state);
    if (!page) return;
    const el = createElement(type);
    get().commit((p) => {
      const pg = p.pages.find((x) => x.id === page.id);
      if (!pg) return;
      insertNode(pg.elements, el, targetId, position);
    });
    set({ selectedId: el.id });
  },

  addElementObject: (element, parentId) => {
    const page = currentPageOf(get());
    if (!page) return;
    const el = cloneWithNewIds(element);
    get().commit((p) => {
      const pg = p.pages.find((x) => x.id === page.id);
      if (!pg) return;
      if (parentId) {
        const found = findElement(pg.elements, parentId);
        if (found && CONTAINER_TYPES.includes(found.el.type)) {
          found.el.children.push(el);
          return;
        }
      }
      pg.elements.push(el);
    });
    set({ selectedId: el.id });
  },

  moveElement: (id, targetId, position) => {
    const page = currentPageOf(get());
    if (!page) return;
    get().commit((p) => {
      const pg = p.pages.find((x) => x.id === page.id);
      if (!pg) return;
      if (targetId === id) return;
      const found = findElement(pg.elements, id);
      if (!found) return;
      if (targetId && findElement(found.el.children, targetId)) return;
      found.list.splice(found.index, 1);
      insertNode(pg.elements, found.el, targetId, position);
    });
  },

  pasteElement: (element) => {
    const page = currentPageOf(get());
    if (!page) return;
    const copyEl = cloneWithNewIds(element);
    get().commit((p) => {
      const pg = p.pages.find((x) => x.id === page.id);
      if (!pg) return;
      const selected = get().selectedId ? findElement(pg.elements, get().selectedId!) : null;
      if (selected && CONTAINER_TYPES.includes(selected.el.type)) {
        selected.el.children.push(copyEl);
      } else if (selected) {
        selected.list.splice(selected.index + 1, 0, copyEl);
      } else {
        pg.elements.push(copyEl);
      }
    });
    set({ selectedId: copyEl.id });
    get().toast('Element pasted', 'success');
  },

  deleteSelected: () => {
    const id = get().selectedId;
    const page = currentPageOf(get());
    if (!id || !page) return;
    get().commit((p) => {
      const pg = p.pages.find((x) => x.id === page.id);
      if (!pg) return;
      const found = findElement(pg.elements, id);
      if (found) found.list.splice(found.index, 1);
    });
    set({ selectedId: null });
  },

  duplicateSelected: () => {
    const { selectedId } = get();
    const page = currentPageOf(get());
    if (!selectedId || !page) return;
    let newId: string | null = null;
    get().commit((p) => {
      const pg = p.pages.find((x) => x.id === page.id);
      if (!pg) return;
      const found = findElement(pg.elements, selectedId);
      if (!found) return;
      const copyEl = cloneWithNewIds(found.el);
      newId = copyEl.id;
      found.list.splice(found.index + 1, 0, copyEl);
    });
    if (newId) set({ selectedId: newId });
  },

  moveSelected: (dir) => {
    const { selectedId } = get();
    const page = currentPageOf(get());
    if (!selectedId || !page) return;
    get().commit((p) => {
      const pg = p.pages.find((x) => x.id === page.id);
      if (!pg) return;
      const found = findElement(pg.elements, selectedId);
      if (!found) return;
      const target = dir === 'up' ? found.index - 1 : found.index + 1;
      if (target < 0 || target >= found.list.length) return;
      const [item] = found.list.splice(found.index, 1);
      found.list.splice(target, 0, item);
    });
  },

  setContent: (value) => {
    const { selectedId } = get();
    const page = currentPageOf(get());
    if (!selectedId || !page) return;
    get().commit((p) => {
      const pg = p.pages.find((x) => x.id === page.id);
      if (!pg) return;
      const found = findElement(pg.elements, selectedId);
      if (found) found.el.content = value;
    }, { coalesceKey: `content:${selectedId}` });
  },

  setName: (value) => {
    const { selectedId } = get();
    const page = currentPageOf(get());
    if (!selectedId || !page) return;
    get().commit((p) => {
      const pg = p.pages.find((x) => x.id === page.id);
      if (!pg) return;
      const found = findElement(pg.elements, selectedId);
      if (found) found.el.name = value;
    }, { coalesceKey: `name:${selectedId}` });
  },

  setStyle: (key, value, target) => {
    const { selectedId } = get();
    const page = currentPageOf(get());
    if (!selectedId || !page) return;
    get().commit((p) => {
      const pg = p.pages.find((x) => x.id === page.id);
      if (!pg) return;
      const found = findElement(pg.elements, selectedId);
      if (!found) return;
      const bucket =
        target === 'hover' ? found.el.hover : target === 'desktop' ? found.el.style : found.el.responsive[target];
      if (value === '') delete bucket[key];
      else bucket[key] = value;
    }, { coalesceKey: `style:${selectedId}:${target}` });
  },

  setStyleBulk: (style, target) => {
    const { selectedId } = get();
    const page = currentPageOf(get());
    if (!selectedId || !page) return;
    get().commit((p) => {
      const pg = p.pages.find((x) => x.id === page.id);
      if (!pg) return;
      const found = findElement(pg.elements, selectedId);
      if (!found) return;
      const bucket =
        target === 'hover' ? found.el.hover : target === 'desktop' ? found.el.style : found.el.responsive[target];
      for (const [k, v] of Object.entries(style)) {
        if (v === '') delete bucket[k];
        else bucket[k] = v;
      }
    }, { coalesceKey: `stylebulk:${selectedId}:${target}` });
  },

  setProp: (key, value) => {
    const { selectedId } = get();
    const page = currentPageOf(get());
    if (!selectedId || !page) return;
    get().commit((p) => {
      const pg = p.pages.find((x) => x.id === page.id);
      if (!pg) return;
      const found = findElement(pg.elements, selectedId);
      if (found) found.el.props[key] = value;
    }, { coalesceKey: `prop:${selectedId}:${key}` });
  },

  addPage: () => {
    const state = get();
    if (!state.current) return;
    const n = state.current.pages.length + 1;
    const page = createPage(`Page ${n}`, `/page-${n}`);
    get().commit((p) => {
      p.pages.push(page);
    });
    set({ selectedPageId: page.id, selectedId: null });
    get().toast('Page added', 'success');
  },

  renamePage: (id, name) => {
    get().commit((p) => {
      const page = p.pages.find((x) => x.id === id);
      if (page) {
        page.name = name;
        if (page.title === '' || page.title === name) page.title = name;
      }
    }, { coalesceKey: `page-name:${id}` });
  },

  deletePage: (id) => {
    const state = get();
    if (!state.current || state.current.pages.length <= 1) {
      get().toast('A project needs at least one page', 'error');
      return;
    }
    get().commit((p) => {
      p.pages = p.pages.filter((x) => x.id !== id);
    });
    if (get().selectedPageId === id) {
      set({ selectedPageId: get().current?.pages[0]?.id ?? null, selectedId: null });
    }
    get().toast('Page deleted', 'info');
  },

  duplicatePage: (id) => {
    const state = get();
    const page = state.current?.pages.find((p) => p.id === id);
    if (!page) return;
    const copy = clone(page);
    copy.id = uid('page');
    copy.name = `${page.name} copy`;
    copy.path = `/${slugify(copy.name)}`;
    copy.elements = page.elements.map(cloneWithNewIds);
    get().commit((p) => {
      const idx = p.pages.findIndex((x) => x.id === id);
      p.pages.splice(idx + 1, 0, copy);
    });
    set({ selectedPageId: copy.id });
    get().toast('Page duplicated', 'success');
  },

  setHomePage: (id) => {
    get().commit((p) => {
      const idx = p.pages.findIndex((x) => x.id === id);
      if (idx <= 0) return;
      const [page] = p.pages.splice(idx, 1);
      page.path = '/';
      const oldHome = p.pages[0];
      if (oldHome && oldHome.path === '/') oldHome.path = `/${slugify(oldHome.name)}`;
      p.pages.unshift(page);
    });
  },

  updatePageMeta: (id, patch) => {
    get().commit((p) => {
      const page = p.pages.find((x) => x.id === id);
      if (page) Object.assign(page, patch);
    }, { coalesceKey: `page-meta:${id}:${Object.keys(patch).join(',')}` });
  },

  addAssets: async (picked) => {
    const state = get();
    if (!state.current) {
      get().toast('Open a project first to add assets', 'error');
      return;
    }
    const assets: Asset[] = picked.map((p) => ({
      id: uid('asset'),
      name: p.name,
      type: p.type,
      dataUrl: p.dataUrl,
      size: p.size,
      createdAt: Date.now(),
    }));
    get().commit((p) => {
      p.assets.push(...assets);
    });
    get().toast(`${assets.length} asset${assets.length === 1 ? '' : 's'} imported`, 'success');
  },

  addAssetsToProject: async (projectId, picked) => {
    const assets: Asset[] = picked.map((p) => ({
      id: uid('asset'),
      name: p.name,
      type: p.type,
      dataUrl: p.dataUrl,
      size: p.size,
      createdAt: Date.now(),
    }));
    if (!assets.length) return;
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId ? { ...p, assets: [...p.assets, ...assets], updatedAt: Date.now() } : p
      ),
      current:
        s.current && s.current.id === projectId
          ? { ...s.current, assets: [...s.current.assets, ...assets] }
          : s.current,
    }));
    persistProjects();
    get().toast(`${assets.length} asset${assets.length === 1 ? '' : 's'} imported`, 'success');
  },

  removeAsset: (id) => {
    get().commit((p) => {
      p.assets = p.assets.filter((a) => a.id !== id);
    });
  },

  removeAssetFromProject: (projectId, id) => {
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId ? { ...p, assets: p.assets.filter((a) => a.id !== id), updatedAt: Date.now() } : p
      ),
      current:
        s.current && s.current.id === projectId
          ? { ...s.current, assets: s.current.assets.filter((a) => a.id !== id) }
          : s.current,
    }));
    persistProjects();
  },

  renameAsset: (id, name) => {
    get().commit((p) => {
      const asset = p.assets.find((a) => a.id === id);
      if (asset) asset.name = name;
    });
  },

  renameAssetInProject: (projectId, id, name) => {
    const apply = (p: Project): Project => ({
      ...p,
      assets: p.assets.map((a) => (a.id === id ? { ...a, name } : a)),
      updatedAt: Date.now(),
    });
    set((s) => ({
      projects: s.projects.map((p) => (p.id === projectId ? apply(p) : p)),
      current: s.current && s.current.id === projectId ? apply(s.current) : s.current,
    }));
    persistProjects();
  },

  setCustom: (kind, code) => {
    get().commit((p) => {
      p.custom[kind] = code;
    });
    get().toast(`${kind.toUpperCase()} override saved`, 'success');
  },

  clearCustom: (kind) => {
    get().commit((p) => {
      delete p.custom[kind];
    });
    get().toast(`${kind.toUpperCase()} override reset to generated output`, 'info');
  },

  setPageCustom: (kind, code) => {
    const page = currentPageOf(get());
    if (!page) return;
    get().commit((p) => {
      const pg = p.pages.find((x) => x.id === page.id);
      if (!pg) return;
      pg.custom = { ...(pg.custom ?? {}), [kind]: code };
    });
    get().toast(`${kind.toUpperCase()} override saved for ${page.name}`, 'success');
  },

  clearPageCustom: (kind) => {
    const page = currentPageOf(get());
    if (!page) return;
    get().commit((p) => {
      const pg = p.pages.find((x) => x.id === page.id);
      if (!pg || !pg.custom) return;
      delete pg.custom[kind];
    });
    get().toast(`${kind.toUpperCase()} override removed for ${page.name}`, 'info');
  },

  updateSettings: (patch) => {
    const next: AppSettings = {
      ...get().settings,
      ...patch,
      ai: { ...get().settings.ai, ...(patch.ai ?? {}) },
    };
    set({ settings: next });
    persistSettings(next);
  },

  saveApiKey: async (key) => {
    set({ apiKey: key });
    try {
      await bridge.setSecret('openai_key', key);
      get().toast('API key stored securely', 'success');
    } catch {
      get().toast('Failed to store API key', 'error');
    }
  },

  importProjects: (incoming) => {
    if (!incoming.length) return;
    set((s) => ({ projects: [...incoming, ...s.projects] }));
    persistProjects();
    get().toast(`${incoming.length} project${incoming.length === 1 ? '' : 's'} imported`, 'success');
  },

  saveNow: async () => {
    try {
      await Promise.all([persistProjectsNow(), persistAISessionsNow()]);
      get().toast('Project saved', 'success');
    } catch (err: any) {
      get().toast(err?.message || 'Save failed', 'error');
    }
  },

  flushSave: async () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    const state = get();
    try {
      await Promise.all([
        bridge.flushProjects(state.projects),
        bridge.saveAISessions({ sessions: state.aiSessions, activeId: state.activeAISessionId }),
      ]);
      useStore.setState({ saveState: 'saved' });
      return true;
    } catch {
      useStore.setState({ saveState: 'unsaved' });
      return false;
    }
  },

  newAISession: (title) => {
    const now = Date.now();
    const session: AISession = {
      id: uid('ais'),
      title: title?.trim() || 'New chat',
      createdAt: now,
      updatedAt: now,
      messages: [],
      project: null,
      projectApplied: false,
    };
    set((s) => ({
      aiSessions: [session, ...s.aiSessions].slice(0, 30),
      activeAISessionId: session.id,
    }));
    persistAISessions();
    return session.id;
  },

  selectAISession: (id) => {
    set((s) => {
      if (id && !s.aiSessions.some((session) => session.id === id)) return {};
      return { activeAISessionId: id };
    });
    persistAISessions();
  },

  renameAISession: (id, title) => {
    const clean = title.trim();
    if (!clean) return;
    set((s) => ({
      aiSessions: s.aiSessions.map((session) =>
        session.id === id ? { ...session, title: clean.slice(0, 80), updatedAt: Date.now() } : session
      ),
    }));
    persistAISessions();
  },

  deleteAISession: (id) => {
    set((s) => {
      const sessions = s.aiSessions.filter((session) => session.id !== id);
      return {
        aiSessions: sessions,
        activeAISessionId:
          s.activeAISessionId === id ? sessions[0]?.id ?? null : s.activeAISessionId,
      };
    });
    persistAISessions();
    get().toast('Chat removed', 'info');
  },

  appendAISessionMessage: (id, entry) => {
    const full: AIChatEntry = {
      id: entry.id ?? uid('chat'),
      role: entry.role,
      content: entry.content,
      at: entry.at ?? Date.now(),
      kind: entry.kind ?? 'text',
      changeCount: entry.changeCount,
    };
    set((s) => ({
      aiSessions: s.aiSessions.map((session) => {
        if (session.id !== id) return session;
        const messages = [...session.messages, full].slice(-120);
        const title =
          session.title === 'New chat' && full.role === 'user'
            ? full.content.replace(/\s+/g, ' ').trim().slice(0, 60) || 'New chat'
            : session.title;
        return { ...session, messages, title, updatedAt: Date.now() };
      }),
    }));
    persistAISessions();
  },

  setAISessionProject: (id, project) => {
    set((s) => {
      const session = s.aiSessions.find((item) => item.id === id);
      if (!session) return {};
      const nextSession: AISession = {
        ...session,
        project: clone(project),
        updatedAt: Date.now(),
      };
      const sessions = s.aiSessions.map((item) => (item.id === id ? nextSession : item));
      if (!session.projectApplied) return { aiSessions: sessions };

      const exists = s.projects.some((item) => item.id === project.id);
      const projects = exists
        ? s.projects.map((item) => (item.id === project.id ? clone(project) : item))
        : s.projects;
      if (s.current?.id !== project.id) {
        return { aiSessions: sessions, projects };
      }
      const history = s.history.slice(0, s.historyIndex + 1);
      history.push(clone(project));
      if (history.length > 60) history.shift();
      return {
        aiSessions: sessions,
        projects,
        current: clone(project),
        history,
        historyIndex: history.length - 1,
        selectedPageId: project.pages.some((page) => page.id === s.selectedPageId)
          ? s.selectedPageId
          : project.pages[0]?.id ?? null,
        selectedId: null,
        saveState: 'unsaved' as const,
      };
    });
    persistAISessions();
    const session = get().aiSessions.find((item) => item.id === id);
    if (session?.projectApplied) persistProjects();
  },

  applyAISessionProject: (id) => {
    const session = get().aiSessions.find((item) => item.id === id);
    if (!session?.project) return;
    const project = clone(session.project);
    set((s) => ({
      aiSessions: s.aiSessions.map((item) =>
        item.id === id ? { ...item, projectApplied: true, updatedAt: Date.now() } : item
      ),
      projects: s.projects.some((item) => item.id === project.id)
        ? s.projects.map((item) => (item.id === project.id ? clone(project) : item))
        : [clone(project), ...s.projects],
      current: clone(project),
      selectedPageId: project.pages[0]?.id ?? null,
      selectedId: null,
      history: [clone(project)],
      historyIndex: 0,
      view: 'editor',
      device: s.settings.defaultViewport,
      zoom: 1,
      saveState: 'unsaved',
    }));
    persistProjects();
    persistAISessions();
    get().toast('Opened the AI Studio website in the editor', 'success');
  },

  appendProjectAIChat: (projectId, entry) => {
    const full: AIChatEntry = {
      id: uid('chat'),
      role: entry.role,
      content: entry.content,
      at: Date.now(),
      kind: entry.kind ?? 'text',
      changeCount: entry.changeCount,
    };
    const apply = (project: Project): Project =>
      project.id === projectId
        ? { ...project, aiChat: [...(project.aiChat ?? []), full].slice(-100) }
        : project;
    set((s) => ({
      current: s.current ? apply(s.current) : s.current,
      projects: s.projects.map(apply),
    }));
    persistProjects();
  },

  applyAIProject: (project) => {
    set((s) => ({
      projects: s.projects.some((item) => item.id === project.id)
        ? s.projects.map((item) => (item.id === project.id ? clone(project) : item))
        : [clone(project), ...s.projects],
      current: clone(project),
      selectedPageId: project.pages[0]?.id ?? null,
      selectedId: null,
      history: [clone(project)],
      historyIndex: 0,
      view: 'editor',
      saveState: 'unsaved',
    }));
    persistProjects();
    get().toast('AI website applied to the canvas', 'success');
  },

  applyAIOps: (ops) => {
    const state = get();
    const page = currentPageOf(state);
    if (!page) {
      return { applied: 0, errors: ['No page is open.'], pageIds: [], createdPageIds: [] };
    }
    let result = { applied: 0, errors: [] as string[], pageIds: [] as string[], createdPageIds: [] as string[] };
    get().commit((project) => {
      result = applyOps(project, ops, page.id);
    });
    if (result.createdPageIds.length) {
      set({ selectedPageId: result.createdPageIds[0], selectedId: null });
    } else if (!get().current?.pages.some((item) => item.id === get().selectedPageId)) {
      set({ selectedPageId: get().current?.pages[0]?.id ?? null, selectedId: null });
    }
    if (result.applied > 0) {
      get().toast(`AI applied ${result.applied} change${result.applied === 1 ? '' : 's'}`, 'success');
    }
    if (result.errors.length) {
      get().toast(
        `AI skipped ${result.errors.length} invalid operation${result.errors.length === 1 ? '' : 's'}`,
        'error'
      );
    }
    return result;
  },
}));

export function selectedElementOf(state: { current: Project | null; selectedPageId: string | null; selectedId: string | null }): WebElement | null {
  if (!state.current || !state.selectedId) return null;
  const page = state.current.pages.find((p) => p.id === state.selectedPageId) ?? state.current.pages[0];
  if (!page) return null;
  return findElement(page.elements, state.selectedId)?.el ?? null;
}

export function currentPage(state: { current: Project | null; selectedPageId: string | null }): Page | null {
  return currentPageOf(state);
}
