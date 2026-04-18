# PulseVitals Design System — v1

Source of truth for visual tokens used by every plan's Mock / Prototype Designer stage and any Dev stage that writes styles. Approved 2026-04-17 under the plan *Design System Doc — foundational tokens for PulseVitals* in `CLAUDE.md > Plans`.

Motif: clinical signal / vital sign. Tone: credible, technical, friendly — never consumer-flashy.

## How to use this doc

- Mock Designer: reference tokens by name (e.g., `color/accent/pulse`). Do not invent new ones without proposing an addition in the Mock artifact and updating this file in the same plan.
- Dev: paste the raw values straight into CSS / inline styles. Tokens are the names; values here are the implementation.
- Spec Reviewer: verifies that a mock references only documented tokens, and that any additions are captured here.

## Color

Every foreground-on-surface pair used for body text meets **WCAG AA (≥ 4.5 : 1)**. Contrast ratios are computed against `color/bg/surface`.

| Token | Light (hex) | Dark (hex) | Use | Contrast on `bg/surface` |
|---|---|---|---|---|
| `color/bg/surface` | `#FFFFFF` | `#0B0F14` | Default background | — |
| `color/bg/subtle` | `#F5F7FA` | `#131820` | Cards, report rows | — |
| `color/fg/primary` | `#0F172A` | `#E6EDF3` | Body text | 16.1 : 1 |
| `color/fg/muted` | `#475569` | `#94A3B8` | Secondary text | 7.5 : 1 |
| `color/accent/pulse` | `#E11D48` | `#F43F5E` | Brand mark, primary CTA, focus ring | 5.4 : 1 |
| `color/signal/good` | `#16A34A` | `#22C55E` | Core Web Vitals — pass | 4.9 : 1 |
| `color/signal/warn` | `#D97706` | `#F59E0B` | CWV — needs improvement | 4.7 : 1 |
| `color/signal/bad` | `#DC2626` | `#EF4444` | CWV — fail, destructive action | 5.9 : 1 |
| `color/border/default` | `#E2E8F0` | `#1F2933` | Dividers, card borders | — |

Rules:

- `color/accent/pulse` is reserved for brand, primary CTA, and the focus ring. It is **not** used for destructive actions — use `color/signal/bad` there.
- Signal colors mirror Google's Search Console / PageSpeed threshold colors so users recognise them without learning.
- Dark-mode values are declared here so seed #9 (theme toggle) can wire them without re-negotiating the palette.

## Typography

System font stack — **zero font-download cost**, aligned with seed #46 (self-performance budget). An extension that measures performance must not itself download fonts.

| Token | Value | Use |
|---|---|---|
| `font/family/sans` | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` | All UI text |
| `font/family/mono` | `ui-monospace, SFMono-Regular, Menlo, monospace` | Timing numbers, code |
| `font/size/xs` | `0.75rem` (12 px) | Caption, legal |
| `font/size/sm` | `0.875rem` (14 px) | Secondary body |
| `font/size/base` | `1rem` (16 px) | Body |
| `font/size/lg` | `1.125rem` (18 px) | Subheading |
| `font/size/xl` | `1.5rem` (24 px) | Section heading |
| `font/size/2xl` | `2rem` (32 px) | Page / popup title |
| `font/weight/regular` | `400` | Body |
| `font/weight/medium` | `500` | Labels, nav |
| `font/weight/semibold` | `600` | Headings, primary buttons |

Rules:

- Labels use sentence case, not Title Case. Buttons use sentence case.
- Numbers in performance reports (ms, bytes, scores) use `font/family/mono` so columns align.

## Spacing

4 px base unit. Tailwind / Material aligned — lowers paste-in friction for Dev.

| Token | Value | Use |
|---|---|---|
| `space/1` | `4px` | Tight inline gaps |
| `space/2` | `8px` | Default inline gap |
| `space/3` | `12px` | Row padding |
| `space/4` | `16px` | Card padding, default vertical stack gap |
| `space/6` | `24px` | Section gap |
| `space/8` | `32px` | Block / region gap |

## Focus & interactive state

- `focus/ring`: `2px` solid outline, `2px` offset, `color/accent/pulse` at 60 % opacity.
- Applied on `:focus-visible` (not `:focus`) so keyboard users always see it and mouse users don't see it on click.
- Every interactive element MUST render this ring.
- Minimum tap target: `44 × 44 px`. Pad the interactive area when the visual element is smaller.

## Icon style

- Outline style — **not** filled.
- Stroke: `1.5 px`, `currentColor` so icons inherit text color.
- Size: inherits from `font-size`.
- Source: Lucide or Heroicons (outline). Custom icons MUST match stroke weight and corner rounding.

## Accessibility

- Body text contrast ≥ 4.5 : 1 against its surface token (table above).
- Focus-ring contrast ≥ 3 : 1 against adjacent surfaces.
- Information is **never** conveyed by color alone. CWV states always pair a swatch with a label and / or icon.
- Motion: respect `prefers-reduced-motion: reduce` — disable non-essential transitions.

## How to extend

Adding a token mid-plan is allowed but must follow this sequence:

1. Propose the new token in the plan's Mock / Prototype artifact with name, value, use, and rationale.
2. Mark it `(proposed)` until the human approves the Mock.
3. On approval, the same plan's Dev stage updates this file to add the token.
4. Spec Reviewer's checklist ("design-system additions captured in `agent/design-system.md`") must be ticked before the plan proceeds.

## Version history

- **v1** — 2026-04-17. Initial palette, typography, spacing, focus, and icon rules. Approved in `CLAUDE.md > Plans > Design System Doc`.
