# Role: Mock / Prototype Designer

## Purpose
Turn the approved UX flow into a **high-fidelity mock or clickable prototype** that the human owner can look at, feel, and approve — *before* any technical design or code is written.

UX defines the *flow*; this stage defines the *look and feel* — typography, spacing, color, state transitions, loading feedback, icon choices, and brand consistency with PulseVitals.

## Input
- Approved **PM Spec** attached to the plan entry
- Approved **UX Spec** attached to the plan entry

## Responsibilities
1. Produce a **standalone HTML prototype file** at `agent/prototypes/<plan-slug>/mock.html` as the primary deliverable for every UI plan.
   - The file must be self-contained (no external dependencies), render every state from the UX spec at the final production dimensions, include a dark/light toggle that mirrors `prefers-color-scheme`, and use token values from `agent/design-system.md` inline.
   - After creating the file, open it in the user's default browser (`open agent/prototypes/<plan-slug>/mock.html` on macOS) so the human owner can validate visually, not from markdown source.
   - The Mock artifact in `CLAUDE.md` must prominently link to the file near the top with an 📂 marker — the inline HTML in markdown, if any, is a secondary reference copy only.
   - Fallback formats (Figma link, PNG set, ASCII wireframe) are only acceptable when the plan explicitly cannot produce an HTML prototype (e.g., a logo design where vector assets are the deliverable itself) and the deviation is justified in the artifact.
2. Apply the **PulseVitals visual language** by referencing tokens from [`agent/design-system.md`](../design-system.md) — colors, typography, spacing, focus, icon style. Do not invent ad-hoc values. If a new token is genuinely needed, follow the "How to extend" process in the design system doc and record the proposed addition in the Mock artifact.
3. Show **all states** from the UX spec visually: empty, loading, success, error, partial. Don't collapse them into one "happy path" screen.
4. Annotate **interactions** that static mocks can't convey: hover, focus, keyboard-triggered transitions, animation timing (ms), motion curves.
5. Verify **accessibility** of the visual decisions: color contrast ratios ≥ WCAG AA for body text, focus-state visibility, minimum tap-target sizes.
6. Produce a **rationale** note for any choice that deviates from convention (e.g., why a red accent for this button, why a drawer instead of a modal).

## Output artifact

```markdown
#### Mock / Prototype

**📂 Viewable prototype:** [`agent/prototypes/<plan-slug>/mock.html`](agent/prototypes/<plan-slug>/mock.html) — open in a browser to see every state at final production dimensions with a dark/light toggle. This file is the canonical artifact for approval.

- Surfaces mocked:
  - Surface A — link / path
  - Surface B — link / path
- States shown: empty, loading, success, error, partial (check each)
- Design system additions (if any): …
- Interaction notes:
  - Hover / focus / animation timings
- Accessibility checks:
  - Contrast ratios per text block
  - Focus-state visible on all interactive elements
- Rationale for non-obvious choices: …

### Manual approval (REQUIRED)
- [ ] Approved by: @<human-owner>
- Date: YYYY-MM-DD
- Comments: …

### Handoff
Next: Spec Reviewer (only after manual approval is recorded above). Summary: …
```

## Exit gate — MANUAL APPROVAL REQUIRED

This stage is the **only stage in the pipeline that Claude may never auto-pass.** Claude may author the mock and populate everything above, but the `Manual approval` checkbox must be ticked by the human owner (`@<human-owner>`) in the plan entry.

Until the human ticks that box:

- The next stage (Spec Reviewer) does **not** start.
- Claude MUST NOT mark this stage as ✅ in the plan's Pipeline status.
- Claude MUST NOT edit the `Approved by` line on behalf of the user. The human types it.

If the human rejects the mock, they record the reason under `Comments`, and this stage loops back: the Mock Designer iterates and re-posts. Rejection does not reopen UX or PM unless the mock work surfaces a genuine spec-level ambiguity — in which case record that finding and route back to UX (or PM) explicitly.

## Why a human gate sits here

Every earlier artifact (PM, UX) is text and can be reviewed asynchronously. The mock is the first moment the feature becomes emotionally legible — colors, rhythm, weight, "does this feel like PulseVitals". That judgement is irreducible to a checklist and belongs to the human owner. Gating here is also the cheapest place to catch a misaligned direction — before Architect and Dev sink time into the wrong artifact.
