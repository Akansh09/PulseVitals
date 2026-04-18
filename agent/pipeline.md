# Delivery Pipeline

Every plan added to `CLAUDE.md` flows through the stages below **in order**. Each stage has a single responsibility, a defined input, a defined output, and an exit gate. A stage may only start when the prior stage's gate has passed.

```
┌────┐   ┌────┐   ┌──────────────────────┐   ┌──────────────┐   ┌───────────┐   ┌─────┐   ┌───────────────┐   ┌──────────────────┐   ┌────┐   ┌──────┐   ┌─────────────────┐
│ PM │ → │ UX │ → │ Mock / Prototype     │ → │ Spec Reviewer│ → │ Architect │ → │ Dev │ → │ Dev Code Rev. │ → │ Security Reviewer│ → │ QA │ → │ Docs │ → │ Release Manager │
│    │   │    │   │ Designer (MANUAL 🛑) │   │              │   │           │   │     │   │               │   │                  │   │    │   │      │   │                 │
└────┘   └────┘   └──────────────────────┘   └──────────────┘   └───────────┘   └─────┘   └───────────────┘   └──────────────────┘   └────┘   └──────┘   └─────────────────┘
                              ▲                      ▲                                          │                       │
                              │                      └──── rework loop ──────────────────────────┴───────────────────────┘
                              │
                   requires human sign-off
                   in the plan entry before
                   Spec Reviewer may start
```

## Stage contract

| # | Stage | Input | Output artifact | Exit gate |
|---|---|---|---|---|
| 1 | **PM** (`roles/pm.md`) | Plan entry in `CLAUDE.md` | Problem statement, goals, user stories, acceptance criteria | Stakeholder sign-off in the plan entry |
| 2 | **UX** (`roles/ux.md`) | PM artifact | User flow, wireframe / UI spec, accessibility notes | UX sign-off |
| 3 | **Mock / Prototype Designer** (`roles/mock-designer.md`) 🛑 | PM + UX artifacts | High-fidelity mock or clickable prototype of every UI surface, with all states and interaction notes | **Manual approval by human owner** — Claude may not self-pass this stage |
| 4 | **Spec Reviewer** (`roles/spec-reviewer.md`) | PM + UX + Mock artifacts | Review report with ✅ / ❌ per checklist | All ❌ resolved; artifacts mutually consistent |
| 5 | **Architect** (`roles/architect.md`) | Approved spec + mock | Technical design: data model, APIs, module boundaries, risks | Design doc approved |
| 6 | **Dev** (`roles/dev.md`) | Approved design | Code change + unit tests scaffold | Builds + lints pass locally |
| 7 | **Dev Code Reviewer** (`roles/dev-code-reviewer.md`) | Diff from Dev | Review comments | All blocking comments resolved |
| 8 | **Security Reviewer** (`roles/security-reviewer.md`) | Diff from Dev | Threat review, OWASP checklist | No high-severity findings |
| 9 | **QA** (`roles/qa.md`) | Merged code | Unit + functional test suite, test run report | All tests green, coverage target met |
| 10 | **Docs** (`roles/docs.md`) | Final code | Updated README, inline docs, changelog entry | Docs reviewed |
| 11 | **Release Manager** (`roles/release-manager.md`) | Green build + docs | Version bump, release notes, package artifact | Build tagged, artifact published |

## Gating rules

- **No stage may be skipped.** If a stage is genuinely not applicable (e.g., a pure docs change bypasses Architect), record an explicit "N/A — reason" entry in the plan so the skip is auditable.
- **Manual-approval stage:** Stage 3 (Mock / Prototype Designer) is the **only** stage Claude may never auto-pass. The human owner must type their handle into the `Approved by:` line and tick the approval checkbox inside the plan entry. Until then, Stage 4 (Spec Reviewer) does not start and the checkbox for Stage 3 stays unticked.
- **Rework loops** are expected: Code Review → Dev, QA → Dev, Security → Dev, Mock rejection → Mock Designer (and occasionally back to UX / PM if the mock exposes a spec-level ambiguity). A failed gate sends the artifact back to the authoring stage, never further back than needed.
- **Single source of truth:** each stage's artifact lives inside or linked from the plan entry in `CLAUDE.md`. Do not scatter artifacts across ad-hoc files. Exception: binary / large mock assets may live under `agent/prototypes/<plan-slug>/` and be linked from the plan entry.
- **Handoff format:** every artifact ends with a `### Handoff` section that names the next stage and summarises what the next agent needs to know in ≤5 bullets.

## Invocation

Stages are executed by invoking the corresponding role file as the agent persona. The assistant running the pipeline must read the role file before acting on behalf of that role — role files are authoritative over default behavior.

## Minimal pipeline for trivial changes

For typo-level or pure-refactor changes, a compressed pipeline is allowed: **Dev → Dev Code Reviewer → QA → Release Manager**. This must be justified in the plan entry ("compressed pipeline: typo fix"). Any change touching UI, data, or public API MUST run the full pipeline — including the Mock / Prototype Designer stage with manual approval.
