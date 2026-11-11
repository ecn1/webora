# Webora — Development Log

Windows desktop AI website builder. This log records what was built, what broke, how it was tested, and what remains unverified.

Project root: `webora/`
Target: Windows 10/11 x64
Current release: 1.2.0

---

## 2026-11-09 — Foundation

**Built**

- Electron 33 + React 18 + TypeScript + Vite 5 scaffold with `vite-plugin-electron`.
- Design tokens and dark UI shell: sidebar, dashboard, page headers, panels, modals, toasts, buttons, fields, segmented controls, empty states.
- Document model (`Project → Page → WebElement`) as the single source of truth. Elements carry `style`, `hover`, `responsive.tablet`, `responsive.mobile`, `props`, `children`.
- Document engine: element factory, tree traversal, insert/move/delete/duplicate, style writes per breakpoint, page operations, project shape migration.
- Code generator: HTML per page, CSS with hover and 900 px / 600 px media queries, base JS, asset URL rewriting, export file list.
- Zustand store with 60-step undo/redo, coalescing for typed edits, autosave, project CRUD, settings, toasts.
- Electron main process: hardened window, JSON storage in `userData/webora-data`, `safeStorage` secret vault, asset picker, save dialogs, app info, Ollama model listing, streaming AI over IPC.
- Preload bridge with a typed API; browser fallback for development.
- 8 templates: SaaS Landing, Gaming Portal, Business Pro, Portfolio Dark, Creative Agency, Tech Innovation, Personal Blog, E-Commerce.

**Decisions**

- Custom code is stored per page (`Page.custom.html/css/js`), not globally, so a Code Studio override on one page cannot freeze every page.
- Canvas is a React renderer; preview and export use `codegen.ts`. Keeping them separate avoids iframe dependency in the editor.
- Custom HTML renders as a labeled placeholder in the canvas and only executes in sandboxed preview/export.

---

## 2026-11-10 — Editor, AI, packaging

### Bugs found and fixed

1. **Canvas mounted but nothing was selectable.**
   `ElementView` consumed a canvas context that was never provided. Added `CanvasContext.Provider` around the rendered tree; selection, hover outlines and drop targets began working.

2. **Packaged app launched with no preload bridge.**
   The renderer expected `dist-electron/preload.js`, but the first packaging pass did not emit that exact file. Standardized the preload entry/output to `preload.js` and confirmed `window.webora` is present in `win-unpacked`, portable and installed builds.

3. **Dashboard thumbnails logged sandbox script errors.**
   `SiteThumb` rendered generated HTML with inline `<script>` inside `sandbox=""`, producing “Blocked script execution” errors on every card. The thumbnail now strips script tags before assigning `srcDoc`. Scripts still run in the real preview, which uses a sandbox with `allow-scripts`.

4. **Project name from the New Website dialog could be lost.**
   Template creation replaced the current project after the name was applied. The dialog now renames the project after template creation completes; verified with “Naming Check”.

5. **AI Studio showed stages but no live output.**
   Added a streaming panel that displays model output as it arrives, with a character counter and a note that nothing is applied until validation. Wired `onDelta` through the Electron stream, browser fallback and the generation pipeline.

6. **AI assistant edits targeted the wrong element in tests.**
   The mock provider grabbed the first `"id"` in the prompt (a page ID) instead of the selected element. The test provider now parses the `Selected element JSON` block. This was a harness defect, not an app defect; operation application itself was already correct.

7. **Favicon missing in the packaged app.**
   Added `public/favicon.svg` from the brand mark and linked it from `index.html`. Vite emits a relative path, so it resolves under `file://`.

8. **App icon was the default Electron icon.**
   Rendered the Webora mark to `build/icon.png` at 512×512 with transparent corners (verified 32-bit ARGB, corner alpha 0). electron-builder uses it for the installer, shortcuts and executable.

### Test infrastructure

- `scripts/mock-ai.mjs` — OpenAI-compatible server on `127.0.0.1:5199`. Returns a 2-page/23-element document as JSON or SSE chunks, and returns edit operations when the prompt matches the assistant contract.
- `scripts/cdp-check.mjs` — connects to a running packaged app over the Chrome DevTools Protocol and reports bridge type, app info, project count, body text and window size. Supports `CDP_PORT` and optional screenshot capture.
- Ad-hoc CDP/browser scripts used during the session for generation, Code Studio, pages, breakpoints and cleanup.

