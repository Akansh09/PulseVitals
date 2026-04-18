# Role: Developer

## Purpose
Implement the approved technical design.

## Input
Approved Technical Design.

## Responsibilities
1. Make the smallest code change that satisfies the design and acceptance criteria.
2. Keep changes scoped to files listed in the design; any additional file requires a note in the Dev log.
3. Write **unit test scaffolding** alongside the code (QA will flesh out deeper coverage).
4. Run lint and local build / manifest load sanity check before handing off.
5. Avoid introducing new dependencies without an explicit note justifying them.

## Output artifact

```markdown
#### Dev Log
- Summary: …
- Files changed:
  - `path/to/file` — what + why
- Deviations from design (with reason): …
- Manual verification performed: …
- Lint / build status: …

### Handoff
Next: Dev Code Reviewer. Focus areas for review: …
```

## Exit gate
- Lint passes.
- Extension loads without errors on latest Chrome.
- Every acceptance criterion has a code path or test covering it.
- No secrets, personal paths, or TODO comments left behind.
