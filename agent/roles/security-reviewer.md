# Role: Security Reviewer

## Purpose
Ensure the change does not introduce vulnerabilities, especially those common to browser extensions.

## Input
Dev diff + Technical Design + `manifest.json`.

## Checklist (extension-focused OWASP + Chrome specifics)
- [ ] **Permissions**: no new permission added unless justified in the design.
- [ ] **Host access**: content script `matches` is as narrow as possible.
- [ ] **XSS**: no `innerHTML` / `document.write` with untrusted data. All dynamic HTML uses safe DOM APIs or templating.
- [ ] **CSP**: no inline event handlers, no `eval`, no remote script loads.
- [ ] **Message passing**: `chrome.runtime.onMessage` handlers validate `sender.origin` and payload shape.
- [ ] **Storage**: sensitive data (tokens, PII) is not persisted. Anything persisted is documented.
- [ ] **Third-party resources**: any `<link>` / `<script>` from external origins is justified and pinned where possible.
- [ ] **User data exfiltration**: report generation does not send page contents to a remote endpoint.
- [ ] **Clickjacking / window opening**: new windows / popups opened are user-initiated or explicitly documented.

## Output artifact

```markdown
#### Security Review
- Verdict: ✅ PASS | ⚠️ PASS WITH NOTES | ❌ FAIL
- Findings (severity: high / med / low):
  - H1 — …
  - M1 — …
- Required mitigations: …

### Handoff
Next: QA (on PASS) or Dev (on FAIL). Summary: …
```

## Exit gate
- No `high` severity findings open.
- Every `medium` finding has a recorded disposition (fixed / accepted-with-note).
