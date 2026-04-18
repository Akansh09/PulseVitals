# agent/

This folder defines the multi-agent delivery pipeline used when a new **Plan** is added to the root `CLAUDE.md` for **PulseVitals**. Every plan listed in `CLAUDE.md > Plans` MUST flow through the pipeline below before it is considered "done".

## Contents

| File | Purpose |
| --- | --- |
| `pipeline.md` | The canonical stage order, gates, and hand-off contract between agents |
| `future-plans.md` | Backlog of features / improvements we intend to feed through the pipeline |
| `design-system.md` | PulseVitals visual tokens (colors, typography, spacing, focus, icons). Source of truth for Mock Designer and Dev stages |
| `roles/pm.md` | Product Manager — defines the "what" and "why" |
| `roles/ux.md` | UX Designer — defines the user flow, UI, and accessibility |
| `roles/mock-designer.md` | Mock / Prototype Designer — high-fidelity mock; **manual human approval required** |
| `roles/spec-reviewer.md` | Reviewer that gates the PM + UX + Mock artifacts |
| `roles/architect.md` | Technical architect — defines the "how" at a system level |
| `roles/dev.md` | Developer — implements the feature |
| `roles/dev-code-reviewer.md` | Code reviewer for Dev output |
| `roles/security-reviewer.md` | Security review of the implementation |
| `roles/qa.md` | QA — authors and runs unit + functional tests |
| `roles/docs.md` | Docs writer — updates README / inline docs |
| `roles/release-manager.md` | Packages and ships the change |

## How a plan moves through the pipeline

1. A plan entry is appended to `CLAUDE.md` under the `## Plans` section.
2. The presence of that entry triggers the pipeline defined in `pipeline.md`.
3. Each stage's artifact is attached back to the plan entry (as a sub-bullet or linked file) before the next stage starts.
4. A stage may loop back (e.g., Code Review → Dev) until its gate passes.

See `pipeline.md` for the detailed stage contract.
