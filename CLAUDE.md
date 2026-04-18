# CLAUDE.md

This file gives Claude Code project-specific guidance for **PulseVitals** — a Chrome extension that surfaces page-load performance insights.

## Product framing

- **Brand:** PulseVitals (solo project, private repo; public release is on the roadmap).
- **Positioning:** "Performance insights for every page you load." Long-term target: the one-glance Core Web Vitals + plain-English performance companion for non-experts.
- **Audiences we are building for** (see `agent/future-plans.md` Growth seeds): SEO-conscious site owners, agencies doing client audits, marketers worried about third-party bloat, non-technical operators on Shopify / WordPress / Webflow.
- Surfaces and assets should read as a product (PulseVitals), never as a personal utility.

## Project at a glance

- **Current version:** 2.1 (MV3, en + es locales, 148 i18n keys per locale).
- **Permissions:** `storage`, `activeTab`, `tabs`; `notifications` optional (budget alerts).
- **Runtime entry points:**
  - `background.js` — content script (despite the name). Captures CWV + paint + storage + resources + SEO + a11y + JS errors + image audit. Mounts optional pin overlay in a Shadow DOM. Notifies service worker of verdict changes.
  - `service-worker.js` — MV3 SW. Sets the toolbar badge per tab; fires budget-alert notifications when the user opts in.
  - `popup.html` + `popup.js` — 380 × 520 toolbar popup; view state machine (current / historyList / historyDetail / historyDiff / consent / onboarding).
  - `options.html` + `options.js` — preferences UI, `chrome.storage.sync`-backed.
  - `batch.html` + `batch.js` — up-to-50-URL background-tab audit with CSV export.
  - `compare.html` + `compare.js` — head-to-head comparison with 1200 × 630 PNG export.
  - `axe-lite.js` — bundled 8-rule accessibility checker, loaded as the first content script.
- **Static artefacts bundled with the extension:** `privacy.html`, `terms.html`, `LICENSE`.
- **Repo-only artefacts** (not shipped in the zip): `agent/`, `CLAUDE.md`, `CHANGELOG.md`, `README.md`, `docs/`, `assets/`, `scripts/`, `.github/`.
- **CI:** `.github/workflows/ci.yml` validates manifest JSON, locale-key regex + parity, and required-file presence on every push / PR.
- **Packaging:** `bash scripts/package.sh` → `dist/pulsevitals-<version>.zip`.
- **No runtime dependency on any remote endpoint.** No telemetry, no crash reporting, no CDN assets.

## Plans

> This section is the authoritative list of active work. **Appending a new entry here triggers the agent pipeline** — see rule below.

<!-- Template for a new plan entry — copy-paste under this line when starting work:

### <Plan title>
- Seed: link or short reference (e.g., `agent/future-plans.md#N`)
- Why: …
- Success signal: …
- Pipeline status:
  - [ ] 1. PM — `agent/roles/pm.md`
  - [ ] 2. UX — `agent/roles/ux.md`
  - [ ] 3. Mock / Prototype Designer 🛑 MANUAL APPROVAL — `agent/roles/mock-designer.md`
  - [ ] 4. Spec Reviewer — `agent/roles/spec-reviewer.md`
  - [ ] 5. Architect — `agent/roles/architect.md`
  - [ ] 6. Dev — `agent/roles/dev.md`
  - [ ] 7. Dev Code Reviewer — `agent/roles/dev-code-reviewer.md`
  - [ ] 8. Security Reviewer — `agent/roles/security-reviewer.md`
  - [ ] 9. QA — `agent/roles/qa.md`
  - [ ] 10. Docs — `agent/roles/docs.md`
  - [ ] 11. Release Manager — `agent/roles/release-manager.md`
- Artifacts: (attach PM Spec, UX Spec, Mock, … as sub-sections here)
-->

> **Archived plans:** completed plan artifacts (1.0 Design System → 2.1 Feature pass) live in [`agent/archive/plans-shipped.md`](agent/archive/plans-shipped.md). This file only carries in-flight work.

### v1.8 — Third-party origin breakdown + Share-as-HTML