### Verification

**Static**

- `npx tsc --noEmit` — passes.
- `npm run build` — passes; renderer, main and preload bundles produced.
- `npm run dist` — passes; NSIS installer and portable executable produced.

**Browser smoke tests (Vite, `localhost:4179`)**

| Area | Check | Result |
| --- | --- | --- |
| Projects | Create from template with custom name | Pass — title “Naming Check” |
| Canvas | Click select, inspector shows element | Pass — `HEADING`, element ID, design tabs |
| Canvas | Double-click inline edit, blur commit | Pass — text changed on canvas |
| Canvas | Undo after inline edit | Pass — original text restored |
| Properties | Edit Content textarea | Pass — canvas updated, undo restored |
| Layers | Drag Divider from Add panel to canvas | Pass — `<hr>` count 0 → 1 |
| Pages | Add page | Pass — Home + Page 2, empty-state shown |
| Pages | Switch pages | Pass |
| Assets | Import PNG, hover Insert | Pass — `<img>` with data URL |
| Responsive | Set tablet font size 36 px | Pass — desktop 56 px, tablet 36 px, mobile inherits 36 px |
| Code Studio | Monaco loads, CSS tab edit, Save | Pass — “Saved”, override active, CSS present in preview `srcdoc` |
| Code Studio | Per-page persistence | Pass — override stored on `pages[1].custom.css` only |
| Preview | Page switcher, iframe, Save HTML | Pass — `page-2.html` downloaded |
| Export | ZIP download and inspection | Pass — 7 files incl. `assets/webora-dashboard.png`, `project.json`, custom CSS |
| Import | Re-import exported `project.json` | Pass — project appears with 2 pages, 1 asset |
| AI Studio | Generate against mock, stream, open editor | Pass — 2 pages, 23 elements |
| AI Assistant | Propose and apply 2 ops | Pass — content and color changed; undo available |
| Console | Normal app navigation | No app exceptions; only expected sandbox messages before the thumbnail fix |

**Packaged app (CDP)**

`win-unpacked` on port 9222:

- `window.webora` is an object; `isDesktop: true`.
- `appInfo`: version 1.0.0, Electron 33.4.11, userData `C:\Users\Chukwuma\AppData\Roaming\webora`.
- Settings: mock provider saved, key stored, “Test connection” returned the mock document.
- AI Studio: streaming generation completed with 2 pages; opened in editor; title and H1 correct.
- Save: `projects.json` contained the generated project.
- Secrets: `secrets.bin` is not base64 plaintext and does not contain the test key.
- Code Studio: Monaco mounted, no console errors.
- Pages and device widths: desktop 798 px, tablet 822 px, mobile 378 px in the available pane; responsive values applied.
- Restart: project and settings persisted across launch.

Portable on port 9223:

- Bridge and app info present; persisted project count 1; UI rendered from `app.asar`.

NSIS installer:

- Silent install to a temp directory: exit code 0.
- Installed app launched, bridge and persisted project verified on port 9224.
- Silent uninstall: exit code 0. NSIS left the empty install directory behind when run with `/S`; removed manually. Normal interactive uninstall is unaffected.

### Packaging

| Artifact | Size | SHA-256 |
| --- | --- | --- |
| `release/Webora Setup 1.0.0.exe` | 101.29 MB | `2469ACE302FE75AF8B3FDEF61D53F65FBC31494A5A2C8730FC1F280CD88D6204` |
| `release/Webora 1.0.0.exe` | 101.05 MB | `8C2E05973604A670E65C60E16030D9D90E0EC73FEC3A03C4AD7205318C76EFB8` |

Build config: `appId com.webora.app`, NSIS with selectable install directory and shortcuts, portable target, icon `build/icon.png`, files limited to `dist/**/*` and `dist-electron/**/*`.

---

## Unverified / gaps

