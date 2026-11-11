# Webora

A Windows desktop AI website builder. Describe a site, get a structured multi-page project, then edit it visually, write custom code, preview it interactively, and export a standalone ZIP that runs on any static host.

Built with Electron 33, React 18, TypeScript, Vite, Tailwind, Zustand, Monaco and JSZip.

---

## What's new in 1.2

- **AI Studio sessions.** Every website gets its own chat with a persistent history rail. Rename or delete chats, reload the app without losing them, and keep editing the same draft on follow-up prompts. Drafts stay in AI Studio until **Open in editor** adds them to My Projects.
- **Site-aware editor AI.** The editor assistant reads the whole website — pages, real element IDs and current copy — and changes it through document operations. It can add or delete pages, sections and elements, rewrite copy, restyle, add video, Gmail/mail buttons and working forms. Chat history is saved per project.
- **AI output is repaired, not rejected.** Providers are asked for JSON mode, then responses are parsed tolerantly: markdown fences, prose wrappers, trailing commas and truncated tails are repaired. Generation retries up to 3 times and edits up to 2 before showing a recoverable error with the raw model output.
- **Nothing silently replaces a project.** AI edits apply to the current document rather than swapping the whole project. Missing pages or elements are normalised instead of dropping the project, and every overwrite keeps a snapshot first.
- **Automatic recovery.** Before each save Webora keeps the previous project file, a session-start copy and up to ten daily snapshots. Settings → Storage → **Check for a snapshot** restores whatever disappeared. Restores merge into My Projects and never overwrite current work; a name or ID collision becomes a clearly named `(recovered)` copy.
- **Automatic updates.** Webora checks GitHub Releases on launch and shows an in-app banner with release notes and **Update and restart**. No feed URL needs to be entered. Settings → About still offers a manual check and shows the channel.
- **Modal renderer fixed.** Modal elements now use their dedicated canvas renderer instead of falling through to a plain container.

---

## Install and run

### Option A — Installer

