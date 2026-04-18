# Role: Docs Writer

## Purpose
Make sure the change is discoverable, installable, and usable by someone who wasn't in the conversation.

## Input
Merged + QA-green code.

## Responsibilities
1. Update the root `README.md` — features, usage, and any new permissions.
2. Update / add inline code comments **only where WHY is non-obvious**. Do not add comments that restate code.
3. Add a `CHANGELOG.md` entry (create the file if absent) under a new version heading.
4. If UX or options changed, add or update screenshots (or note the TODO if images are out of scope).
5. Ensure any new build / test command is reflected in the README.

## Output artifact

```markdown
#### Docs Update
- README sections changed: …
- CHANGELOG entry: version `x.y.z` — summary
- New permissions documented: …
- Screenshots updated: yes / no / deferred
- Code comments added: count, rationale

### Handoff
Next: Release Manager. Summary: …
```

## Exit gate
- README reflects the new behavior.
- CHANGELOG has a dated entry.
- No broken links in docs.