- **No live provider test.** There were no usable OpenAI credentials and no Ollama models installed (`ollama list` returned no models and the CLI hung). All AI paths were validated against the local mock, which implements the same OpenAI-compatible JSON and SSE contract. Streaming, parsing, validation, error surfacing and IPC were exercised; model output quality was not.
- **No real-world content test.** All projects used templates or the mock document. Very large pages, dozens of pages, and hundreds of assets were not stress-tested.
- **No automated regression suite.** Verification was scripted but ad hoc. `tsc`, `npm run build` and `npm run dist` are the only repeatable gates checked in.
- **Browser fallback is not the shipping target.** It stores keys in `localStorage`; the desktop build uses DPAPI. Do not treat browser mode as security-equivalent.
- **Unsigned binaries.** SmartScreen will warn on first run.
- **Docs are not inside the installer.** electron-builder packages only `dist` and `dist-electron`; `README.md` and this log live in the source folder.
- **Local test residue was removed.** The test project, mock settings and test key were deleted from `%APPDATA%\webora` so the shipped app opens with an empty workspace.

---

## Commands used

```bash
npm install
npx tsc --noEmit
npm run build
npm run dist

node scripts/mock-ai.mjs
"release/win-unpacked/Webora.exe" --remote-debugging-port=9222
$env:CDP_PORT="9222"; node scripts/cdp-check.mjs
```

---

## 2026-11-11 — Webora 1.1: interactive preview, forms, trash, updates

**Built**

- Preview runtime: generated pages post `navigate`, `open-external` and `form-submit` messages to the desktop app with a per-session token. Internal links/buttons/tabs switch pages without exporting; external, `mailto:` and `tel:` links open in the OS.
- Forms workspace: preview submissions are stored on the project with form name, respondent, email, answers and timestamp. Filters, CSV export and response counts.
- New `submit` element with simultaneous actions (Forms capture, email, webhook, open link) and new `mail` element (recipient, subject, body, optional image, Gmail or default client).
- Trash: move to Trash, restore, delete permanently, Empty Trash. Trashed projects stay in `projects.json` until purged.
- Autosave toggle with 0.25/0.5/1/2 s debounce, plus a close-flush handshake so manual saves are not lost on quit.
- Startup splash with mark, rings and progress, shown for a short minimum while projects/settings load.
- Settings → About update checks against a user-hosted JSON feed: version comparison, notes, installer download to `%LOCALAPPDATA%\Temp\webora-updates`, and Install and restart.
- Desktop canvas now renders a true 1280 px layout scaled to fit the pane. Tablet 834 px, mobile 390 px.
- Assets workspace aggregates assets across projects with project/type filters.
- Dashboard/Projects thumbnails sanitize generated HTML: scripts removed, third-party iframes replaced with an "Embedded media" placeholder.
- Video accepts YouTube/Vimeo URLs and direct files; icon accepts custom PNG/SVG uploads; tabs, slider, modal and progress (manual or form-completion) are functional.

**Bugs found and fixed**

1. **Every internal preview link opened Home.**
   `normalizeTarget('/')` collapsed the root to `''`, and `'/about'.endsWith('')` is always true, so the Home page matched every target. Root now stays `'/'`; `resolvePage` compares normalized paths and only allows suffix matching for non-root paths. Verified tab click Home → About and "Back home" About → Home.

2. **YouTube embeds never initialised.**
   The preview iframe sandbox lacked `allow-same-origin`, so YouTube's player threw `SecurityError: Failed to read the 'cookie' property from 'Document'`. Added `allow-same-origin` to the preview sandbox only (it runs the user's own generated site). Player errors stopped; real playback could not be confirmed in this environment.

3. **YouTube error 153 from `file://`.**
   Electron now sends a synthetic referer for YouTube, Vimeo and ytimg requests in the main process. The 1.1 value pointed at the unowned `webora.app`; 1.2 replaced it with `https://github.com/ecn1/webora`.

4. **Mail links rendered `+` instead of spaces.**
   `URLSearchParams` encodes spaces as `+`, which mail clients show literally. `mailComposeUrl` now builds queries with `encodeURIComponent` (`%20`). Verified the Gmail compose URL opened with correct subject/body.

5. **Desktop canvas was far too narrow.**
   The canvas is now a 1280 px layout scaled down with CSS `zoom` (never enlarged), with `min-w-0` on the canvas column and zoom-aware pointer math. Verified an 874 px pane renders a 1280 px frame at 0.625.

6. **Dashboard thumbnails executed embedded pages and scripts.**
   `SiteThumb` strips scripts and replaces iframes with a labeled placeholder.

