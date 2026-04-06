# Integration Tests — Matrix & Agent Handle

## Summary
Created 131 passing integration tests across two test files covering the ExperimentMatrix generator (68 tests) and AgentHandle with MockProvider (63 tests).

## Files Changed
- `tests/integration/matrix.test.ts` — 68 tests for generateMatrix, filterMatrix, printMatrixSummary
- `tests/integration/agent-handle.test.ts` — 63 tests for AgentHandle pipeline with baseline/hardened/ablated configs

## Acceptance Criteria Status

### integration-tests-matrix
- ☑ tests/integration/matrix.test.ts exists with describe blocks for generateMatrix, filterMatrix, and printMatrixSummary
- ☑ Tests verify generateMatrix produces cells covering all 22 scenarios × 4 models × baseline+hardened × 10 reps
- ☑ filterMatrix tests verify filtering by scenario, category, model, and condition correctly reduces cell count
- ☑ Ablation cells test verifies each of 7 mitigations is ablated exactly once per scenario/model combination
- ☑ All 68 tests pass with `bun test tests/integration/matrix.test.ts`

### integration-tests-agent-handle
- ☑ tests/integration/agent-handle.test.ts exists testing createAgentHandle with various AgentConfig combinations
- ☑ Tests verify baseline agent (no mitigations) passes content through to MockProvider and returns response
- ☑ Tests verify hardened agent applies pre-processing mitigations and produces 'blocked' responses for adversarial content
- ☑ Tests verify content-type detection correctly identifies HTML, JSON, and plain text inputs
- ☑ Tests verify getToolCalls() and getDecision() track state across multiple sendTask() calls

## Test Breakdown

### matrix.test.ts (68 tests)
- **generateMatrix** (22 tests): cell counts, scenario coverage, model coverage, condition coverage, repetition indices, unique IDs/seeds, mitigation assignments, ablation verification, category distribution
- **generateMatrix with compounds** (6 tests): compound cell inclusion, combined IDs, summary counts, condition coverage, mitigation assignments, total consistency
- **filterMatrix** (17 tests): scenario filter, category filter, model filter, condition filter, combined filters, edge cases, metadata preservation
- **printMatrixSummary** (11 tests): header, all numeric fields, visual dividers, filtered output
- **matrix invariants** (7 tests): valid scenario IDs, valid models, valid conditions, seed/rep ranges, ID encoding
- **125,693 expect() calls** — exhaustive verification over 8,000 matrix cells

### agent-handle.test.ts (63 tests)
- **Baseline config** (18 tests): config properties, sendTask passthrough, determinism, state tracking
- **Hardened config** (18 tests): benign passthrough, adversarial blocking (6 vectors), HTML hidden elements, semantic manipulation, decision tracking
- **Ablated config** (5 tests): mitigation removal, cross-mitigation coverage, functional agent per ablation
- **Content-type detection** (6 tests): HTML, JSON, JSON array, plain text, whitespace, invalid JSON
- **Multi-model** (2 tests): all 4 models, token tracking per model
- **Token/latency tracking** (3 tests): accumulation, positivity, length scaling
- **Pipeline ordering** (3 tests): pre-block before LLM, benign passthrough, sequential integrity
- **Error handling** (2 tests): unknown mitigation, empty prompt
- **Config factories** (4 tests): baseline tools, hardened prompt, ablation removal, ablation inheritance
