# Contributing to agent-traps-lab

## Dogfood Rule
Use a2a-crews to develop features when scope warrants it (2+ files, complex scenarios).

## Development Setup
```bash
git clone https://github.com/aviraldua93/agent-traps-lab.git
cd agent-traps-lab
bun install
bun test
```

## Adding a New Trap Scenario

1. Create a file in `src/traps/{category}/` implementing `TrapScenario`
2. Register it in `src/traps/registry.ts`
3. Add adversarial datasets to `datasets/`
4. Write unit tests in `tests/unit/traps/`
5. Add evaluation criteria in the scenario's `evaluate()` method

Every scenario MUST have:
- `setup()` → creates reproducible adversarial environment (seed-based)
- `execute()` → deploys agent, captures behavior
- `evaluate()` → computes metrics
- `teardown()` → cleans up

## Adding a New Mitigation

1. Implement `Mitigation` interface in `src/mitigations/`
2. Register in the mitigation registry
3. Add to the `ALL_MITIGATIONS` list in `src/harness/matrix.ts`
4. Write unit tests in `tests/unit/mitigations/`
5. Update hardened agent config in `src/agents/types.ts`

## Statistical Requirements

Every experiment result published in the paper MUST include:
- N (sample size per cell)
- Mean ± standard deviation
- 95% confidence interval
- p-value (Wilcoxon signed-rank test)
- Cohen's d effect size
- Bonferroni-corrected significance

## Branch Strategy
```
main     ← stable
develop  ← integration
feature/* ← feature branches off develop
experiment/* ← experiment branches for specific runs
```

## Paper Review Process
After each paper draft revision:
```bash
bun run review
```
This launches the 7-agent review crew. Address all "required" items from meta-review before merging.
