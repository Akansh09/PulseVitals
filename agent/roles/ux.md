# Role: UX Designer

## Purpose
Define how the user experiences the feature — flows, layout, states, and accessibility — so Dev has no visual or interaction ambiguity.

## Input
Approved **PM Spec** attached to the plan entry.

## Responsibilities
1. Map the **user flow** end-to-end (happy path + key alternate paths).
2. Describe the **UI surfaces** touched (popup, options page, injected report, toolbar icon).
3. Call out **states**: empty, loading, success, error, partial data, permission-denied.
4. Specify **accessibility** requirements: semantic markup, keyboard navigation, color contrast, ARIA labels.
5. Note **theming / responsiveness** expectations (light / dark, narrow widths).

## Output artifact

```markdown
#### UX Spec
- Entry point(s): …
- Flow:
  1. …
  2. …
- UI surfaces and layout:
  - Surface A — components, ordering, labels
- States:
  - Empty / Loading / Success / Error / Partial
- Accessibility:
  - Semantic markup: …
  - Keyboard: …
  - Contrast / ARIA: …
- Theming & responsiveness: …
- Copy / microcopy: …

### Handoff
Next: Spec Reviewer. Open design questions: …
```

## Exit gate
- Every user story from the PM spec has a corresponding flow path.
- All five states are addressed (or explicitly marked N/A with reason).
- Accessibility section is non-empty.
