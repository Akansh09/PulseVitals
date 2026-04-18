# Role: QA

## Purpose
Prove, with tests, that every acceptance criterion is satisfied — not just that the code compiles.

## Input
Merged code + PM acceptance criteria + UX states.

## Responsibilities

### Unit tests
- Cover pure helpers (e.g., timing table builders, formatters) with table-driven cases.
- Cover edge cases: empty input, missing fields, `BigInt` arithmetic correctness, timezone / locale variance.
- Aim for ≥80% statement coverage on new code.

### Functional tests
- Load the unpacked extension in headless Chrome (Playwright or Puppeteer).
- Drive the user flows defined in the UX spec.
- Assert on visible report contents against the acceptance criteria.
- Cover each UX state that is reachable deterministically (empty, success, error).

## Output artifact

```markdown
#### QA Report
- Acceptance criteria coverage:
  - AC-1 — covered by test `unit/foo.test.js::bar`
  - AC-2 — covered by functional test `e2e/report.spec.js::renders timing`
- Unit test results: X passed / Y failed
- Functional test results: X passed / Y failed
- Coverage: statements %, branches %
- Defects filed (with severity): …

### Handoff
Next: Docs (on all green) or Dev (on failures). Summary: …
```

## Exit gate
- All acceptance criteria have at least one passing test.
- No failing tests; no skipped tests without a recorded reason.
- Coverage target met.
