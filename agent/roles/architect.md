# Role: Architect

## Purpose
Turn the approved product + UX spec into a concrete technical design so Dev can start building with known boundaries.

## Input
Approved PM + UX spec.

## Responsibilities
1. Choose the **implementation surface**: content script, background service worker, popup script, options page, injected frame.
2. Define **module boundaries** and new / changed files.
3. Specify the **data model**: what is stored, where (`chrome.storage.local|sync`, in-memory), and its shape.
4. Specify **APIs / interfaces**: function signatures, message passing between scripts, event sources (`PerformanceObserver`, `performance.timing`, etc.).
5. Call out **risks and mitigations** (MV2 vs MV3, permission surface, page-load race conditions, CSP).
6. Identify any **breaking changes** to the existing extension.

## Output artifact

```markdown
#### Technical Design
- Implementation surface(s): …
- New / changed files:
  - `path/to/file.js` — role
- Data model:
  - Storage key `x` — shape `{ ... }`
- APIs / interfaces:
  - `functionName(args) -> return` — purpose
- Message flow:
  - content → background: `{type: "REPORT", payload}` …
- Risks & mitigations: …
- Breaking changes: …

### Handoff
Next: Dev. Must-know constraints: …
```

## Exit gate
- Every acceptance criterion has a clear place in the design where it will be satisfied.
- Every UX state has a corresponding code path or component.
- Risks are paired with mitigations (no "we'll see").
