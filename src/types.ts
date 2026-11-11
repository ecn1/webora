export type ElementType =
  | 'section'
  | 'container'
  | 'flex'
  | 'grid'
  | 'columns'
  | 'card'
  | 'heading'
  | 'paragraph'
  | 'text'
  | 'button'
  | 'link'
  | 'divider'
  | 'spacer'
  | 'image'
  | 'video'
  | 'icon'
  | 'gallery'
  | 'navbar'
  | 'footer'
  | 'breadcrumbs'
  | 'input'
  | 'emailInput'
  | 'textarea'
  | 'checkbox'
  | 'radio'
  | 'select'
  | 'submit'
  | 'accordion'
  | 'tabs'
  | 'modal'
  | 'slider'
  | 'progress'
  | 'form'
  | 'mail'
  | 'customHtml'
  | 'customCss';

export type Breakpoint = 'desktop' | 'tablet' | 'mobile';

export interface WebElement {
  id: string;
  type: ElementType;
  name: string;
  content: string;
  props: Record<string, string>;
  style: Record<string, string>;
  hover: Record<string, string>;
  responsive: {
    tablet: Record<string, string>;
    mobile: Record<string, string>;
  };
  children: WebElement[];
}

export interface Page {
  id: string;
  name: string;
  path: string;
  title: string;
  description: string;
  elements: WebElement[];
  custom?: {
    html?: string;
    css?: string;
    js?: string;
  };
}

export interface Asset {
  id: string;
  name: string;
  type: string;
  dataUrl: string;
  size: number;
  createdAt: number;
}

export interface FormSubmission {
  id: string;
  formId: string;
  formName: string;
  pageId: string;
  pageName: string;
  respondentName: string;
  respondentEmail: string;
  values: Array<{ label: string; value: string }>;
  submittedAt: number;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  trashedAt?: number;
  pages: Page[];
  assets: Asset[];
  submissions?: FormSubmission[];
  custom: {
    html?: string;
    css?: string;
    js?: string;
  };
  settings: {
    seoTitle: string;
    seoDescription: string;
    favicon?: string;
  };
  /** Conversation held with the editor assistant for this project. */
  aiChat?: AIChatEntry[];
}

export interface AISettings {
  provider: 'ollama' | 'openai';
  ollamaUrl: string;
  ollamaModel: string;
  apiBaseUrl: string;
  apiModel: string;
  temperature: number;
  maxTokens: number;
}

export interface AppSettings {
  ai: AISettings;
  autosave: boolean;
  autosaveDelay: number;
  defaultViewport: Breakpoint;
  showGrid: boolean;
  gridSize: number;
  updateChannel: string;
  updateFeedUrl: string;
}

export interface TemplateMeta {
  id: string;
  name: string;
  category: string;
  description: string;
  gradient: string;
  build: () => Project;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIChatEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  at: number;
  /** `error` entries are rendered differently but are never sent back to the model. */
  kind?: 'text' | 'result' | 'error';
  changeCount?: number;
}

/**
 * A persistent AI Studio conversation. The session owns a draft project so a
 * follow-up prompt edits the same website instead of replacing it.
 */
export interface AISession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: AIChatEntry[];
  project: Project | null;
  /** True once the draft has also been saved into the projects workspace. */
  projectApplied?: boolean;
}

export interface AISessionStore {
  sessions: AISession[];
  activeId: string | null;
}

export interface AIRequest {
  provider: 'ollama' | 'openai';
  ollamaUrl: string;
  ollamaModel: string;
  apiBaseUrl: string;
  apiModel: string;
  apiKey?: string;
  temperature: number;
  maxTokens: number;
  messages: ChatMessage[];
  streamId?: string;
  /** Ask the provider for a JSON-only response when it supports the flag. */
  jsonMode?: boolean;
  /** Ollama context window; keeps long site context from being silently cut. */
  contextTokens?: number;
}

export type View =
  | 'dashboard'
  | 'projects'
  | 'templates'
  | 'aistudio'
  | 'assets'
  | 'forms'
  | 'settings'
  | 'editor';
