# Changelog

All notable changes to PulseVitals are recorded here. This project follows [semantic versioning](https://semver.org/) loosely (`MAJOR.MINOR` — patch suffix added when the project ships its first patch release).

## [2.1] — 2026-04-18

Feature pass on top of v2.0. Six net-new surfaces, no new Chrome permissions.

### Added

- **Waterfall / resource timeline** in the popup. Horizontal bars per resource (top 10 by transfer size), scaled against the full page load, coloured by `initiatorType` (script / css / image / xhr / other), with a legend.
- **History compare + diff view.** Each history card gets a checkbox; selecting two and clicking *Compare* opens a dedicated diff view with per-metric deltas (LCP, CLS, INP, domComplete, top / total transfer, resource count) and colour-coded better / worse / same badges.
- **Console errors section.** Content script captures `window.error` and `unhandledrejection` events (capped at 20). Popup shows a count badge and up to 5 most-recent `message / source:line` rows. Zero-error state is an explicit "None" pill so users know they're not missing data.
- **Image-optimization insights.** Three new rules in the existing insights engine (with an `Image` badge chip):
  - Images in legacy formats (JPEG / PNG) over 100 KB that could be WebP / AVIF.
  - Off-screen images missing `loading="lazy"`.
  - Above-the-fold images over 80 KB missing a responsive `srcset`.
- **Annotations on history snapshots.** Each saved run gains an editable free-form note; the note appears as an italic red subline on the history card and as a debounced auto-save textarea on the detail view.
- **Pin overlay** — opt-in (default off) floating badge on every page showing CWV verdict + LCP. Hosted inside a Shadow DOM so the page's CSS can't style it; dismissible per-tab with ×.

### Changed

- **Content-script payload** gains `jsErrors`, `imageAudit`, and `startTime` on each resource entry.
- **Options page** adds a "Pin overlay on page" toggle under Measurement.
- **Insights engine** renders an `Image` badge when a rule's `kind === "image"`, mirroring the existing platform-tag pattern.
- **SPA soft-nav** now also clears captured JS errors and the per-tab pin-dismissed flag on URL change.

### Internal

- Locale files grow from 119 to 148 keys per locale, full parity enforced.
- Popup-renderer gains `renderWaterfallSection`, `renderConsoleErrorsSection`, `renderAnnotationRow`, `renderDiffView`, `computeDiffRows`, `fmtDelta`.

### Known limitations

- Pin overlay's Shadow DOM attachment can fail silently on pages with very restrictive CSP (e.g., strict `script-src` that disallows mutation observers of certain internal nodes). No visible breakage on the host page.
- Image audit walks up to 60 `<img>` elements per page; pages with hundreds of images will have undersampled data.
- Diff view shows top-level metric deltas only. Per-resource changes beyond the top resource are aggregated into the "Total transfer" row.

## [2.0] — 2026-04-18

The **Ship-readiness release**. 21 backlog seeds bundled into a single version bump to earn the version-number round-trip. This is the first release that's ready for Chrome Web Store submission, pending the externally-gated seeds (dev account, domain, hosted privacy policy).

### Added — popup

- **Share-as-HTML** button in the header. Click downloads `pulsevitals-report-<timestamp>.html` — a self-contained, styled report openable in any browser without the extension.
- **Mobile emulation toggle** (📱) — re-runs the current-view subhead under "Mobile emulation". Limited by what a content script can actually enforce (narrow viewport + touch claim; CPU throttling is out of scope for MV3 content scripts).
- **Third-party origins** section groups resources by hostname and identifies 12+ known vendors (Google, Meta, HubSpot, Hotjar, Cloudflare, Intercom, Segment, Stripe, Amazon, X/Twitter, TikTok, LinkedIn). Shows vendor name + aggregated request count + transfer size.
- **SEO checks** section with 7 on-page heuristics (title length, meta description, H1 count, canonical, Open Graph image, viewport meta, JSON-LD structured data).
- **Health score** tile combining CWV verdict with axe-core-lite findings into a 0–100 score plus an a11y-issues list.
- **RUM histogram** — LCP distribution from the user's own session history for the current origin (visible once at least 3 snapshots exist).
- **Platform-aware tips** — content script detects Shopify / WordPress / Webflow / Next.js / Wix / Squarespace and the insights engine appends platform-specific fix recipes with a colored `platform-tag` chip.
- **Budget alert banner** above the CWV bar when the current page exceeds the user's LCP/CLS/INP thresholds.
- **What's-new card** appears once per version bump (dismissible).
- **Consent disclosure** card on first install; **First-run onboarding** card on first successful measurement.
- **Popup footer** gains "Report an issue" link and "Options" link; footer version bumped to `v2.0`.

### Added — new pages

- **`options.html`** — preferences stored in `chrome.storage.sync`: auto-measure toggle, mobile-default toggle, platform-tips toggle, SEO-checks toggle, a11y-checks toggle, budget alerts toggle (requests `notifications` permission on first enable), per-metric budgets, per-site denylist, bug-report URL, clear-history button, reset-consent button.
- **`batch.html`** + `batch.js` — paste up to 50 URLs, loads each in a background tab, captures CWV + transfer size, produces a sortable ranking with CSV export.
- **`compare.html`** + `compare.js` — head-to-head comparison of up to 3 URLs with a generated 1200 × 630 shareable PNG.

### Added — bundled libraries

- **`axe-lite.js`** — hand-authored 8-rule accessibility checker (MIT-licensed equivalent logic, not a vendor copy of axe-core): image-alt, label, button-name, link-name, html-has-lang, document-title, heading-order, landmark-one-main.

### Added — static artifacts

- **`LICENSE`** (MIT) at repo root.
- **`privacy.html`** — self-contained privacy policy.
- **`terms.html`** — self-contained terms of service.
- **`docs/permissions.md`** — Chrome Web Store permission-justification copy, ready to paste into the review form.
- **`assets/store/listing.md`** — Web Store listing copy (title, short + long descriptions, category, keyword tags).
- **`assets/store/README.md`** — screenshot + promo-tile capture guide (Puppeteer-based).
- **`scripts/package.sh`** — builds `dist/pulsevitals-<version>.zip` suitable for Web Store upload.
- **`.github/workflows/ci.yml`** — validates manifest JSON, locale parity, required file presence on every push / PR.

### Changed

- **`manifest.json`** — version `1.7` → `2.0`; `optional_permissions: ["notifications"]` added (requested on-demand from the Options page); `options_ui` wires the new options page; `content_scripts[0].js` now loads `axe-lite.js` before `background.js`.
- **Payload shape** — adds top-level `allResources`, `platform`, `seo`, `axe`, `selfPerf` fields alongside existing ones. Backwards-compatible (extra fields are additive).
- **Service worker** — extends the existing badge handler with budget-alert dispatch via `chrome.notifications` (only when the user has enabled alerts *and* granted `notifications` permission via the Options page). Gated with a 10-minute cooldown per URL so users don't get spammed on repeat visits.
- **Content script** — adds SPA soft-navigation support (patches `history.pushState` / `replaceState`, listens for `popstate` / `hashchange`, resets + re-captures on URL change without a full load). Self-perf budget measured via `performance.now()` pairs wrapped around every observer callback.

### Internal

- Locale files grow to **119 keys** each (en + es), full parity enforced by CI.

### Known limitations

- Mobile emulation narrows the subhead messaging but does not perform true CPU throttling (content scripts can't). Accurate mobile scoring still requires external tools like PageSpeed Insights.
- The axe-core-lite checker is 8 rules, not the full axe-core rule set — hand-authored to keep the bundle small and avoid shipping a vendor blob.
- Unit tests and functional tests remain unshipped (seed #10, #11) — placeholder CI job documents the intent.
- Web Store submission itself (seed #15) is unblocked at the code level; it still requires a developer account (#34), a hosted privacy policy URL (#31 via the landing domain #35), and screenshots (#30 via the Puppeteer helper).

## [1.7] — 2026-04-17

### Added

- **Internationalisation** — all 69 user-visible strings routed through `chrome.i18n.getMessage` via a `t()` helper. Ships with two locales:
  - `_locales/en/messages.json` (default locale)
  - `_locales/es/messages.json` (Spanish)
- **Locale-aware number and time formatting** — `Intl.NumberFormat` (via `Number.toLocaleString`) for LCP / CLS / INP decimal separators (e.g., "LCP 4,8s" in Spanish); `Intl.RelativeTimeFormat`-style relative-time strings localised per locale; `Intl.DateTimeFormat` for fallback long-ago dates.
- **`data-i18n` attributes** in `popup.html` mark static UI strings for automatic population by `applyStaticI18n()` on popup load. Ensures localised strings appear on first paint, not after JS warms up.
- **`manifest.json` localised** — `name`, `description`, and `action.default_title` use `__MSG_extensionName__` / `__MSG_extensionDescription__` placeholders with `default_locale: "en"`.

### Changed

- **Accessibility pass.** Heading outline confirmed (single `<h1>`, `<h2>` for each section); `<table>` + `<th scope="col">` preserved; all interactive elements are `<button type="button">`; `:focus-visible` ring enforced globally; back-button gains `aria-label` that announces its navigation target (e.g., "Back to recent runs list").
- **CWV bar** now has both `role="status"` and `aria-live="polite"` so verdict refinements (LCP arrives, INP updates after interaction) are announced to screen readers.
- **Insight rule titles and fix paragraphs** now live in `_locales/<code>/messages.json`. All 8 rules have English + Spanish copy; the rules engine references message keys at render time.

## [1.6] — 2026-04-17

### Added

- **Core Web Vitals measurement** — CLS via session-windowed `layout-shift` observer (per Chrome's spec — shifts with `hadRecentInput` excluded, 1 s gap / 5 s window sessions, max session = CLS); INP via `event`-entry observer with `durationThreshold: 40`, p98 of interaction durations (max when fewer than 50 interactions).
- **CWV status bar** in the popup — colored bar directly under the URL, showing the verdict (`Good` / `Needs improvement` / `Poor` / `Measuring…`) and a `LCP · CLS · INP` breakdown. Verdict = worst of the three thresholds per Google's public specs.
- **Toolbar icon badge** — tab-scoped colored pill via `chrome.action.setBadgeText` + `setBadgeBackgroundColor`. Green / amber / red / cleared based on verdict. Implemented by a new MV3 service worker (`service-worker.js`) that listens for verdict messages from the content script and clears on navigation.
- **Insights section** in the popup — rule-based engine evaluates 8 rules against the payload (slow LCP, large hero image, poor CLS, poor INP, slow TTFB, large JS payload, large total transfer, slow DOM completion); returns the top 5 by estimated savings; renders each with severity dot, title, savings hint, and a one-paragraph fix recipe. Empty-state copy distinguishes "passing — nothing to fix" from "still measuring — interact with the page."

### Changed

- Payload shape extended with top-level `cls: <number | null>` and `inp: <number | null>` fields.
- Popup CSS extended with `.cwv-bar` / `.insight*` / `.insights-empty` rules plus dark-mode companions.
- Message listener in the content script now broadcasts a `PULSEVITALS_SET_VERDICT` message on every verdict change (coalesced — only sent when the computed verdict differs from the last-sent value).

### Infrastructure

- First MV3 service worker added. `manifest.json > background.service_worker = "service-worker.js"`. No new permissions — the `chrome.action.*` APIs are available to all extensions by default.

## [1.5] — 2026-04-17

### Added

- **Storage section** in the popup with `localStorage`, `sessionStorage`, and `Origin total (estimate)` — byte counts for the first two via direct iteration; origin total from `navigator.storage.estimate()`. Degrades gracefully to "Unavailable" on private-mode or old browsers.
- **Top resources table** — up to 10 resources from `performance.getEntriesByType("resource")` sorted by `transferSize`. Shows truncated URL path (`title` attribute carries the full URL), formatted size, and duration in ms.
- **Export button** in the popup header — one click downloads both `pulsevitals-report-<timestamp>.json` (full payload) and `.csv` (flat `section,key,value1,value2` format). Uses Blob + anchor download — no `downloads` permission added.
- **History view** — click the `History` button to switch the body to a list of past runs for the current origin. Click any entry to open a read-only snapshot in the same layout. Back navigation at the subhead level. Up to 10 snapshots per origin, stored in `chrome.storage.local`, de-duped within a 60-second window.
- **Toast notification** component — appears above the footer on Export; auto-dismisses after 2 s.

### Changed

- Popup payload shape extended with `storage: { localStorage, sessionStorage, usage, quota }` and `resources: [...]` alongside the existing timing / paint / LCP fields.
- Content-script message handler is now async — uses `return true` + `sendResponse` in a Promise chain so `navigator.storage.estimate()` can be awaited before responding.
- Popup header gains two compact text buttons (`History`, `Export`); layout rebalanced so the brand wordmark and buttons coexist in the 48 px header strip.

## [1.4] — 2026-04-17

### Added

- **Paint & Core Web Vitals** sub-group in the popup with three new rows — `first-paint`, `first-contentful-paint`, `largest-contentful-paint`. Closes the brand-promise gap between *PulseVitals* and a nav-timing-only surface.
- Content script now runs two `PerformanceObserver` instances — one for `paint` entries, one for `largest-contentful-paint` — both with `buffered: true` so entries that fired before observation are captured.
- `DOMHighResTimeStamp` values converted to epoch-ms via `performance.timeOrigin` so the new rows render in the same wall-clock format as existing rows.
- Popup renders rows with `—` when a metric is not yet observed, instead of hiding the row. LCP row value reflects the most recent candidate.

### Changed

- Message payload shape extended — response now includes the three new keys alongside the existing nav-timing fields. Popup has a new `PAINT_SERIES` constant and a shared `renderRow` helper.

## [1.3] — 2026-04-17

### Changed

- **Removed the auto-opened report window.** The extension no longer spawns a new tab on every page load — a breaking change from a UX standpoint, intentional. The old behaviour was a near-guaranteed uninstall trigger.
- **Report now lives in the toolbar popup.** Click the PulseVitals toolbar icon to see navigation timings for the active tab.

### Added

- New popup UI (`popup.html` + `popup.js`) with five states: success, loading, empty, unsupported URL, error.
- Design-system tokens from `agent/design-system.md` applied end-to-end — first production use of the tokens.
- `prefers-color-scheme: dark` support in the popup.

### Removed

- `constant.js` — its old CSS / HTML-scaffold constants were only used by the retired auto-open flow. The remaining `series` array was inlined into `popup.js`.

### Internal

- Content script (`background.js`) now stashes `window.performance.timing` on page load and responds to `chrome.runtime.onMessage` requests (`PULSEVITALS_GET_TIMINGS`) from the popup. No new windows, no `document.write`.

## [1.2] — 2026-04-17

### Changed

- **Manifest migrated from V2 to V3.** Current Chrome stable (2024+) refuses to install MV2 extensions with *"Cannot install extension because it uses an unsupported manifest version"* — this release unblocks installation.
- `browser_action` renamed to `action` (MV3 API). Popup, icon set, and tooltip behavior are identical to 1.1.
- Removed the invalid `background` permission from `manifest.json > permissions` — it was never a valid Chrome permission and MV3 rejects it.

### Unchanged

- All runtime behavior (`background.js`, `constant.js`, `popup.html`) is byte-for-byte identical to 1.1.
- Extension still runs as a declarative content script on `<all_urls>` at `document_idle`.

## [1.1] — 2026-04-17

### Added

- Brand icon set at 16 / 32 / 48 / 128 px under `icons/`, wired into `manifest.json > icons` and `manifest.json > browser_action.default_icon`.
- SVG source masters at `icons/source/` — a 128 px master plus purpose-drawn 32 px and 16 px variants with simplified paths tuned for small-size silhouette legibility.
- `icons/build.sh` rasterization helper (macOS `qlmanage`-based) so the PNGs can be regenerated from the SVGs.
- `browser_action` entry in `manifest.json` — the extension now shows a clickable toolbar button (`default_title = "PulseVitals"`) that opens `popup.html`.
- This `CHANGELOG.md` file (first changelog entry).

### Design notes

- Mark uses `color/accent/pulse` (#E11D48) from `agent/design-system.md` with a white ECG waveform.
- The 16 px and 32 px variants are **not** downscales of the 128 px master — they use a simplified path to preserve silhouette at small pixel counts.

## [1.0] — pre-changelog

- Auto-opens a performance report window when a page finishes loading.
- Surfaces navigation timing events from `window.performance.timing`.
