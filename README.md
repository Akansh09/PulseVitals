# PulseVitals

**Core Web Vitals at a glance — for every page you load.**

PulseVitals is a Chrome extension that surfaces page-load performance, accessibility, and SEO signals directly in the toolbar — no DevTools required. Current Core Web Vitals verdict glances from the icon badge; click the icon for plain-English fixes, a third-party breakdown, a waterfall, historical comparison, and a shareable HTML report.

> **Status:** v2.1 · solo project · private repo · pre-Web-Store. Roadmap lives in [`agent/future-plans.md`](agent/future-plans.md).

## Why another perf extension?

Chrome DevTools and Lighthouse are powerful but require skill. PulseVitals is built for the rest of the audience: site owners on Shopify / WordPress / Webflow, marketers curious about third-party tag weight, consultants delivering client audits. Insights are plain-English, privacy is local-only, and the share artefact is a one-file HTML report anyone can open.

## Built with Claude Code

This repo was originally written in **2020** as a small manual extension: an MV2 content script that used `document.write` to inject a `performance.timing` table into a new tab Chrome auto-opened on every page load. The original README promised four features; only navigation timing was actually implemented. It sat dormant for roughly six years.

On **2026-04-17**, I re-opened it and rebuilt the extension end-to-end using [Claude Code](https://claude.com/claude-code) under a self-authored **11-stage agent pipeline**: PM → UX → Mock (human-approval gate) → Spec Review → Architect → Dev → Code Review → Security → QA → Docs → Release. The pipeline definition is in [`agent/pipeline.md`](agent/pipeline.md); every shipped plan's full paper trail lives in [`CLAUDE.md`](CLAUDE.md).

### 2020 → 2026: before / after

| | v1.0 (2020, manual) | v2.1 (2026-04-18, pipeline) |
|---|---|---|
| Manifest | MV2 — unloadable on current stable Chrome | MV3 |
| UI surface | auto-opened new tab via `document.write` | 380 × 520 toolbar popup with view state machine |
| Metrics captured | `performance.timing` only | LCP · CLS · INP · paint · storage · resources · SEO · a11y · console errors · waterfall |
| Insights | — | 11-rule engine + platform-aware tips |
| Third-party breakdown | — | 12 known vendors named, aggregated per origin |
| Workflow | single measurement only | history (10 per origin), diff, annotations, batch audit (up to 50 URLs), competitor comparison |
| Export | — | JSON + CSV + self-contained HTML share |
| Lifecycle | no consent, no onboarding, no settings | first-run consent, onboarding card, options page, what's-new card, pin overlay |
| Locales | English only, hardcoded | English + Spanish, 148 message keys, parity enforced in CI |
| Shippability | none — 5-line README, no LICENSE, no privacy, no CI | LICENSE + privacy.html + terms.html + permissions doc + store listing copy + package script + CI workflow |
| File count | 4 | 24 |

### Division of labour

The process is worth naming because it matters more than the tool:

- **The human (me):** set product direction, approved or rejected each Mock, made taste calls (brand colour, which seeds to bundle, what to defer), and caught real-world bugs (e.g., the locale `extensionName` regression caused by dashes in message key names — Chrome silently invalidated the whole locale file).
- **Claude:** did the execution — wrote code, composed mocks, surfaced tradeoffs, ran every pipeline stage artefact, proposed scope splits when a batch got too big.

What made this possible wasn't "AI writing code" — it was a **repeatable process the AI followed**. The mandatory Mock-approval gate meant I couldn't lose track of what shipped or why. Every commit has a paper trail; every decision has a recorded rationale. The pipeline itself is an artefact alongside the extension, which is why [`agent/`](agent/) ships in the repo rather than being treated as scaffolding.

## Features

### Core measurement
- **Core Web Vitals verdict** — green / amber / red pill on the toolbar + a colored status bar in the popup. Thresholds from Google's public spec.
- **LCP / CLS / INP** via `PerformanceObserver` (session-windowed CLS, p98 INP).
- **Navigation timing table** — `navigationStart → domComplete` with absolute timestamps and Δ ms.
- **Waterfall** — top-10 resources rendered as horizontal bars, coloured by initiator type.
- **Console errors** — count + most-recent JS errors captured via `window.error` / `unhandledrejection`.
- **Storage** — localStorage, sessionStorage, origin usage estimate via `navigator.storage.estimate`.

### Actionable intelligence
- **Plain-English insights** — 11-rule engine (slow LCP, large hero image, poor CLS / INP, slow TTFB, big JS bundle, big total transfer, slow DOM, three image-optimization rules) ranked by estimated savings.
- **Platform-aware tips** — Shopify / WordPress / Webflow / Next.js / Wix / Squarespace-specific fixes when the stack is detected.
- **Third-party origin breakdown** — resources grouped by hostname, 12+ known vendors named (Google, Meta, HubSpot, Hotjar, Cloudflare, Intercom, Segment, Stripe, Amazon, X, TikTok, LinkedIn).
- **SEO sanity checks** — title, meta description, H1 count, canonical, Open Graph, viewport, JSON-LD.
- **Health score** — 0–100 combining CWV verdict and bundled 8-rule axe-lite.
- **Performance budgets + alerts** — per-metric thresholds; optional desktop notifications (opt-in `notifications` permission).

### Workflow
- **Click-to-open popup** at 380 × 520 px. No unsolicited new tabs.
- **Pin overlay** (opt-in) — floating CWV badge on every page, Shadow-DOM scoped, dismissible per tab.
- **Mobile emulation toggle** — narrows viewport for a mobile-style re-run.
- **Batch audit** (`batch.html`) — up to 50 URLs, sortable CWV table, CSV export.
- **Competitor comparison** (`compare.html`) — up to 3 URLs, head-to-head + shareable 1200 × 630 PNG.

### Report lifecycle
- **Export** — JSON + CSV of the current report.
- **Share** — one-click download of a self-contained styled HTML report (no extension needed to view).
- **History** — last 10 snapshots per origin, stored locally; reopen as read-only detail; editable note per snapshot.
- **History diff** — tick any two snapshots → dedicated diff view with per-metric better / worse / same badges.
- **RUM histogram** — LCP distribution across recent visits to the current origin.

### Polish
- **First-run flow** — consent disclosure on install, onboarding tip on first measurement.
- **"What's new"** — dismissible card on the first popup open after each version bump.
- **Dark-mode aware** — popup respects `prefers-color-scheme`.
- **Localised** — English (default) + Spanish, 148 message keys with enforced parity in CI.
- **SPA soft-nav support** — re-measures on `pushState` / `replaceState` / `popstate` / `hashchange`.
- **Privacy-first** — no telemetry, no crash reporting, no remote endpoints. Data leaves the device only when you Export or Share.

## Installation (development)

1. Clone the repo (private — requires access).
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select this directory.
5. The **PulseVitals** extension appears in your extensions list.

A Chrome Web Store listing is tracked in the backlog as seed #15 and is gated on a developer account (#34), a hosted privacy policy (#31), and real store screenshots (#30). Build the uploadable zip with:

```
bash scripts/package.sh
```

## Usage

1. Install as above.
2. Browse any webpage; the toolbar icon's dot changes to green / amber / red based on the page's CWV verdict.
3. Click the icon to open the popup — plain-English fixes, waterfall, third-party breakdown, SEO, health score, history.
4. Click **Share** for a self-contained HTML report you can send to a teammate or client.
5. Open `chrome://extensions` → PulseVitals → Options to configure budgets, denylist, pin overlay, and the "report an issue" URL.

## Permissions

Declared in `manifest.json`:

- `storage` — local report snapshots and synced preferences.
- `activeTab` — access the currently active tab.
- `tabs` — discover the active tab and open batch / compare pages.
- `notifications` — **optional**, requested on-demand when you enable budget alerts.

Content scripts run declaratively on `<all_urls>` at `document_idle`. No `host_permissions` requested. Full justifications in [`docs/permissions.md`](docs/permissions.md).

## Project structure

```
PulseVitals/
├── manifest.json          # MV3, i18n via __MSG_*__, options_ui wired
├── background.js          # Content script: CWV + paint + storage + resources + SEO + a11y + errors + image audit + pin overlay + SPA soft-nav
├── service-worker.js      # Toolbar badge + budget-alert notifications (optional)
├── axe-lite.js            # Bundled 8-rule accessibility checker (hand-authored)
├── popup.html             # Toolbar popup shell (data-i18n hooks)
├── popup.js               # Popup: views (current / history list+detail / diff / consent / onboarding), all render paths
├── options.html           # Options page
├── options.js             # Options logic — reads/writes chrome.storage.sync
├── batch.html             # Batch audit page (50 URLs, CSV export)
├── batch.js               # Batch logic
├── compare.html           # Competitor comparison page (3 URLs, PNG export)
├── compare.js             # Comparison logic
├── privacy.html           # Privacy policy (static, bundled)
├── terms.html             # Terms of service (static, bundled)
├── LICENSE                # MIT
├── CHANGELOG.md           # Versioned release notes
├── CLAUDE.md              # Project guide for Claude Code — plan archive + pipeline trigger rule
├── icons/
│   ├── 16.png / 32.png / 48.png / 128.png
│   ├── build.sh           # Regenerate PNGs from SVG sources
│   └── source/            # SVG masters
├── _locales/
│   ├── en/messages.json   # 148 keys
│   └── es/messages.json   # 148 keys, parity enforced by CI
├── docs/
│   └── permissions.md     # Chrome Web Store permission-justification copy
├── assets/store/
│   ├── listing.md         # Store listing copy
│   └── README.md          # Screenshot + promo-tile capture guide
├── scripts/
│   └── package.sh         # Builds dist/pulsevitals-<version>.zip
├── .github/workflows/
│   └── ci.yml             # Manifest + locale-parity + file-presence validation
└── agent/
    ├── README.md          # Agent directory guide
    ├── pipeline.md        # 11-stage PM → UX → Mock (manual-gate) → … → Release pipeline
    ├── design-system.md   # Visual token source of truth for every Mock stage
    ├── future-plans.md    # Remaining backlog (testing + externally-gated)
    ├── prototypes/        # One HTML mock per active / historical plan
    └── roles/             # One markdown file per pipeline role
```

## Development workflow

All product changes flow through the pipeline defined in [`agent/pipeline.md`](agent/pipeline.md). Appending a plan entry under `## Plans` in [`CLAUDE.md`](CLAUDE.md) triggers the pipeline: PM → UX → Mock (human-approval gate) → Spec Review → Architect → Dev → Code Review → Security → QA → Docs → Release.

## Requirements

- Google Chrome (or any Chromium-based browser supporting MV3 extensions: Chrome ≥ 127, Edge, Brave, Opera, etc.).
- Optional for the icon helper: `qlmanage` on macOS or `rsvg-convert` / ImageMagick on Linux (re-rasterises SVG sources).

## License

MIT — see [`LICENSE`](LICENSE). Privacy policy: [`privacy.html`](privacy.html). Terms: [`terms.html`](terms.html)