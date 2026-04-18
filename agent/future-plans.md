# Future Plans (Backlog)

Candidate features / improvements for **PulseVitals**. Each entry below is a **seed** — once promoted to `CLAUDE.md > Plans`, it enters the pipeline defined in `pipeline.md`.

Format of each seed:

- **Title** — short, imperative.
- **Why** — user or technical motivation.
- **Success signal** — how we'll know it's done.

**Numbering note:** Gaps in the numeric sequence correspond to seeds that have already shipped — their archived plan entries live in `CLAUDE.md > Plans`. Numbers are preserved across deletions so cross-references from shipped plans remain stable.

**Current status (2026-04-18):** extension is on **v2.1**. All originally-planned product features have shipped (#1–#9, #13–#14, #16–#17, #19, #21, #25, #27–#29, #36, #48; plus the v2.1 feature pass: waterfall, history diff, console errors, image-optimization insights, annotations, pin overlay). What remains is **testing infrastructure**, **externally-gated shippability** items, and a small list of **post-v2.1 follow-ups** that surfaced during the feature pass.

---

# Testing (deferred)

## 10. Unit test harness

- **Why:** No tests exist today; regressions will ship silently once the extension grows.
- **Success signal:** `npm test` runs headless unit tests covering pure helpers (insight rules, CWV math, formatters, vendor-dictionary match).

## 11. Functional test via headless Chrome

- **Why:** Verify end-to-end behavior against real pages.
- **Success signal:** Puppeteer / Playwright script loads the unpacked extension, visits a fixture page, and asserts on the popup contents.

---

# Externally-gated (blocked on user action)

## 15. Package + publish to Chrome Web Store

- **Why:** `git clone + load unpacked` is a friction point for non-developers.
- **Success signal:** Published listing with screenshots and a stable install link in the README. Blocked on #34 dev account, hosted privacy / terms pages (#31, #40), and real screenshot captures (#30).

## 26. Weekly email digest for monitored URLs

- **Audience:** Agencies, in-house marketing, SMB owners.
- **Why:** Pulls the user back to the tool on a cadence — the missing retention loop for a one-shot audit extension.
- **Success signal:** Opt-in; user adds URLs to a watchlist; the extension emails (or generates a downloadable weekly PDF) showing week-over-week CWV trend per URL. Requires email infra.

## 30. Real promotional store screenshots

- **Driver:** Puppeteer helper + listing copy exist (shipped v2.0). Real capture requires a headful Chrome run on the unpacked extension.
- **Success signal:** Five real PNG captures at 1280×800 in `assets/store/screenshots/` + three promo tiles at 440×280 / 920×680 / 1400×560.

## 31. Hosted privacy policy page

- **Driver:** `privacy.html` ships with v2.0 extension. The Chrome Web Store listing needs a public URL — requires a domain (#35).
- **Success signal:** `https://pulsevitals.app/privacy` resolves to the current `privacy.html`.

## 34. Chrome Web Store developer account

- **Driver:** Publishing requires a one-time $5 Google Developer account tied to PulseVitals.
- **Success signal:** Developer account active under a PulseVitals-dedicated Google identity; payment cleared; dashboard reachable.

## 35. Landing page on a PulseVitals domain

- **Audience:** anyone arriving from a Web Store listing, SEO article, or word-of-mouth.
- **Why:** Listings convert better when a real website exists; the domain also hosts privacy / terms / support.
- **Success signal:** `pulsevitals.app` (or chosen TLD) resolves to a one-page site with headline, 2–3 feature screenshots, privacy policy link, and a support email.

## 37. Launch plan (ProductHunt / HN / seed SEO)

- **Audience:** the first 1,000 users — without a launch spike, organic discovery is glacial.
- **Why:** New Web Store listings start with no ranking and no reviews; external traffic seeds both.
- **Success signal:** `LAUNCH.md` with a dated checklist covering a ProductHunt day-of plan, a "Show HN" post, and 3 seed SEO articles on pulsevitals.app.

## 38. Cross-browser store listings (Edge / Brave / Opera)

- **Audience:** Chromium users not on Chrome — non-trivial share.
- **Why:** Same codebase ships to 3 more stores with marginal effort and gains 3 more discovery surfaces.
- **Success signal:** PulseVitals listed on Microsoft Edge Add-ons, Opera add-ons, and (if applicable) Brave directory.

## 40. Hosted terms of service page

- **Driver:** `terms.html` ships with v2.0 extension. Web Store listing needs a public URL — requires a domain (#35).
- **Success signal:** `https://pulsevitals.app/terms` resolves to the current `terms.html`.

## 42. Opt-in anonymous telemetry

- **Driver:** Without basic usage signals, it is impossible to tell which features are used. Requires a self-hosted or privacy-focused endpoint.
- **Success signal:** `chrome.runtime` dispatches opt-in events to the endpoint; kill switch visible in Options.

## 43. Privacy-respecting crash / error reporting

- **Driver:** Solo dev + no error reports = silent breakage → quiet uninstalls. Requires the same endpoint as #42.
- **Success signal:** A lightweight error boundary in each script logs redacted stack traces to the telemetry endpoint.

## 44. Support inbox + FAQ

- **Driver:** Web Store reviews and uninstall surveys direct users to a support contact.
- **Success signal:** `support@pulsevitals.app` inbox live; FAQ page covering install, permissions, and "why did my report not appear?"

---

# Post-v2.1 follow-ups (surfaced during the feature pass)

## 51. popup.js module split

- **Driver:** `popup.js` passed ~1,200 lines in v2.1. Flagged as non-blocking in v2.0 Code Review; v2.1 makes the refactor genuinely pressing before another feature pass lands.
- **Success signal:** `popup.js` split into themed files (`popup/util.js`, `popup/cwv.js`, `popup/insights.js`, `popup/third-party.js`, `popup/seo.js`, `popup/axe.js`, `popup/rum.js`, `popup/views.js`, `popup/export.js`) wired via either a flat import chain from `popup.html` or a bundler step in `scripts/package.sh`. No behaviour change.

## 52. Waterfall: full resource set + filter

- **Driver:** v2.1 waterfall shows top 10 by transfer size. For content-heavy pages ("why is LCP slow — is it that one 404?"), you want the full list filterable by type / size / slowest.
- **Success signal:** Waterfall section has a filter chip strip (All / Script / CSS / Image / XHR) and an optional "show all N resources" expander. Row click opens resource details inline.

## 53. Pin overlay: drag + corner position memory

- **Driver:** v2.1 pin is fixed bottom-right. Power users working in the same spot want to drag it (top-right for RTL, top-left above a fixed footer nav, etc.).
- **Success signal:** Pin can be dragged to any of four corners; chosen corner persists in `chrome.storage.sync` per user (not per tab).

## 54. Diff view: per-resource breakdown

- **Driver:** v2.1 diff aggregates resource changes into "Top resource" + "Total transfer" rows. Users iterating on specific files want to see which files changed.
- **Success signal:** Diff view gains a "Changed resources" table listing resources that appear in only one snapshot, resources whose transfer size changed ≥ 10 %, and those whose duration changed ≥ 100 ms.

## 55. Automated axe run for the popup in CI

- **Driver:** v1.7 Spec Review noted the axe run against the live popup was a manual step. Now that we have a local axe-lite library and options.html / batch.html / compare.html pages, the manual workload has grown.
- **Success signal:** `.github/workflows/ci.yml` runs headless axe-core against `popup.html`, `options.html`, `batch.html`, `compare.html` via Puppeteer and fails the build on any A/AA violation.

---

# Other backlog

*(nothing else currently open.)*

---

## How to promote a seed to an active plan

1. Copy the seed's three fields into a new entry under `## Plans` in the root `CLAUDE.md`.
2. Add a `Pipeline status` sub-list with all stages from `pipeline.md` set to `☐`.
3. Stage 1 (PM) owner begins immediately; tick each `☐` → `☑` as gates pass.