7. **Closing the window with autosave off dropped edits.**
   The main process asks the renderer to flush pending state and waits for a handshake before quitting. Verified a rename with autosave off persisted after `window.close()`.

**Verification**

| Area | Check | Result |
| --- | --- | --- |
| Preview | Tab click Home → About | Pass — page selector `page_about`, "About preview" |
| Preview | "Back home" link | Pass — returned to `page_home` |
| Preview | External Gmail link | Pass — `open-external` with `%20`-encoded subject/body |
| Forms | Fill, submit, success, clear | Pass — "Thanks — your message was saved!", fields cleared |
| Forms | Desktop capture | Pass — toast "New response saved to Forms · Contact us" |
| Forms | Forms workspace | Pass — Katherine Johnson, email, 4 answers, 3 responses |
| Trash | Duplicate → Trash → list → restore | Pass — counts and toasts correct |
| Trash | Trash again → delete permanently → empty | Pass — project removed, empty state |
| Autosave | 250 ms debounce | Pass — not written at 150 ms, written at ~1050 ms |
| Autosave | Close flush with autosave off | Pass — new name in `projects.json` after close |
| Splash | Launch/reload | Pass — visible ~0.85 s after load, mark and progress present |
| Assets | Workspace listing and filters | Pass — seeded `webora-mark.png`, project/type filters |
| Icon | Add, Content tab, custom upload controls | Pass — built-in grid, Pick button, project assets |
| Updater | Empty feed URL | Pass — clear inline error |
| Updater | Local feed v1.1.1 | Pass — detected, notes shown, installer downloaded, "Install and restart" offered |
| Canvas | Desktop fit scale | Pass — 1280 px at 0.625 zoom in an 874 px pane |
| Preview | Modal layout | Pass — iframe 1374 × 738, no clipping |
| Build | `npx tsc --noEmit` | Pass |
| Build | `npm run build` | Pass |
| Build | `scripts/codegen.check.ts` | Pass — 24/24 |
| Package | `win-unpacked` launch | Pass — v1.1.0, splash, dashboard, clean exit |

**Packaging**

| Artifact | Size | SHA-256 |
| --- | --- | --- |
| `release/Webora Setup 1.1.0.exe` | 101.30 MB | `7534FC3316395426B1B58413762EAAFFE2DAE902631D728A1E037428A60100EC` |
| `release/Webora 1.1.0.exe` | 101.07 MB | `3B9055086FC9B9717888B42567A1C42633902BFF07FF5EBB89041D434F5D991C` |

Build config is unchanged: `appId com.webora.app`, NSIS with selectable install folder and shortcuts, portable target, icon `build/icon.png`, files limited to `dist/**/*` and `dist-electron/**/*`.

**Unverified / gaps**

- **Real YouTube/Vimeo playback is unconfirmed.** After the sandbox fix, the Electron player loads metadata and shows the video title/author but never builds its control UI in this environment. The same embed loaded directly in Playwright Chromium over HTTP showed "This video is unavailable" (likely network/IP restriction). No app-side error remains; referer and sandbox fixes are in place.
- **Update install was not executed.** A local feed and dummy `.exe` verified detection and download; "Install and restart" would run the dummy installer, so it was left unclicked. A real signed installer and feed are required to exercise the full path.
- **Exported forms have no backend.** Without an email or webhook action they store responses in the visitor's browser and say so. Preview capture works only inside the desktop app.
- **AI was validated against the local mock only.** No live Ollama models or OpenAI credentials were available for this pass.
- **Binaries are unsigned.** SmartScreen will warn; update feeds should only point at installers you built and trust.
- The local `%APPDATA%` workspace still contains the disposable Verification Site fixture used for these checks. It is not bundled into the installers.

**Commands used**

```bash
npx tsc --noEmit
npm run build
npm run dist

npx esbuild scripts/codegen.check.ts --bundle --platform=node --format=esm --packages=external --outfile=scripts/.codegen.check.mjs
node scripts/.codegen.check.mjs

"release/win-unpacked/Webora.exe" --remote-debugging-port=9222
```

---

## 2026-11-11 — Webora 1.2: persistent AI sessions, tolerant parsing, recovery, automatic updates

**Built**

