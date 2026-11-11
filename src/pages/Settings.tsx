import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArchiveRestore,
  Check,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Code2,
  Cpu,
  Database,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FolderOpen,
  HardDrive,
  Info,
  Keyboard,
  Loader2,
  Monitor,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Smartphone,
  Tablet,
  Upload,
  Wand2,
} from 'lucide-react';
import { useStore, DEFAULT_SETTINGS } from '../store/useStore';
import { bridge, type AppInfo, type ProjectsBackup, type UpdateInfo } from '../lib/bridge';
import { ensureProjectShape } from '../lib/docEngine';
import { cn, uid } from '../lib/utils';
import type { Breakpoint } from '../types';
import { Button, Field, Input, Segmented, Select, Toggle } from '../components/ui';

type Section = 'general' | 'ai' | 'editor' | 'storage' | 'about';

const SECTIONS: Array<{ id: Section; label: string; icon: typeof Monitor; hint: string }> = [
  { id: 'general', label: 'General', icon: Monitor, hint: 'Appearance & behaviour' },
  { id: 'ai', label: 'AI Providers', icon: Wand2, hint: 'Ollama & external APIs' },
  { id: 'editor', label: 'Editor', icon: Code2, hint: 'Canvas & shortcuts' },
  { id: 'storage', label: 'Storage', icon: HardDrive, hint: 'Local data & backups' },
  { id: 'about', label: 'About', icon: Info, hint: 'Version & credits' },
];

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function Settings() {
  const settings = useStore((s) => s.settings);
  const apiKey = useStore((s) => s.apiKey);
  const updateSettings = useStore((s) => s.updateSettings);
  const saveApiKey = useStore((s) => s.saveApiKey);
  const projects = useStore((s) => s.projects);
  const importProjects = useStore((s) => s.importProjects);
  const toast = useStore((s) => s.toast);

  const [section, setSection] = useState<Section>('general');
  const [keyDraft, setKeyDraft] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [providersBusy, setProvidersBusy] = useState<'ollama' | 'openai' | null>(null);
  const [providerStatus, setProviderStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [recovery, setRecovery] = useState<ProjectsBackup | null>(null);
  const [recoveryBusy, setRecoveryBusy] = useState<'check' | 'restore' | null>(null);
  const [recoveryChecked, setRecoveryChecked] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updateError, setUpdateError] = useState('');
  const [updateBusy, setUpdateBusy] = useState<'check' | 'download' | 'install' | null>(null);
  const [installerPath, setInstallerPath] = useState('');
  const backupInput = useRef<HTMLInputElement>(null);

  useEffect(() => setKeyDraft(apiKey), [apiKey]);
  useEffect(() => {
    void bridge.appInfo().then(setAppInfo).catch(() => setAppInfo(null));
  }, []);

  const dataSize = useMemo(() => {
    try {
      return new Blob([JSON.stringify(projects)]).size;
    } catch {
      return 0;
    }
  }, [projects]);

  const testOllama = async () => {
    setProvidersBusy('ollama');
    setProviderStatus(null);
    try {
      const models = await bridge.ollamaTags(settings.ai.ollamaUrl);
      setOllamaModels(models);
      if (models.length) {
        const hasCurrent = models.includes(settings.ai.ollamaModel);
        if (!hasCurrent) updateSettings({ ai: { ollamaModel: models[0] } });
        setProviderStatus({
          ok: true,
          message: `Ollama is reachable · ${models.length} model${models.length === 1 ? '' : 's'} installed${
            hasCurrent ? '' : ` · selected ${models[0]}`
          }`,
        });
      } else {
        setProviderStatus({
          ok: false,
          message: 'Ollama is running, but no models are installed. In a terminal run: ollama pull llama3.2',
        });
      }
    } catch (err: any) {
      setProviderStatus({
        ok: false,
        message:
          err?.message ||
          'Could not reach Ollama. Confirm it is running (ollama serve) and the address is correct.',
      });
    } finally {
      setProvidersBusy(null);
    }
  };

  const testOpenAI = async () => {
    setProvidersBusy('openai');
    setProviderStatus(null);
    try {
      const reply = await bridge.aiChat({
        provider: 'openai',
        ollamaUrl: settings.ai.ollamaUrl,
        ollamaModel: settings.ai.ollamaModel,
        apiBaseUrl: settings.ai.apiBaseUrl,
        apiModel: settings.ai.apiModel,
        apiKey: keyDraft || apiKey,
        temperature: 0,
        maxTokens: 16,
        messages: [{ role: 'user', content: 'Reply with the single word: OK' }],
      });
      setProviderStatus({
        ok: true,
        message: `Provider replied: “${reply.trim().slice(0, 80) || 'OK'}”`,
      });
    } catch (err: any) {
      setProviderStatus({
        ok: false,
        message: err?.message || 'Could not reach the provider. Check the base URL, model and API key.',
      });
    } finally {
      setProvidersBusy(null);
    }
  };

  const exportBackup = async () => {
    setBackupBusy(true);
    try {
      const bytes = new TextEncoder().encode(JSON.stringify({ version: 1, projects }, null, 2));
      const stamp = new Date().toISOString().slice(0, 10);
      const result = await bridge.saveFile(`webora-backup-${stamp}.json`, bytes, 'json');
      if (result) toast('Backup exported', 'success');
    } catch {
      toast('Could not export backup', 'error');
    } finally {
      setBackupBusy(false);
    }
  };

  const importBackup = async (files: FileList | null) => {
    if (!files || !files.length) return;
    try {
      const text = await files[0].text();
      const parsed = JSON.parse(text);
      const raw = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.projects) ? parsed.projects : [parsed];
      const imported = raw
        .map((item: unknown) => ensureProjectShape(item))
        .filter(Boolean)
        .map((p: any) => ({ ...p, id: uid('proj') }));
      if (imported.length) importProjects(imported);
      else toast('No projects found in that backup', 'error');
    } catch {
      toast('That file is not a valid Webora backup', 'error');
    }
    if (backupInput.current) backupInput.current.value = '';
  };

  const checkAutomaticBackup = async () => {
    if (!bridge.isDesktop) {
      toast('Automatic backups are available in the desktop app', 'info');
      return;
    }
    setRecoveryBusy('check');
    try {
      const snapshot = await bridge.loadProjectsBackup();
      setRecovery(snapshot);
      setRecoveryChecked(true);
      if (!snapshot) toast('No automatic snapshot was found yet', 'info');
    } catch {
      toast('Could not read the automatic backup folder', 'error');
    } finally {
      setRecoveryBusy(null);
    }
  };

  const restoreAutomaticBackup = async () => {
    if (!recovery) return;
    setRecoveryBusy('restore');
    try {
      const existing = new Set(projects.map((project) => project.id));
      const restored = recovery.projects
        .map((item) => ensureProjectShape(item))
        .filter(Boolean)
        .map((project: any) => {
          const copy = existing.has(project.id)
            ? { ...project, id: uid('proj'), name: `${project.name} (recovered)` }
            : project;
          // Restores are visible in My Projects even if the snapshot caught the
          // project mid-delete.
          return { ...copy, trashedAt: undefined };
        });
      if (!restored.length) {
        toast('That snapshot has no usable projects', 'error');
        return;
      }
      importProjects(restored);
      setRecovery(null);
      setRecoveryChecked(false);
    } catch {
      toast('Could not restore that snapshot', 'error');
    } finally {
      setRecoveryBusy(null);
    }
  };

  const checkForUpdates = async () => {
    if (!bridge.isDesktop) {
      setUpdateError('Update checks run in the installed desktop app.');
      return;
    }
    setUpdateBusy('check');
    setUpdateError('');
    setUpdateInfo(null);
    setInstallerPath('');
    try {
      const result = await bridge.checkForUpdates(settings.updateChannel);
      if (result.error) setUpdateError(result.error);
      else setUpdateInfo(result);
    } catch (err: any) {
      setUpdateError(err?.message || 'Could not check for updates.');
    } finally {
      setUpdateBusy(null);
    }
  };

  const downloadUpdate = async () => {
    if (!updateInfo?.url) {
      setUpdateError('The release feed did not include a download URL.');
      return;
    }
    setUpdateBusy('download');
    setUpdateError('');
    try {
      const path = await bridge.downloadUpdate(updateInfo.url);
      setInstallerPath(path);
      toast('Installer downloaded and ready', 'success');
    } catch (err: any) {
      setUpdateError(err?.message || 'Could not download the update.');
    } finally {
      setUpdateBusy(null);
    }
  };

  const installUpdate = async () => {
    if (!installerPath) return;
    setUpdateBusy('install');
    setUpdateError('');
    try {
      await bridge.installUpdate(installerPath);
      toast('Closing Webora to install the update…', 'info');
    } catch (err: any) {
      setUpdateError(err?.message || 'Could not launch the installer.');
      setUpdateBusy(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1180px] px-8 pb-16 pt-7">
      <div className="pb-6">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-medium text-[#5f5f78]">
          <span className="text-[#8c8ca6]">Workspace</span>
          <span className="text-[#33334a]">/</span>
          <span>Settings</span>
        </div>
        <h1 className="font-display text-[26px] font-bold tracking-tight text-white">Settings</h1>
        <p className="mt-1 text-[12px] text-[#71718a]">
          Configure AI providers, editor defaults and local storage. Everything applies immediately.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[210px_minmax(0,1fr)]">
        <nav className="space-y-1">
          {SECTIONS.map((item) => {
            const active = section === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition',
                  active
                    ? 'border-white/[0.08] bg-white/[0.055]'
                    : 'border-transparent hover:bg-white/[0.03]'
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-lg',
                    active ? 'bg-accent/15 text-accent-soft' : 'bg-white/[0.04] text-[#77778f]'
                  )}
                >
                  <item.icon size={14} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn('block text-[12px] font-medium', active ? 'text-white' : 'text-[#b3b3c8]')}>
                    {item.label}
                  </span>
                  <span className="mt-0.5 block truncate text-[9.5px] text-[#5c5c74]">{item.hint}</span>
                </span>
                {active ? <ChevronRight size={13} className="text-[#6f6f88]" /> : null}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 space-y-4">
          {section === 'general' ? (
            <>
              <SettingsCard title="General" subtitle="How Webora behaves when you edit projects.">
                <Toggle
                  checked={settings.autosave}
                  onChange={(value) => updateSettings({ autosave: value })}
                  label="Autosave changes"
                  description="Save projects to disk shortly after every edit. Turn this off to save manually with Ctrl+S."
                />
                {settings.autosave ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5">
                    <div>
                      <div className="text-[12px] font-medium text-[#dcdcea]">Autosave delay</div>
                      <p className="mt-0.5 text-[10.5px] text-[#68687f]">
                        How long Webora waits after your last edit before writing to disk.
                      </p>
                    </div>
                    <Segmented<string>
                      value={String(settings.autosaveDelay)}
                      onChange={(value) => updateSettings({ autosaveDelay: Number(value) })}
                      options={[
                        { value: '250', label: '0.25s' },
                        { value: '500', label: '0.5s' },
                        { value: '1000', label: '1s' },
                        { value: '2000', label: '2s' },
                      ]}
                    />
                  </div>
                ) : null}
                <Divider />
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <div className="text-[13px] font-medium text-[#e2e2ef]">Default editor viewport</div>
                      <p className="mt-0.5 text-[11.5px] text-[#71718a]">
                        The device preview selected when a project opens.
                      </p>
                    </div>
                    <Segmented<Breakpoint>
                      value={settings.defaultViewport}
                      onChange={(value) => updateSettings({ defaultViewport: value })}
                      options={[
                        { value: 'desktop', label: 'Desktop', icon: Monitor },
                        { value: 'tablet', label: 'Tablet', icon: Tablet },
                        { value: 'mobile', label: 'Mobile', icon: Smartphone },
                      ]}
                    />
                  </div>
                </div>
                <Divider />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Appearance" hint="Webora ships with the dark interface only.">
                    <div className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-ink-900/60 px-3 text-[12px] text-[#c9c9da]">
                      <span className="h-3.5 w-3.5 rounded-full border border-accent/50 bg-accent/30" />
                      Dark (default)
                      <span className="ml-auto text-[9.5px] uppercase tracking-wider text-[#5c5c74]">Active</span>
                    </div>
                  </Field>
                  <Field label="Language" hint="Only English is included in this build.">
                    <Select value="en" disabled>
                      <option value="en">English (US)</option>
                    </Select>
                  </Field>
                </div>
                <Divider />
                <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck size={15} className="text-emerald-400" />
                    <div>
                      <div className="text-[12px] font-medium text-[#dcdcea]">No account required</div>
                      <div className="mt-0.5 text-[10.5px] text-[#68687f]">
                        Projects, settings and API keys stay on this computer.
                      </div>
                    </div>
                  </div>
                </div>
              </SettingsCard>
            </>
          ) : null}

          {section === 'ai' ? (
            <>
              <SettingsCard
                title="AI provider"
                subtitle="Switch between a local Ollama model and any OpenAI-compatible API at any time."
              >
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <ProviderCard
                    active={settings.ai.provider === 'ollama'}
                    icon={Cpu}
                    name="Ollama"
                    description="Local models, no API key, fully offline."
                    tag="LOCAL"
                    onClick={() => {
                      updateSettings({ ai: { provider: 'ollama' } });
                      setProviderStatus(null);
                    }}
                  />
                  <ProviderCard
                    active={settings.ai.provider === 'openai'}
                    icon={Cloud}
                    name="OpenAI-compatible API"
                    description="OpenAI, Groq, OpenRouter, LM Studio and more."
                    tag="REMOTE"
                    onClick={() => {
                      updateSettings({ ai: { provider: 'openai' } });
                      setProviderStatus(null);
                    }}
                  />
                </div>

                <Divider />

                {settings.ai.provider === 'ollama' ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                      <Field label="Ollama address" hint="Default local endpoint for Ollama.">
                        <Input
                          value={settings.ai.ollamaUrl}
                          onChange={(e) => updateSettings({ ai: { ollamaUrl: e.target.value } })}
                          placeholder="http://127.0.0.1:11434"
                        />
                      </Field>
                      <Button
                        variant="secondary"
                        icon={providersBusy === 'ollama' ? undefined : Cpu}
                        loading={providersBusy === 'ollama'}
                        onClick={testOllama}
                        className="h-9"
                      >
                        Detect models
                      </Button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {ollamaModels.length ? (
                        <Field label="Installed model" hint={`${ollamaModels.length} models found on this machine.`}>
                          <Select
                            value={settings.ai.ollamaModel}
                            onChange={(e) => updateSettings({ ai: { ollamaModel: e.target.value } })}
                          >
                            {ollamaModels.map((model) => (
                              <option key={model} value={model}>
                                {model}
                              </option>
                            ))}
                          </Select>
                        </Field>
                      ) : null}
                      <Field
                        label="Model name"
                        hint="Use any model you have pulled locally. Recommended: llama3.2, qwen2.5-coder, mistral."
                      >
                        <Input
                          value={settings.ai.ollamaModel}
                          onChange={(e) => updateSettings({ ai: { ollamaModel: e.target.value } })}
                          placeholder="llama3.2"
                        />
                      </Field>
                    </div>

                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-[10.5px] leading-relaxed text-[#73738c]">
                      Ollama is optional and never bundled. Install it separately from ollama.com, then run{' '}
                      <code className="rounded bg-black/40 px-1 py-0.5 font-mono text-[10px] text-[#b7a9e8]">
                        ollama pull llama3.2
                      </code>
                      . Webora connects to the endpoint above and streams responses when available.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="API base URL" hint="Must expose /chat/completions.">
                        <Input
                          value={settings.ai.apiBaseUrl}
                          onChange={(e) => updateSettings({ ai: { apiBaseUrl: e.target.value } })}
                          placeholder="https://api.openai.com/v1"
                        />
                      </Field>
                      <Field label="Model name">
                        <Input
                          value={settings.ai.apiModel}
                          onChange={(e) => updateSettings({ ai: { apiModel: e.target.value } })}
                          placeholder="gpt-4o-mini"
                        />
                      </Field>
                    </div>

                    <Field
                      label="API key"
                      hint="Stored with Windows DPAPI through Electron safeStorage. Never written into generated sites."
                      action={
                        apiKey ? (
                          <span className="flex items-center gap-1 text-[9.5px] font-medium uppercase tracking-wider text-emerald-400">
                            <Check size={10} /> key stored
                          </span>
                        ) : null
                      }
                    >
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={showKey ? 'text' : 'password'}
                            value={keyDraft}
                            onChange={(e) => setKeyDraft(e.target.value)}
                            placeholder="sk-…"
                            className="pr-9 font-mono text-[12px]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowKey((v) => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6b6b84] transition hover:text-white"
                            aria-label={showKey ? 'Hide API key' : 'Show API key'}
                          >
                            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                        <Button
                          variant="secondary"
                          icon={Save}
                          onClick={() => void saveApiKey(keyDraft.trim())}
                          disabled={keyDraft === apiKey}
                        >
                          Save key
                        </Button>
                      </div>
                    </Field>

                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: 'OpenAI', url: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
                        { label: 'Groq', url: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
                        { label: 'OpenRouter', url: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini' },
                        { label: 'LM Studio', url: 'http://127.0.0.1:1234/v1', model: 'local-model' },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() =>
                            updateSettings({ ai: { apiBaseUrl: preset.url, apiModel: preset.model } })
                          }
                          className="rounded-md border border-white/[0.08] bg-white/[0.025] px-2 py-1 text-[10px] font-medium text-[#8b8ba4] transition hover:border-accent/30 hover:text-white"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={providersBusy ? undefined : AlertCircle}
                    loading={!!providersBusy}
                    onClick={() => (settings.ai.provider === 'ollama' ? testOllama() : testOpenAI())}
                  >
                    Test connection
                  </Button>
                  {providerStatus ? (
                    <span
                      className={cn(
                        'flex items-center gap-1.5 text-[10.5px]',
                        providerStatus.ok ? 'text-emerald-300' : 'text-red-300'
                      )}
                    >
                      {providerStatus.ok ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                      {providerStatus.message}
                    </span>
                  ) : (
                    <span className="text-[10.5px] text-[#5f5f78]">No connection test has been run yet.</span>
                  )}
                </div>
              </SettingsCard>

              <SettingsCard title="Generation settings" subtitle="Applied to website generation and AI edits.">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#70708a]">
                        Temperature
                      </label>
                      <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-[#c2b5ef]">
                        {settings.ai.temperature.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1.5"
                      step="0.05"
                      value={settings.ai.temperature}
                      onChange={(e) => updateSettings({ ai: { temperature: Number(e.target.value) } })}
                      className="w-full"
                    />
                    <p className="mt-1.5 text-[10.5px] leading-relaxed text-[#5f5f78]">
                      Lower is more predictable. 0.6–0.8 works well for design generation.
                    </p>
                  </div>
                  <Field label="Maximum tokens" hint="Upper bound for a single AI response.">
                    <Input
                      type="number"
                      min={256}
                      max={32768}
                      step={256}
                      value={settings.ai.maxTokens}
                      onChange={(e) =>
                        updateSettings({ ai: { maxTokens: Math.max(256, Number(e.target.value) || 256) } })
                      }
                    />
                  </Field>
                </div>
              </SettingsCard>
            </>
          ) : null}

          {section === 'editor' ? (
            <>
              <SettingsCard title="Canvas" subtitle="Defaults for the visual editor.">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[13px] font-medium text-[#e2e2ef]">Default viewport</div>
                    <p className="mt-0.5 text-[11.5px] text-[#71718a]">Used when opening any project.</p>
                  </div>
                  <Segmented<Breakpoint>
                    value={settings.defaultViewport}
                    onChange={(value) => updateSettings({ defaultViewport: value })}
                    options={[
                      { value: 'desktop', label: 'Desktop', icon: Monitor },
                      { value: 'tablet', label: 'Tablet', icon: Tablet },
                      { value: 'mobile', label: 'Mobile', icon: Smartphone },
                    ]}
                  />
                </div>
                <Divider />
                <Toggle
                  checked={settings.showGrid}
                  onChange={(value) => updateSettings({ showGrid: value })}
                  label="Show alignment grid"
                  description="Overlay a snapping grid on the editor canvas."
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Grid size (px)" hint="Grid spacing in canvas pixels.">
                    <Input
                      type="number"
                      min={4}
                      max={64}
                      step={2}
                      value={settings.gridSize}
                      onChange={(e) =>
                        updateSettings({ gridSize: Math.max(4, Number(e.target.value) || 8) })
                      }
                      disabled={!settings.showGrid}
                    />
                  </Field>
                  <div className="flex items-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        updateSettings({
                          defaultViewport: DEFAULT_SETTINGS.defaultViewport,
                          showGrid: DEFAULT_SETTINGS.showGrid,
                          gridSize: DEFAULT_SETTINGS.gridSize,
                        })
                      }
                    >
                      Reset editor defaults
                    </Button>
                  </div>
                </div>
              </SettingsCard>

              <SettingsCard title="Keyboard shortcuts" subtitle="Active inside the website editor.">
                <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
                  {[
                    ['Undo', 'Ctrl + Z'],
                    ['Redo', 'Ctrl + Y'],
                    ['Duplicate element', 'Ctrl + D'],
                    ['Copy element', 'Ctrl + C'],
                    ['Paste element', 'Ctrl + V'],
                    ['Delete element', 'Delete'],
                    ['Save project', 'Ctrl + S'],
                    ['Deselect / close', 'Escape'],
                    ['Move element up', 'Alt + ↑'],
                    ['Move element down', 'Alt + ↓'],
                  ].map(([action, keys]) => (
                    <div key={action} className="flex items-center justify-between border-b border-white/[0.04] py-1.5">
                      <span className="text-[11.5px] text-[#9a9ab2]">{action}</span>
                      <span className="kbd">{keys}</span>
                    </div>
                  ))}
                </div>
              </SettingsCard>
            </>
          ) : null}

          {section === 'storage' ? (
            <>
              <SettingsCard title="Local storage" subtitle="Webora never uploads your projects or assets.">
                <div className="grid gap-3 sm:grid-cols-3">
                  <StatBox label="Projects" value={String(projects.filter((project) => !project.trashedAt).length)} />
                  <StatBox
                    label="Assets"
                    value={String(
                      projects
                        .filter((project) => !project.trashedAt)
                        .reduce((acc, project) => acc + project.assets.length, 0)
                    )}
                  />
                  <StatBox label="Project data" value={formatBytes(dataSize)} />
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#66667f]">
                        Data folder
                      </div>
                      <div className="mt-1 truncate font-mono text-[10.5px] text-[#b3a9d6]">
                        {appInfo?.userData ? `${appInfo.userData}\\webora-data` : 'Unavailable in this environment'}
                      </div>
                    </div>
                    {bridge.isDesktop ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={FolderOpen}
                        onClick={async () => {
                          if (!appInfo?.userData) return;
                          try {
                            await bridge.openPath(`${appInfo.userData}\\webora-data`);
                          } catch {
                            toast('Could not open the data folder', 'error');
                          }
                        }}
                      >
                        Open folder
                      </Button>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-[#68687f]">
                    <span className="chip">
                      <Database size={10} /> projects.json
                    </span>
                    <span className="chip">
                      <ShieldCheck size={10} /> secrets.bin · OS encrypted
                    </span>
                    <span className="chip">
                      <HardDrive size={10} /> settings.json
                    </span>
                  </div>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 text-[10.5px] leading-relaxed text-[#73738c]">
                  Projects autosave as you edit. Crash-safe writes use a temporary file and atomic rename. Assets are
                  embedded in project data so backups are self-contained.
                </div>
              </SettingsCard>

              <SettingsCard title="Backups" subtitle="Move your workspace between computers.">
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" icon={Save} onClick={exportBackup} loading={backupBusy}>
                    Export all projects
                  </Button>
                  <input
                    ref={backupInput}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(e) => importBackup(e.target.files)}
                  />
                  <Button variant="ghost" icon={Upload} onClick={() => backupInput.current?.click()}>
                    Import backup
                  </Button>
                </div>
                <p className="text-[10.5px] leading-relaxed text-[#5f5f78]">
                  Backup files contain every project, page, element and embedded asset as JSON. API keys are never
                  included.
                </p>
              </SettingsCard>

              <SettingsCard
                title="Automatic recovery"
                subtitle="Recover a project that disappeared, without needing an exported file."
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    icon={ArchiveRestore}
                    onClick={checkAutomaticBackup}
                    loading={recoveryBusy === 'check'}
                    disabled={!!recoveryBusy}
                  >
                    Check for a snapshot
                  </Button>
                  {recovery ? (
                    <Button
                      variant="primary"
                      icon={RotateCcw}
                      onClick={restoreAutomaticBackup}
                      loading={recoveryBusy === 'restore'}
                      disabled={!!recoveryBusy}
                    >
                      Restore {recovery.projects.length} project{recovery.projects.length === 1 ? '' : 's'}
                    </Button>
                  ) : null}
                </div>
                <p className="text-[10.5px] leading-relaxed text-[#5f5f78]">
                  Before every save Webora keeps the previous project file, a copy from the start of this session, and
                  up to ten daily snapshots. Restoring adds projects to My Projects and never overwrites current work;
                  if a project already exists it is restored as a clearly named copy.
                </p>
                {recovery ? (
                  <div className="flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] px-3 py-2.5 text-[10.5px] leading-relaxed text-emerald-200/90">
                    <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
                    <span>
                      Newest snapshot <span className="font-mono text-[10px]">{recovery.name}</span> ·{' '}
                      {recovery.projects.length} project{recovery.projects.length === 1 ? '' : 's'} ·{' '}
                      {formatBytes(new Blob([JSON.stringify(recovery.projects)]).size)}
                    </span>
                  </div>
                ) : recoveryChecked ? (
                  <div className="flex items-start gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-[10.5px] leading-relaxed text-[#77778f]">
                    <Info size={13} className="mt-0.5 shrink-0" />
                    <span>No usable snapshot yet. One is written the next time the workspace saves.</span>
                  </div>
                ) : null}
              </SettingsCard>

              <SettingsCard title="Application info" subtitle="Runtime details for this installation.">
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    ['Webora version', appInfo?.version ?? '1.2.0'],
                    ['Electron', appInfo?.electron ?? '—'],
                    ['Platform', appInfo?.platform ?? '—'],
                    ['Runtime', 'Local desktop (offline capable)'],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2 text-[11px]"
                    >
                      <span className="text-[#6d6d86]">{label}</span>
                      <span className="font-mono text-[10.5px] text-[#c3bbdf]">{value}</span>
                    </div>
                  ))}
                </div>
              </SettingsCard>
            </>
          ) : null}

          {section === 'about' ? (
            <div className="panel overflow-hidden">
              <div className="relative border-b border-white/[0.06] bg-[radial-gradient(120%_140%_at_20%_0%,rgba(124,92,255,0.18),transparent_55%)] px-6 py-8">
                <div className="flex items-start gap-4">
                  <WeboraMarkLarge />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-[22px] font-bold tracking-tight text-white">Webora</h2>
                      <span className="rounded-md border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[9.5px] font-semibold text-[#a9a9c0]">
                        v{appInfo?.version ?? '1.2.0'}
                      </span>
                    </div>
                    <p className="mt-1.5 max-w-lg text-[12px] leading-relaxed text-[#8f8fa9]">
                      A desktop AI website builder that combines structured AI generation, a visual canvas, a code
                      studio and a real export pipeline. No account, no subscription, no mandatory cloud.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="chip">
                        <Check size={10} className="text-emerald-400" /> Offline visual editor
                      </span>
                      <span className="chip">
                        <ShieldCheck size={10} className="text-emerald-400" /> Local-first
                      </span>
                      <span className="chip">Windows 10 / 11 · x64</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-5 px-6 py-5">
                <div>
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#66667f]">
                    Built with
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[
                      'Electron',
                      'React',
                      'TypeScript',
                      'Vite',
                      'Tailwind CSS',
                      'Zustand',
                      'Monaco Editor',
                      'JSZip',
                      'Lucide',
                    ].map((item) => (
                      <span
                        key={item}
                        className="rounded-md border border-white/[0.07] bg-white/[0.025] px-2 py-1 text-[10.5px] text-[#9a9ab2]"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#66667f]">
                    Open-source licences
                  </h3>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-[#71718a]">
                    Webora bundles third-party libraries under their respective licences, including MIT (React,
                    Zustand, Lucide, JSZip, Vite, Tailwind CSS), MIT (Electron), and MIT (Monaco Editor). Full licence
                    texts ship with each dependency and are available in the application resources.
                  </p>
                </div>
                <div>
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#66667f]">Credits</h3>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-[#71718a]">
                    Design and engineering by the Webora team. AI generation uses the provider you configure — local
                    Ollama models or any OpenAI-compatible endpoint. Webora does not include or resell model access.
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-[12.5px] font-semibold text-white">Application updates</div>
                      <div className="mt-0.5 text-[10.5px] text-[#68687f]">
                        Installed v{appInfo?.version ?? '1.2.0'} · checked automatically on launch
                      </div>
                    </div>
                    <span className="chip">No telemetry</span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <Field label="Release channel" hint="Stable receives finished releases. Beta may include early builds.">
                      <Select
                        value={settings.updateChannel}
                        onChange={(e) => updateSettings({ updateChannel: e.target.value })}
                        className="w-[170px]"
                      >
                        <option value="stable">Stable</option>
                        <option value="beta">Beta</option>
                      </Select>
                    </Field>
                    <Button
                      variant="secondary"
                      icon={RefreshCw}
                      onClick={() => void checkForUpdates()}
                      loading={updateBusy === 'check'}
                    >
                      Check for updates
                    </Button>
                    {updateInfo?.available && !installerPath ? (
                      <Button
                        variant="primary"
                        icon={Download}
                        onClick={() => void downloadUpdate()}
                        loading={updateBusy === 'download'}
                      >
                        Download v{updateInfo.version}
                      </Button>
                    ) : null}
                    {installerPath ? (
                      <Button
                        variant="primary"
                        icon={Download}
                        onClick={() => void installUpdate()}
                        loading={updateBusy === 'install'}
                      >
                        Install and restart
                      </Button>
                    ) : null}
                  </div>

                  {updateError ? (
                    <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-[10.5px] leading-relaxed text-red-200/80">
                      {updateError}
                    </div>
                  ) : null}

                  {updateInfo && !updateInfo.available ? (
                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2 text-[10.5px] text-emerald-200/80">
                      <CheckCircle2 size={12} />
                      You are on the latest version · v{updateInfo.currentVersion}
                    </div>
                  ) : null}

                  {updateInfo?.available ? (
                    <div className="mt-3 rounded-lg border border-accent/25 bg-accent/[0.06] px-3 py-2.5">
                      <div className="text-[11.5px] font-semibold text-[#d8ccff]">
                        Version {updateInfo.version} is available
                        {updateInfo.publishedAt ? ` · ${updateInfo.publishedAt}` : ''}
                      </div>
                      {updateInfo.notes ? (
                        <p className="mt-1 whitespace-pre-wrap text-[10.5px] leading-relaxed text-[#a9a1c4]">
                          {updateInfo.notes}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {installerPath ? (
                    <div className="mt-3 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[10.5px] leading-relaxed text-[#8b8ba4]">
                      Installer downloaded. Choosing “Install and restart” closes Webora and runs the installer
                      silently. Your projects stay in the local data folder.
                      <div className="mt-1 truncate font-mono text-[9.5px] text-[#5f5f78]">{installerPath}</div>
                    </div>
                  ) : null}

                  <p className="mt-3 text-[10px] leading-relaxed text-[#5f5f78]">
                    No feed URL is needed. Webora checks its release service in the background and only asks when a
                    newer version exists. Portable builds are not updated in place — run the newer portable executable
                    instead.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SettingsCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-white/[0.06] px-5 py-4">
        <h2 className="font-display text-[14px] font-semibold tracking-tight text-white">{title}</h2>
        <p className="mt-0.5 text-[11px] text-[#6d6d86]">{subtitle}</p>
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

function Divider() {
  return <div className="h-px w-full bg-white/[0.06]" />;
}

function ProviderCard({
  active,
  icon: Icon,
  name,
  description,
  tag,
  onClick,
}: {
  active: boolean;
  icon: typeof Cpu;
  name: string;
  description: string;
  tag: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex items-start gap-3 rounded-xl border p-3.5 text-left transition',
        active
          ? 'border-accent/50 bg-accent/[0.07] ring-1 ring-accent/20'
          : 'border-white/[0.07] bg-white/[0.02] hover:border-white/15'
      )}
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          active ? 'bg-accent/20 text-accent-soft' : 'bg-white/[0.05] text-[#8b8ba4]'
        )}
      >
        <Icon size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="text-[12px] font-semibold text-white">{name}</span>
          <span className="rounded border border-white/10 px-1 py-0.5 text-[8px] font-semibold tracking-wider text-[#77778f]">
            {tag}
          </span>
        </span>
        <span className="mt-0.5 block text-[10.5px] leading-relaxed text-[#71718a]">{description}</span>
      </span>
      <span
        className={cn(
          'mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
          active ? 'border-accent bg-accent text-white' : 'border-white/20'
        )}
      >
        {active ? <Check size={9} /> : null}
      </span>
    </button>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
      <div className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[#5f5f78]">{label}</div>
      <div className="mt-1 font-display text-[20px] font-semibold text-white">{value}</div>
    </div>
  );
}

function WeboraMarkLarge() {
  return (
    <div className="relative">
      <div className="absolute inset-0 rounded-2xl bg-accent/40 blur-xl" />
      <svg width="56" height="56" viewBox="0 0 48 48" className="relative">
        <defs>
          <linearGradient id="about-mark" x1="2" y1="2" x2="46" y2="46" gradientUnits="userSpaceOnUse">
            <stop stopColor="#a78bfa" />
            <stop offset="0.52" stopColor="#7c5cff" />
            <stop offset="1" stopColor="#5b3ae6" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="46" height="46" rx="13" fill="url(#about-mark)" />
        <path
          d="M11.5 16.5 17.6 33h4.9l2-6.4 2 6.4h4.9l6.1-16.5h-5.2l-3.6 10.9-1.7-5.6h-5l-1.7 5.6-3.6-10.9h-5.2Z"
          fill="#fff"
        />
      </svg>
    </div>
  );
}
