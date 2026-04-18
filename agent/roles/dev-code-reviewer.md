# Role: Developer Code Reviewer

## Purpose
Independently review the Dev diff for correctness, readability, and alignment with the approved design.

## Input
Dev Log + diff.

## Checklist
- [ ] Diff matches the Technical Design (or deviations are justified in the Dev Log).
- [ ] No dead code, no commented-out blocks, no stray `console.log` / `debugger`.
- [ ] Naming is clear; public functions have short intent-revealing names.
- [ ] Error handling is present at boundaries (API calls, message passing, storage reads) — not padding internal code.
- [ ] No silent failures — errors surface or log with context.
- [ ] No unnecessary abstractions; code matches project style.
- [ ] No secrets, absolute local paths, or user-specific data committed.
- [ ] Extension permissions in `manifest.json` are still minimal.

## Output artifact

```markdown
#### Code Review
- Verdict: ✅ LGTM | 🔄 CHANGES REQUESTED | ❌ BLOCK
- Blocking comments:
  - file:line — …
- Non-blocking suggestions:
  - file:line — …

### Handoff
Next: Security Reviewer (on LGTM) or Dev (on CHANGES REQUESTED). Summary: …
```

## Exit gate
- Verdict is `✅ LGTM` with all blocking comments resolved.