- AI Studio rewritten around `AISession` records. Each chat owns its title, transcript and draft `Project`; a session rail supports new, rename, delete and selection. Sessions persist in `ai-sessions.json` and survive reloads.
- First prompt in a session generates a validated multi-page draft. Follow-up prompts send a compact, ID-rich site outline and apply `EditOp`s to the same draft. The draft only enters My Projects when **Open in editor** is used; after that, later chat edits sync to the linked project.
- Page-level operations added: `createPage`, `updatePage`, `deletePage`, plus element and copy/style operations that can target any page by real ID.
- Editor AI assistant rewritten: whole-site context, page and element targeting, preview-and-apply flow, persisted `Project.aiChat`, and support for pages, elements, video, forms, Gmail/mail, navigation and copy.
- `src/lib/ai.ts` now requests provider JSON mode, extracts JSON from fences/prose, repairs trailing commas and truncated tails, normalises document and operation aliases, clamps elements/pages, and retries. Generation makes 3 attempts; edits make 2. Failures surface a recoverable message and raw output.
- `ensureProjectShape` hardened: missing or empty pages synthesise a Home page instead of dropping the project; unknown element types are preserved; `aiChat` is retained.
- Electron main process keeps `projects-prev.json`, `projects-session.json` and up to ten daily snapshots before every project overwrite. `storage:loadProjectsBackup` returns the newest usable snapshot.
- Settings → Storage adds **Automatic recovery**: detect the newest backup and restore it. Restores merge into My Projects, never overwrite existing IDs, and rename collisions to `(recovered)`.
- Automatic update checks read GitHub Releases from `ecn1/webora`. Stable uses `/releases/latest`; beta uses the newest non-draft release, including prereleases. The updater prefers a `.exe` asset whose name contains `Setup` or `Install`. `WEBORA_UPDATE_FEED` and legacy `settings.updateFeedUrl` remain overrides and still accept the older JSON feed shapes. A launch-time banner shows version, notes and **Update and restart**; Settings → About keeps the manual check and channel selector.
- AI provider requests send `response_format: json_object` for OpenAI-compatible endpoints and JSON mode for Ollama, fall back on HTTP 400 where unsupported, and raise default token limits (`num_ctx`, 8192 generation / 4096 edits).
- Editor modal bug fixed: a duplicate `case 'modal'` made the dedicated renderer unreachable.
- Version surfaces (`package.json`, splash, About, sidebar, browser bridge fallback) report `1.2.0`.

**Bugs found and fixed**

1. **“JSON error” / “not compatible” on valid model output.**
   The old parser required a bare JSON document and the request did not enable JSON mode. Fenced output, prose wrappers, trailing commas and token-truncated tails all failed. Added tolerant extraction/repair, provider JSON mode, alias normalisation and retries; the mock still covers the strict shape while the parser unit checks cover damaged output.

2. **A project could disappear when its shape looked wrong.**
   `ensureProjectShape` discarded projects with missing/empty `pages`. It now synthesises a Home page, preserves unknown element types and retains AI chat. Renderer-level deletion paths were also hardened.

3. **AI Studio follow-ups generated a new site instead of editing the current one.**
   Sessions now own their draft and send the current outline; model operations apply to that document. Verified a Services page and contact form were added to the existing 2-page site without replacing it.

4. **Editor AI only knew one page and could not add pages.**
   `buildSiteContext` now serialises every page with real IDs, and page operations are part of the shared `applyOps` path. Verified a YouTube section added to Home via a proposed op and applied with undo available.

5. **Accidental deletion had no recovery path.**
   Added pre-write snapshots and the recovery UI. Verified `backups/` appeared after a save, the newest snapshot was detected, and restoring while the original still existed produced `Verification Site (recovered)` rather than overwriting.

6. **Updates required a feed URL the user did not have.**
   The URL field was removed from Settings and the default source is now GitHub Releases. The earlier `webora.app` endpoints were third-party and are gone. Verified GitHub release discovery and, separately, that a local `WEBORA_UPDATE_FEED` advertising `1.2.1` still produces the launch banner and downloads the installer to `%LOCALAPPDATA%\Temp\webora-updates`.

7. **Modal elements rendered as plain containers.**
   Removed the duplicate switch case so the modal renderer (backdrop, trigger, title) runs.

**Verification**

