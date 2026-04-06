# agent-traps-lab — Copilot Instructions

## Project Context
This is an empirical testbed for validating DeepMind's "AI Agent Traps" paper (SSRN 6372438).
It's the 4th project in a multi-agent portfolio: a2a-crews → ag-ui-crews → rag-a2a → **agent-traps-lab**.

## Architecture
- `src/traps/` — 22 adversarial scenarios across 6 categories (content-injection, semantic-manipulation, cognitive-state, behavioural-control, systemic, human-in-the-loop)
- `src/agents/` — Test subject agent configs (baseline, hardened, ablated)
- `src/mitigations/` — 7 defense modules (one per trap category + cross-cutting)
- `src/harness/` — Experiment runner, matrix generator, metrics, statistics, reporter
- `src/a2a/` — A2A protocol integration (bridge client, trap server, observer)
- `src/integrations/` — rag-a2a, ag-ui-crews, a2a-crews bridges
- `src/review/` — Research paper review crew config

## Key Conventions
- TypeScript + Bun (matching a2a-crews conventions)
- Every trap scenario implements `TrapScenario` interface from `src/traps/types.ts`
- Every mitigation implements `Mitigation` interface from `src/mitigations/types.ts`
- Statistical rigor: 10 reps, Bonferroni correction, Cohen's d, Wilcoxon signed-rank
- Results go in `results/{run-id}/` with JSON + LaTeX assets

## Experiment Matrix
22 scenarios × 4 models × 3 conditions × 10 reps = 3,480+ experiment runs.

## Testing
- `bun test` for unit tests
- Playwright for E2E
- Every new trap scenario needs unit tests in `tests/unit/traps/`
- Every new mitigation needs unit tests in `tests/unit/mitigations/`

## Dogfooding
This project is built using a2a-crews. Use `crews plan` for new features.
The review crew in `src/review/review-crew.json` reviews the research paper.

## Research Paper
Paper source in `paper/`. Target: USENIX Security 2027.
Every experiment result must have: N, mean±std, 95% CI, p-value, Cohen's d.
