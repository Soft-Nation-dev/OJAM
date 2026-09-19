# Ojam improvement backlog

Audit date: 2026-09-18. Scope: iOS PWA install, Play Store/Expo updates, mobile message administration, upload progress, and a responsive UI pass.

## Implementation status

- [x] 1. Production HTTPS/domain updated to `https://ojam.com.ng`; deploy workflow now verifies the shell, manifest, and service worker.
- [x] 2. iOS install action replaced with device-specific instructions; supported browsers use the native install prompt.
- [x] 3. Web, Expo OTA, and Play Store update behavior made explicit; release config is checked by script.
- [x] 4. Mobile upload state is immediate, sticky, cancellable, and resumable.
- [x] 5. File selection now opens a metadata review step before publishing.
- [x] 6. Admin messages use a virtualized compact list with search, filters, and optimistic updates.
- [x] 7. Playlist management uses current/add tabs, multi-select, drag reorder, and bulk saves.
- [x] PWA/accessibility polish completed, including cache/update UI, icon sizing, labels, and denser mobile layout.
- [ ] Release actions: deploy the Worker, publish the web build, and issue an Expo OTA or Play Store build only after device QA.

## P0 — Fix before promoting installs or updates

### 1. Keep valid HTTPS on the production PWA

- Production now uses `https://ojam.com.ng` with a valid certificate.
- A valid secure origin is required for service workers and reliable PWA installation.
- Check the GitHub Pages custom-domain setting, DNS records, and certificate issuance. Add a post-deploy HTTPS/manifest/service-worker smoke test.
- Done when Safari opens the site without a warning and `/manifest.json` plus `/sw.js` return successfully over HTTPS.

### 2. Replace the iOS “install” action with a real instruction flow

- iOS does not expose an automatic browser install prompt that the app can trigger. The action must open instructions, not pretend to install.
- Add a permanent **Install Ojam** entry in Settings/Help. On iPhone/iPad, open a short modal: **Share → Add to Home Screen → Add**. Include the Share and Add-to-Home-Screen icons and note that the Share control may be at the top or bottom.
- Detect iPad desktop mode (`MacIntel` plus touch points), installed state (`navigator.standalone` and `display-mode: standalone`), and non-Safari browsers. For supported non-iOS browsers, use `beforeinstallprompt`.
- Change dismissal from permanent to a timed snooze; keep the Settings/Help guide always available.
- Remove the current pointer that assumes the Share button is at the bottom of Safari.
- Done when tapping Install always produces either the native prompt or useful device-specific instructions.

### 3. Make update behavior truthful and deterministic

- Hide **Check for updates** on web or make it refresh the PWA/service worker. Its current web implementation is a no-op and web toasts are Android-only, so tapping it appears broken.
- Add explicit `channel` values to EAS build profiles (at least `preview` and `production`) and document the matching `eas update --channel ...` release command.
- Reconcile version sources: `app.json` is `2.1.0`, local Android native config is `2.0.0`, and runtime is hard-coded to `3.1.0`. Adopt one release policy and automate the checks in CI.
- Use Expo OTA only for JS/assets compatible with the installed runtime. Send native dependency/config changes through a Play Store build.
- Done when a preview update reaches only preview builds, a production OTA reaches production builds, and a Play Store build reports the same version everywhere.

## P1 — Mobile upload and message administration

### 4. Show upload state immediately and continuously

- The current progress callback fires only after each 8 MB multipart chunk completes; on a mobile connection the bar can remain at 0% for a long time.
- Show an indeterminate animation immediately, then stages: **Preparing → Uploading part X/Y → Processing → Published**.
- Keep the upload card sticky above the list and show filename, transferred/total size, percentage, and retry/cancel. Do not clear the success state instantly.
- For finer progress, use a transport with byte-level progress. Until then, use 5–8 MB chunk completion plus an indeterminate animation; never show an apparently frozen empty bar.
- Preserve an upload job ID so interrupted uploads can be retried/resumed, and warn before leaving while an upload is active.
- Done when a throttled mobile upload gives visible feedback within one second and survives scrolling/backgrounding without losing its state.

### 5. Split “select file” from “publish message”

- After file selection, show a compact review sheet with editable title, preacher, date, category, series, and artwork before upload/publish.
- Validate type and size before starting; show actionable errors and retain entered metadata after failure.
- Publish the database record only after audio completion, and surface processing/indexing failures separately.

### 6. Make the admin library compact and scalable on mobile

- Replace the page-wide `ScrollView` and hundreds of mapped rows with a virtualized `FlatList`/`SectionList`, pagination, and a sticky search/filter header.
- Use dense 56–64 px rows: title, preacher/date/status, and one overflow menu. Move Edit/Delete into the menu to avoid cramped actions.
- Add sort/filter chips (newest, category, missing metadata, upload status) and preserve the current position when returning from edit.
- Use optimistic updates instead of fully refetching sermons, playlists, and app contexts after every small change.

### 7. Improve playlist message management

- Use drag handles for reorder and save the final order in one bulk request instead of updating every item after each up/down tap.
- Put “current messages” and “add messages” in separate tabs/sheets, with multi-select and a sticky Save button.
- Show position, title, preacher, duration, and duplicate/already-added state in each compact row.

## P2 — PWA and general polish

- Add distinct `any` and `maskable` manifest icons, a 180×180 Apple touch icon, `id`, `scope`, and a short description.
- Version the service-worker cache and handle navigation/app-shell fallback deliberately; show a **New version available — Refresh** banner rather than silently serving a stale shell.
- Add accessible labels, roles, focus states, and 44 px hit targets to header icons, row menus, tabs, and admin controls. The current web accessibility tree exposes several icons as unnamed generic elements.
- Add a visible scroll cue to the long category-chip row and shorten mobile labels where possible.
- Reduce the home reminder carousel height slightly so latest messages appear sooner; keep the existing compact latest-message row pattern.
- Add mobile QA for iPhone SE/standard/Max sizes, iPad, Android Chrome, slow upload, offline launch, installed PWA, and update rollback.

## Recommended tackle order

1. Production TLS and iOS install guide.
2. Web/Play Store/Expo update policy and version alignment.
3. Upload progress state machine.
4. Virtualized compact admin library.
5. Upload metadata review and playlist bulk management.
6. PWA cache/icons/accessibility polish.