Download `Webora Setup 1.2.0.exe` from the [v1.2.0 release](https://github.com/ecn1/webora/releases/tag/v1.2.0) and run it. The NSIS installer lets you choose the install folder and creates Desktop and Start Menu shortcuts.

### Option B — Portable

Download `Webora 1.2.0.exe` from the same release and run it. No installation; it unpacks to a temporary folder and launches. Projects are still stored in `%APPDATA%\webora\webora-data`, so they persist between runs.

Both binaries are unsigned, so Windows SmartScreen may show a warning. Choose **More info → Run anyway**. SHA-256 checksums are in the release notes and `DEVELOPMENT_LOG.md`; verify with `Get-FileHash <file> -Algorithm SHA256`.

**Requirements:** Windows 10 or 11, x64. No runtime installs required — Electron and Node are bundled.

---

## What is in the app

| Area | What it does |
| --- | --- |
| Dashboard | Recent projects, workspace stats, quick entry points. |
| My Projects | Create, open, duplicate, rename, sort, import and move projects to Trash. |
| Templates | 8 real editable starter projects: SaaS, Gaming, Business, Portfolio, Agency, Tech, Blog, E-Commerce. |
| AI Studio | Chat sessions that each own one draft site. Generate a first version, then keep editing the same site with follow-ups; open the result in the editor when ready. |
| Assets | Aggregated library across projects: import images/video/fonts, filter by project or type, insert into the open page. |
| Forms | Every captured response with form title, respondent, email, answers and timestamp. CSV export. |
| Trash | Restore deleted projects or remove them permanently. |
| Settings | AI provider, autosave, editor defaults, JSON backup/restore, automatic recovery, automatic updates, version info. |
| Editor | Visual canvas, layers, pages, assets, properties inspector, AI assistant, Code Studio, interactive preview and export. |

### Editor

- 36 element types: sections, containers, flex, grid, columns, cards, headings, paragraphs, text, buttons, links, dividers, spacers, images, video, icons, galleries, navbars, footers, breadcrumbs, form fields, submit, accordion, tabs, modal, slider, progress, form, mail, custom HTML and custom CSS.
- Drag from the element library onto the canvas, or click to append. Reorder by drag in the Layers panel.
- Click to select, double-click text to edit inline. All changes commit to the document model.
- Properties inspector with Design / Content / Advanced tabs. Base, Tablet and Mobile style buckets with inheritance, plus hover styles.
- Canvas device widths: desktop 1280 px fit-scaled, tablet 834 px, mobile 390 px.
- Pages panel: add, rename, duplicate, delete, set home page. Each page exports to its own HTML file.
- 60-step undo/redo with typed-field coalescing. Autosave (configurable) plus explicit Ctrl+S.
- Keyboard shortcuts: Ctrl+Z undo, Ctrl+Shift+Z or Ctrl+Y redo, Ctrl+S save, Ctrl+K AI assistant, Ctrl+C/V copy and paste element, Ctrl+D duplicate, Delete/Backspace remove, Alt+↑/↓ reorder, Escape deselect.

### AI Studio and AI editing

AI Studio treats each chat as one website:

- The history rail stores every session with its messages and draft project. Sessions survive app restarts and can be renamed or deleted.
- The first prompt generates a full multi-page draft. Follow-ups send the current site outline (real page and element IDs) and apply document operations to that same draft instead of generating a new site.
- The draft stays in AI Studio until **Open in editor**. Opening it once adds it to My Projects; later edits in the same chat continue to update that project.
- The preview has page tabs and a live iframe, so page additions and edits are visible before opening the editor.

The editor's AI assistant works the same way on the open project:

- It reads every page, the selected page or element, and an ID-rich outline so the model can target real nodes.
- It supports page create/rename/delete, element create/delete/move/replace, copy and style changes, video, forms, mail buttons and navigation.
- Proposed operations are listed before they are applied. **Apply** commits them to the document and they become normal undoable edits.
- `Project.aiChat` persists the conversation per project, so reopening the editor restores the chat.

Both surfaces tolerate imperfect model output. A JSON-mode request is attempted first; responses may arrive fenced, padded with prose, contain trailing commas or be cut off at the token limit. The parser extracts and repairs the JSON, normalises aliases and loose element shapes, then retries. A genuine failure shows the provider error and raw model output instead of discarding the project.

### Interactive elements

| Element | Behaviour |
| --- | --- |
| Button / Link | Internal paths switch pages in preview; `https`, `mailto` and `tel` open externally. |
| Tabs | Switch pages, jump to sections, open URLs, or reveal a panel. Keyboard accessible. |
| Slider | Live value readout; value is included in form submissions. |
| Modal | Opens from a trigger or on load; closes with button, backdrop or Escape; focus returns to the trigger. |
| Progress | Fixed percentage, or live form-completion mode that fills and resets with the form. |
| Video | YouTube and Vimeo URLs render real players; direct video files render a native player. |
| Icon | Built-in SVG glyphs or a custom PNG/SVG image from the project assets. |
| Mail | Recipient, subject, body and optional image; opens Gmail compose or the default mail client. |
| Submit | Any combination of: save to Forms (preview), send email, POST to a webhook, open a link. |
| Form | Validation, success message, progress tracking, and response capture. |

### Preview and export

Preview renders the real generated HTML in a sandboxed iframe with desktop/tablet/mobile widths, page switching, reload, copy HTML, open in a separate window, and Save HTML.

- Internal navigation and interactive elements execute inside the preview.
- Form submissions post to the desktop app and appear in **Forms**.
- The preview iframe includes `allow-same-origin` so YouTube/Vimeo players can initialise. Only your own generated site runs there; exported pages do not include this wrapper.
- YouTube and Vimeo requests are sent with a `https://github.com/ecn1/webora` referer by the desktop shell to avoid embed error 153 from `file://` origins.

Export produces a ZIP:

```
index.html            Home page
page-2.html           Additional pages (path-derived names)
css/style.css         All element styles, hover, media queries, custom CSS
js/script.js          Base interactions or your custom global JS
assets/...            Embedded assets, renamed and rewritten (optional)
project.json          Full editable document for re-import (optional)
README.txt            Plain-text export note
```

Options: include assets, include `project.json`, minify CSS/HTML. `project.json` can be imported back through **My Projects → Import**.

Exported forms have no Webora backend. Without an email or webhook action they save responses in the visitor's browser (`localStorage`) and say so in the success message. Add an email address or webhook URL in the form settings for real delivery.

### Updates

Webora checks for updates automatically about 3.5 seconds after launch. No feed URL needs to be configured. When a newer version is found, an in-app banner shows the version, publish date and release notes, with **Update and restart** and **Later**. Settings → About also has **Check for updates** and the stable/beta channel selector.

Releases are read from GitHub:

- Stable: `https://api.github.com/repos/ecn1/webora/releases/latest`
- Beta: `https://api.github.com/repos/ecn1/webora/releases` (newest non-draft release, including prereleases)

The updater picks the release's Windows `.exe` asset, preferring a name containing `Setup` or `Install`. Only published, non-draft releases are considered, and stable never offers a prerelease. If GitHub is unreachable or no release exists yet, the automatic check fails silently and the manual check reports the reason.

Custom JSON feed shapes are still accepted through overrides:

```json
{ "version": "1.2.1", "notes": "What changed", "downloadUrl": "https://example.com/Webora-Setup-1.2.1.exe" }
```

```json
{ "channels": { "stable": { "version": "1.2.1", "downloadUrl": "https://..." }, "beta": { "version": "1.3.0-beta.1", "downloadUrl": "https://..." } } }
```

`latest` and `releases[]` objects are also accepted. Relative `downloadUrl` values resolve against the feed URL.

For local testing, set `WEBORA_UPDATE_FEED` to one or more comma-separated feed URLs before launching the app. A stored `settings.updateFeedUrl` value takes the same precedence and still wins over GitHub Releases. Downloaded installers go to `%LOCALAPPDATA%\Temp\webora-updates`; **Update and restart** runs the installer silently and quits Webora. Portable builds are not updated in place — run the newer portable executable instead.

Binaries are unsigned, so only install a release whose source and checksums you trust.

---

## Data locations

| Data | Path |
| --- | --- |
| Projects (including Trash, form responses and editor AI chat) | `%APPDATA%\webora\webora-data\projects.json` |
| AI Studio sessions and drafts | `%APPDATA%\webora\webora-data\ai-sessions.json` |
| Automatic recovery snapshots | `%APPDATA%\webora\webora-data\backups\` |
| Settings | `%APPDATA%\webora\webora-data\settings.json` |
| Encrypted API key | `%APPDATA%\webora\webora-data\secrets.bin` |
| Downloaded updates | `%LOCALAPPDATA%\Temp\webora-updates` |
| Electron caches | `%APPDATA%\webora\*` |

Deleting `%APPDATA%\webora\webora-data` resets the app to a fresh workspace. Settings → Storage also offers JSON backup export/import and automatic recovery.

The `backups` folder holds `projects-prev.json` (written before every save), `projects-session.json` (the file at the start of the current app session) and up to ten `projects-YYYY-MM-DD.json` daily snapshots.

Browser dev mode uses `localStorage` instead.

---

## Develop from source

```bash
cd webora
npm install
npm run dev        # Vite + Electron with hot reload
npm run build      # type-check + production renderer build
npm run dist       # build and package NSIS installer + portable
```

Outputs go to `release/`.

> `npm run dev` starts the desktop app through `vite-plugin-electron`. Opening the Vite URL in a normal browser runs a reduced web fallback (localStorage, no encrypted keys, no native dialogs).

### Local test tools

```bash
node scripts/mock-ai.mjs     # OpenAI-compatible mock on http://127.0.0.1:5199/v1
node scripts/cdp-check.mjs   # inspect a running app via CDP (CDP_PORT env, CAPTURE=1)

# Repeatable checks: 44 codegen/runtime + 6 AI pipeline assertions
npm run check
npm run check:core
npm run check:ai

# Seed a disposable Verification Site fixture (replaces projects.json)
npx esbuild scripts/seed-verification.ts --bundle --platform=node --format=esm --packages=external --outfile=scripts/.seed-verification.mjs
node scripts/.seed-verification.mjs --confirm
```

`mock-ai.mjs` returns a fixed multi-page document and, for edit prompts, a fixed set of page/video/form/mail/copy operations. It exists to test streaming, parsing, validation and UI wiring without spending provider credits. `scripts/ai.e2e.check.ts` starts the mock itself and exercises generation, a page addition, a video edit, copy/style edits and a form/mail fallback against real project IDs.

To inspect a packaged build:

```bash
"release/win-unpacked/Webora.exe" --remote-debugging-port=9222
$env:CDP_PORT="9222"; node scripts/cdp-check.mjs
```

---

## Known limitations

- Windows x64 only. No macOS/Linux build.
- No accounts, cloud sync or hosting. Everything is local.
- AI quality depends entirely on the selected model; small local models produce weaker layouts. Malformed JSON is repaired and retried, but a model that cannot follow the operation format still produces a recoverable error rather than a broken site.
- Generation is capped at 8 pages and 80 edit operations per request.
- The interface is English-only and dark-only.
- Custom HTML does not execute in the editing canvas by design; check it in Preview.
- `project.json` includes embedded asset data URLs, so exports with large images grow quickly.
- Monaco adds roughly 3.9 MB to the renderer bundle; first Code Studio open can take a moment.
- Installer and portable builds are unsigned. Update installs require an installer you trust.
- Update checks need `api.github.com`. Offline launches fail silently; the manual check reports the network or GitHub API error, including rate limits.
- Third-party video embeds need internet access and may be blocked by region, network policy or the video owner. The app-side sandbox/referer issues are fixed, but playback itself cannot be guaranteed.
- Exported forms need an email or webhook action to deliver responses off the visitor's machine.
- AI was validated against the local mock provider only; no live Ollama or OpenAI model was available for this release pass. `npx tsc --noEmit`, `npm run check` and `npm run build` are the repeatable gates; the full 1.2 verification pass is recorded in `DEVELOPMENT_LOG.md`.

---

## License

MIT.