- Seed: `agent/future-plans.md#19`, `#21` — bundled because both act on the existing resource/report data and both add new export affordances without new data capture.
- Why: (a) "My site is slow" is usually "my tag manager loaded 17 vendors." Today PulseVitals shows the top 10 resources but never groups them by origin — the question "what are these third parties costing me?" can't be answered. (b) Today's Export (#6) ships JSON + CSV which devs can read; **non-technical consultants / clients** need a readable, shareable single-file report. A self-contained HTML export closes that loop and is zero-infra.
- Success signals:
  - **#19:** Popup renders a "Third-party origins" section that groups resources by hostname, identifies known vendors (Google / Meta / HubSpot / Hotjar / etc.) via a built-in domain dictionary, and shows cumulative transfer size and request count per vendor. Top 10 vendors shown, sorted by transfer size.
  - **#21:** Popup header gains a "Share" button. Click downloads `pulsevitals-report-<stamp>.html` — a self-contained static HTML file with all inline styles, the CWV verdict, insights, third-party breakdown, timings, storage, and resources. Openable in any browser without the extension.
- Pipeline status:
  - [x] 1. PM — see PM Spec below
  - [x] 2. UX — see UX Spec below
  - [ ] 3. Mock / Prototype Designer 🛑 MANUAL APPROVAL — prototype at `agent/prototypes/thirdparty-share/mock.html`, awaiting sign-off
  - [ ] 4. Spec Reviewer
  - [ ] 5. Architect
  - [ ] 6. Dev
  - [ ] 7. Dev Code Reviewer
  - [ ] 8. Security Reviewer
  - [ ] 9. QA
  - [ ] 10. Docs
  - [ ] 11. Release Manager

#### PM Spec

- **Problem:** Resources are today a flat top-10 list ranked by transfer size. For the "why is my site slow" conversation, what matters is often *who* the traffic went to — marketing tags, analytics, chat widgets. And once a user has identified issues, they can export JSON/CSV but have no way to hand a *pretty, readable* report to a client or teammate.
- **Audience:**
  - **#19:** marketers, ad-ops, tag-manager owners, perf consultants on client audits.
  - **#21:** consultants delivering findings to non-technical clients; in-house teams sharing in Slack / email.
- **Goals:**
  - **#19:** group resources by host; identify ~12 common vendors by domain match; surface top-10 vendors by transfer size; show cumulative size + request count per vendor.
  - **#21:** one-click download of a self-contained HTML file that renders the current report without the extension; inline styles, no scripts, no remote assets.
  - Minimal friction: both features are additive — no new permissions, no new observers, existing payload data reused.
- **Non-goals:**
  - Blocking-time per vendor — `PerformanceResourceTiming` doesn't expose blocking time directly, and computing it well is a future plan.
  - "Remove to save X ms" actionable estimate per vendor (the seed's stretch goal) — we surface total transfer only at v1; savings heuristics land in a follow-up plan.
  - Hosted short-link sharing from the seed's option (b) — we ship option (a) self-contained HTML only. Hosting requires a server and an account (seed #44 territory).
  - Server-side PDF — HTML + browser-print is the PDF path for v1.
  - Translating the shared-HTML file into Spanish — the HTML mirrors whatever locale the extension was using at export time (active i18n already handles this); no extra translation work.
- **User stories:**
  - US-1 (3P): As a site owner, I want to see which third-party vendors are loading on my page and how much they're costing so I know which tags to question.
  - US-2 (3P): As an ad-ops manager, I want known vendors named (Google, Meta, etc.) instead of raw hostnames so non-technical stakeholders can read the report.
  - US-3 (3P): As a user of a first-party-only site, I want a clean "no third-party resources detected" state rather than a confusing empty section.
  - US-4 (Share): As a consultant, I want to download a single HTML file that renders the full report so I can email or Slack it to a client who doesn't have the extension.
  - US-5 (Share): As a recipient of a shared report, I want to open the file in any browser and see a branded, styled view — not raw JSON or a broken page.
- **Acceptance criteria:**
  - AC-1 (3P data): content script's `getResources` returns up to 100 resources (not just top 10) so the popup can group and separately pick top-10 for the existing table.
  - AC-2 (3P grouping): popup's `groupThirdParty(resources, pageOrigin)` returns an array of `{vendor, origins, transferSize, count}` sorted by transferSize descending, limited to 10 entries.
  - AC-3 (3P vendor dictionary): at least 12 known vendor patterns mapped to display names, including Google, Meta, HubSpot, Hotjar, Cloudflare, Intercom, Segment, Stripe, YouTube, Amazon, Twitter/X, TikTok. Unknown origins render with their hostname as the vendor name.
  - AC-4 (3P UI): section heading "Third-party origins" with up to 10 `.tp-row` items each showing: colored vendor dot, vendor name + origin subline, request count pill, cumulative transfer size in the design-system mono.
  - AC-5 (3P empty): if all resources are first-party (origin matches page origin), section shows "No third-party resources detected on this page."
  - AC-6 (3P localised): section heading and empty-state copy live in `_locales/*` and render from `t(...)` calls. English + Spanish shipped.
  - AC-7 (Share button): header gains a third `.iconbtn` labelled `Share` (localised). Button sits to the right of `Export`.
  - AC-8 (Share file): click triggers download of `pulsevitals-report-<ISO-timestamp>.html`. The file is a single standalone HTML document.
  - AC-9 (Share content): shared file contains: page URL, timestamp, CWV verdict + breakdown, Insights (all with titles + fixes), Third-party origins, Timings table, Storage rows, Top resources table, footer crediting PulseVitals.
  - AC-10 (Share self-contained): shared file has NO `<script>` tags, NO external `<link>` / `<img>` references, all CSS inlined, renders correctly opened via `file://` in Chrome, Safari, and Firefox.
  - AC-11 (Share XSS-safe): all user-derived strings (URL, origin names, resource names, insight text) are HTML-escaped before insertion into the share doc.
  - AC-12 (Share toast): success toast reads `Downloaded pulsevitals-report.html` (localised). Export toast unchanged.
  - AC-13 (No new permissions): `manifest.json > permissions` unchanged.
- **Dependencies / risks:**
  - Risk: Cross-origin resources with missing `Timing-Allow-Origin` have `transferSize: 0` — they appear in the breakdown with `0 B`. Acceptable — shows the URL correctly; transfer size just reflects what the browser exposed.
  - Risk: Expanding from top-10 to all-resources grows the payload by 10-20 KB for heavy pages. Acceptable; capped at 100 resources to bound size.
  - Risk: History detail snapshots were saved with top-10 resources — third-party section in history detail will be based on those 10 only. Acceptable — explained in Docs.
  - Risk: Vendor dictionary gets stale as vendors change domains. Accepted — additions in future plans.
  - Risk: Shared-HTML file size could grow (inlined CSS + report body). Target: under 80 KB for a typical report. Verified in QA.
- **Open questions:** None.

### Handoff
Next: UX.

#### UX Spec

- **Entry points:** unchanged toolbar popup. New surfaces live *inside* the popup.
- **Flow (third-party):**
  1. User opens popup on a page with third-party scripts.
  2. Scrolls past Insights and Timings and Storage and Top Resources (existing order).
  3. Sees "Third-party origins" section with top 10 vendors.
  4. Non-technical user recognises the brand names; technical user can see the raw hostnames in the subline.
- **Flow (share):**
  1. User clicks `Share` button in header.
  2. Popup generates the self-contained HTML string.
  3. Browser downloads it with timestamped filename.
  4. Toast confirms `Downloaded pulsevitals-report.html`.
  5. User attaches to email / uploads to Slack / archives locally.
- **UI surfaces and layout:**
  - **Header** gains a third `.iconbtn`: `Share` sits to the right of `Export`. Accommodated by reducing header padding-right from 12 px to 8 px and button gap from 8 px to 6 px to fit.
  - **Third-party section** placement: between **Top resources** and nothing (it's the last section). Rationale: it's a more synthesised view of the resource data; reading order is raw-list → aggregated.
  - **Third-party row** layout (380 px popup width):
    - `.tp-vendor-dot` (10 × 10 px colored square, vendor brand color)
    - `.tp-vendor` column (flex 1): `.tp-vendor-name` (bold 0.875 rem) + `.tp-origin` subline (0.7 rem mono, truncated)
    - `.tp-count` pill (small background, request count)
    - `.tp-size` mono number (60 px min, right-aligned)
  - **Empty state:** centered single-sentence `.tp-empty` with inline `<code>` for the page origin.
- **States:**
  - Populated — as shown in Mock frame 1.
  - Empty (all first-party) — as shown in Mock frame 2.
  - Partial (some resources had null transferSize) — included in the breakdown with size 0; no special state.
- **Accessibility:**
  - Third-party section: `<h2>` heading, rows are `<div>` (not interactive in v1 — future plan may make them clickable to drill in).
  - Share button: standard `<button type="button">`; `title` attribute "Download a shareable HTML report".
  - Shared HTML file: has its own `<title>`, proper heading outline (`<h1>PulseVitals Report</h1>` → `<h2>` sections), semantic `<table>`, respects `prefers-color-scheme` via `@media` in its inline CSS.
- **Theming:**
  - Popup: reuses existing dark/light tokens; vendor dots are vendor-brand colors (not design-system tokens — they're references).
  - Shared HTML: self-contained dark/light via `prefers-color-scheme` media query in its inline stylesheet so it looks right regardless of the recipient's system.
- **Copy:**
  - Section heading: `Third-party origins` / `Orígenes de terceros`
  - Empty: `No third-party resources detected on this page.` / `No se detectaron recursos de terceros en esta página.`
  - Share button: `Share` / `Compartir`
  - Share button title: `Download a shareable HTML report` / `Descargar un informe HTML compartible`
  - Share toast: `Downloaded pulsevitals-report.html` / `Se descargó pulsevitals-report.html`
  - Shared file title: `PulseVitals Report` / `Informe de PulseVitals`
  - Shared file footer: `Generated by PulseVitals · pulsevitals.app` / `Generado por PulseVitals · pulsevitals.app`

### Handoff
Next: Mock / Prototype Designer (manual approval gate).

#### Mock / Prototype

**📂 Viewable prototype:** [`agent/prototypes/thirdparty-share/mock.html`](agent/prototypes/thirdparty-share/mock.html) — four frames:

1. **Popup — Third-party origins section (populated).** 5 vendor rows (Google, Meta, HubSpot, Hotjar, unknown) with vendor dots + counts + sizes. Header now has 3 buttons.
2. **Popup — No third-party content.** Empty-state copy when all assets are first-party.
3. **Popup — after Share click.** Toast "Downloaded pulsevitals-report.html" pinned above footer.
4. **Shared HTML file preview (wider).** Simulates opening the downloaded `pulsevitals-report.html` in a browser — title, meta line, CWV bar, Insights section with recipes, Third-party summary, Timings summary, and branded footer.

##### Design rationale

- **Third-party section at the end, not replacing Top resources:** both are useful — raw top-10 answers "what files are biggest", aggregated 3P answers "who are these third parties". Keeping both lets users navigate from the specific to the aggregate.
- **Vendor dots use vendor brand colors** (`#4285F4` Google, `#1877F2` Meta, `#FF7A59` HubSpot, `#F7941D` Hotjar, `#94A3B8` unknown fallback). This is the one place brand recognition beats design-system consistency — users scan for familiar logos / colors.
- **Unknown origins fall back to `#94A3B8` slate** — matches the design system's muted tone.
- **Request count pill** (`.tp-count`) disambiguates "one big file" from "many small files" — useful when deciding which vendor to prune.
- **Share as self-contained HTML rather than PDF:** HTML is zero-infra (no PDF library, no service worker print flow), easier to email than a PDF, and users who want PDF can Print-to-PDF from the HTML. Same information, fewer failure modes.
- **Shared HTML respects `prefers-color-scheme` independently** — recipient's system theme applies to the file. Keeps it looking right across devices without hardcoding one theme.

##### Design-system additions

- None proposed. The vendor dots are brand references, not new design tokens.

##### States shown

- [x] Third-party populated (5 vendors)
- [x] Third-party empty (no third-party content)
- [x] Share action — toast confirmation
- [x] Shared HTML file rendered in a simulated browser
- [N/A] Error / unsupported — unchanged; popup's existing states apply.

##### Accessibility checks

- Third-party rows: vendor name is text, colored dot is a secondary signal — colorblind users still get the name.
- Share button: standard `<button>` in Tab order after Export.
- Shared HTML file: heading outline, semantic tables, no color-only meaning.

### Manual approval (REQUIRED)

- [ ] Approved by: @<your-handle-here>
- Date: ____-__-__
- Comments: ____

### Handoff
Next: Spec Reviewer — only after `Approved by` above is ticked. Summary: #19 third-party aggregation + #21 self-contained HTML share; header grows to 3 buttons; no new permissions; 13 ACs across 2 seeds.
## Pipeline trigger rule (MANDATORY)

Whenever a new entry is added to the `## Plans` section above, Claude MUST:

1. Read `agent/pipeline.md` to re-load the canonical stage order.
2. Execute the stages in order, starting at **PM** (`agent/roles/pm.md`).
3. Before acting as any stage, read that stage's role file in `agent/roles/` and follow its Responsibilities, Output artifact shape, and Exit gate exactly.
4. Attach each stage's artifact as a sub-section under the plan entry in this file, and tick its checkbox only when the Exit gate passes.
5. If a stage fails its gate, loop back to the prior authoring stage (e.g., Code Review → Dev) and record the rework in the plan entry.
6. A stage may only be marked ✅ or skipped with an explicit `N/A — <reason>` note; silent skips are not allowed.
7. **Manual-approval stage (Stage 3 — Mock / Prototype Designer):** Claude MAY author the mock and fill in everything else under the Mock artifact, but MUST NOT tick the `Approved by:` checkbox or mark Stage 3 ✅ on behalf of the user. The human owner must tick it manually. Until that happens, Stage 4 (Spec Reviewer) does not start.
8. The **compressed pipeline** (Dev → Dev Code Reviewer → QA → Release Manager) is allowed only when justified inline under the plan entry per `agent/pipeline.md`. It skips the Mock stage — only valid for non-UI changes.

The pipeline applies to every plan — including plans added by the user, by Claude, or promoted from `agent/future-plans.md`.

## Code conventions

- Manifest V3 (migrated in v1.2); the service worker lives in `service-worker.js`.
- Keep the extension's permission list minimal — any addition must be justified during the Security Review stage.
- Prefer safe DOM APIs (`textContent`, `createElement`) over `innerHTML` / `document.write` when introducing new rendering code.
- No build step currently; treat the repo as plain JS that Chrome loads directly.

## Testing

No test harness exists yet — adding one is tracked in `agent/future-plans.md#10` and `#11`. Until those plans land, QA's "functional tests" stage will rely on manual verification documented in the QA Report artifact.