| Area | Check | Result |
| --- | --- | --- |
| Typecheck | `npx tsc --noEmit` | Pass |
| Checks | `npm run check` | Pass — 44 codegen/runtime + 6 AI |
| Build | `npm run build` | Pass |
| AI Studio | Generate from empty session | Pass — “Mock Streaming Site”, 2 pages, 26 elements |
| AI Studio | Follow-up “Add a Services page…” | Pass — page `/services` + form, 3 pages, 1 op |
| AI Studio | Rename and delete a chat | Pass — title persisted, delete removed only that session |
| AI Studio | Reload persistence | Pass — session, transcript and draft restored from `ai-sessions.json` |
| AI Studio | Open in editor | Pass — project added to My Projects, 3 pages |
| Editor AI | Add a YouTube section | Pass — video element with YouTube URL, 3 sections, Apply offered |
| Editor AI | Persisted chat | Pass — user + result entries stored in `Project.aiChat` |
| Provider test | Mock OpenAI-compatible endpoint | Pass — “Connected · mock-chat” |
| Recovery | Save snapshot creation | Pass — prev, session and daily files written |
| Recovery | Detect + restore | Pass — “Newest snapshot projects-prev.json · 1 project”, restore merged |
| Recovery | ID/name collision | Pass — added `Verification Site (recovered)`, original untouched |
| Updates | GitHub Releases discovery | Pass — `v1.2.0` release found on stable and beta; installed 1.2.0 correctly reported as current |
| Updates | GitHub asset selection | Pass — `Webora.Setup.1.2.0.exe` preferred over the portable asset |
| Updates | GitHub asset download | Pass — downloaded to `%LOCALAPPDATA%\Temp\webora-updates`; SHA-256 matched the local installer |
| Updates | Launch banner from local feed | Pass — v1.2.1 notes and **Update and restart** shown |
| Updates | Local feed download | Pass — override feed downloaded its installer to `%LOCALAPPDATA%\Temp\webora-updates` |
| Package | `win-unpacked` launch | Pass — v1.2.0 in sidebar, fixture project loaded, clean exit |
| Package | Portable `Webora 1.2.0.exe` launch | Pass — extracted, opened, reported v1.2.0, clean exit |

**Packaging**

| Artifact | Size | SHA-256 |
| --- | --- | --- |
| `release/Webora Setup 1.2.0.exe` | 101.32 MB | `6527A20B69169BE8422A1640DF69862EF8C136B6F01DE5AD31BCA5AB92DD1C7B` |
| `release/Webora 1.2.0.exe` | 101.08 MB | `B5034CD6A6116B57C9603D7B53A532F4CD0299DC6EEEA277D8FB1134C6C40943` |

Build config is unchanged: `appId com.webora.app`, NSIS with selectable install folder and shortcuts, portable target, icon `build/icon.png`, files limited to `dist/**/*` and `dist-electron/**/*`.

Published at `https://github.com/ecn1/webora/releases/tag/v1.2.0` from source commit `f13a9ee`. GitHub normalises spaces in asset names to dots; the updater still matches the `Setup` asset.

**Unverified / gaps**

- **Unauthenticated GitHub API limits apply.** Update checks do not use a token, so GitHub allows 60 requests per hour per IP. Webora checks once per launch and on manual request; heavy shared-NAT use can hit the limit, which the manual check reports.
- **Update install was not executed.** The banner and download path were verified with a local feed and a dummy `.exe`, and the published installer was downloaded and hash-checked. Clicking **Install and restart** would run the installer, so the final spawn step was left unexercised.
- **AI was validated against the local mock only.** No live Ollama model or OpenAI credential was available. Model quality and provider-specific JSON-mode edge cases remain unverified.
- **Real YouTube/Vimeo playback is still unconfirmed** in this environment; the app-side sandbox and referer fixes remain in place.
- **Binaries are unsigned.** SmartScreen will warn; verify the published SHA-256 checksums before installing.
- The local `%APPDATA%` workspace contains the disposable Verification Site fixture used for these checks. It is not bundled into the installers.

**Commands used**

```bash
npx tsc --noEmit
npm run check
npm run check:core
npm run check:ai
npm run build
npm run dist

node scripts/mock-ai.mjs
"release/win-unpacked/Webora.exe" --remote-debugging-port=9333
```


