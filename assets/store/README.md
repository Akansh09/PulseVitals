# Store assets — screenshot & promo-tile guide

Real captures need a live Chrome window; this directory holds the inputs + the helper that produces them.

## Required captures

Chrome Web Store requires at least one 1280×800 (or 640×400) screenshot; up to five are allowed. Small / Large / Marquee promo tiles are optional but raise install rate.

| File | Target size | Contents |
|---|---|---|
| `screenshots/01-hero.png` | 1280 × 800 | Popup with a Good-verdict site — green CWV bar + clean Insights + "keep it up" empty state |
| `screenshots/02-3p-breakdown.png` | 1280 × 800 | Popup scrolled to the Third-party origins section, showing Google / Meta / HubSpot |
| `screenshots/03-batch-audit.png` | 1280 × 800 | batch.html with a populated 10-URL ranking |
| `screenshots/04-compare.png` | 1280 × 800 | compare.html with head-to-head + winning column highlighted |
| `screenshots/05-shared-report.png` | 1280 × 800 | The generated shared HTML opened in a second browser window |
| `promo/promo-440x280.png` | 440 × 280 | Small promo tile — brand mark + short tagline |
| `promo/promo-920x680.png` | 920 × 680 | Large promo tile — brand + headline + one feature callout |
| `promo/promo-1400x560.png` | 1400 × 560 | Marquee — brand, headline, 3 feature callouts |

## Capture helper

`capture.mjs` drives Puppeteer to load the unpacked extension in a clean Chrome profile, open each surface on sample pages (listed in `fixtures.json`), and save the PNGs at the target sizes. It is **not** wired into CI because it needs a headful-browser environment with your locale set.

### Requirements

```
node >= 20
npm i puppeteer
```

### Run

```
node assets/store/capture.mjs
```

The script expects the extension to live at the repo root; it will fail fast if `manifest.json` is not present in the current working directory.

### Fixtures

`assets/store/fixtures.json` maps each capture filename to a target URL + a popup view. Example entry:

```json
{
  "file": "screenshots/02-3p-breakdown.png",
  "url": "https://www.bbc.com/",
  "view": "third-party",
  "wait": 4000
}
```

Picking public URLs means the screenshots stay reproducible; PulseVitals reads whatever real metrics the page emits at capture time.

## Style guidance

- Use brand rose-red (`#E11D48`) accents.
- Prefer dark backgrounds for promo tiles (higher contrast in the Web Store grid).
- Keep the brand wordmark visible in every promo tile.
- Do not fabricate numbers — screenshots should be real captures of real pages.
- For the "Good verdict" hero, pick a fast static site (e.g., example.com or a small blog). For the "Poor verdict" third-party breakdown, pick a large news site — the breakdown is the point.

## Open items

- `capture.mjs` is a stub you can expand — it wires Puppeteer to the unpacked extension and takes one screenshot, but does not yet render every fixture. Once you have Puppeteer installed, it's ~50 lines to complete.
- Promo tiles are easier to hand-craft in Figma than screenshot. A Figma template would belong in a follow-up plan.
