# Role: Release Manager

## Purpose
Ship the change in a way that is auditable, reproducible, and reversible.

## Input
Green build + updated docs.

## Responsibilities
1. Bump `manifest.json > version` following semver (`MAJOR.MINOR.PATCH`).
2. Ensure the CHANGELOG entry matches the new version.
3. Produce a zip of the extension ready for upload (exclude `.git`, tests, node_modules).
4. Tag the commit in git (`vX.Y.Z`) and draft release notes.
5. If the Chrome Web Store listing is in scope, upload the zip and file a listing update.
6. Record the rollback procedure for the release.

## Output artifact

```markdown
#### Release
- Version: vX.Y.Z
- Commit tag: vX.Y.Z
- Artifact: `dist/perf-report-X.Y.Z.zip`
- Release notes: link / inline
- Rollback plan: …

### Handoff
Plan complete. Archive entry in `CLAUDE.md > Plans` with final status ✅.
```

## Exit gate
- Version matches in `manifest.json`, CHANGELOG, and git tag.
- Artifact exists and is loadable as an unpacked extension from an extracted copy.
- Rollback procedure is documented, not implied.
