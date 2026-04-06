# Integration Tests — Matrix, Agent Handle & Experiment Runner

## Summary
Enhanced integration test suite to 185 passing tests across two files: ExperimentMatrix generator (99 tests), AgentHandle with MockProvider (86 tests), including executeCell runner integration tests.

## Files Changed
- `tests/integration/matrix.test.ts` — 99 tests covering generateMatrix, filterMatrix, printMatrixSummary, matrix consistency, filter edge cases, and **executeCell runner**
- `tests/integration/agent-handle.test.ts` — 86 tests covering AgentHandle pipeline with baseline/hardened/ablated configs, edge case inputs, adversarial patterns, concurrent interactions, multi-model, and response validation

## Acceptance Criteria Status

### integration-tests-matrix
- ☑ tests/integration/matrix.test.ts exists with describe blocks for generateMatrix, filterMatrix, and printMatrixSummary
- ☑ Tests verify generateMatrix produces cells covering all 22 scenarios × 4 models × baseline+hardened × 10 reps
- ☑ filterMatrix tests verify filtering by scenario, category, model, and condition correctly reduces cell count
- ☑ Ablation cells test verifies each of 7 mitigations is ablated exactly once per scenario/model combination
- ☑ All 99 tests pass with `bun test tests/integration/matrix.test.ts`

### integration-tests-agent-handle
- ☑ tests/integration/agent-handle.test.ts exists testing createAgentHandle with various AgentConfig combinations
- ☑ Tests verify baseline agent (no mitigations) passes content through to MockProvider and returns response
- ☑ Tests verify hardened agent applies pre-processing mitigations and produces 'blocked' responses for adversarial content
- ☑ Tests verify content-type detection correctly identifies HTML, JSON, and plain text inputs
- ☑ Tests verify getToolCalls() and getDecision() track state across multiple sendTask() calls

## Test Breakdown

### matrix.test.ts (99 tests)
- **generateMatrix** (25 tests): cell counts, scenario coverage, model coverage, condition coverage, repetition indices, unique IDs/seeds, mitigation assignments, ablation verification, category distribution, compound cell validation
- **generateMatrix with compounds** (6 tests): compound cell inclusion, combined IDs, summary counts, condition coverage, mitigation assignments, total consistency
- **filterMatrix** (17 tests): scenario filter, category filter, model filter, condition filter, combined filters, edge cases, metadata preservation
- **filterMatrix edge cases** (6 tests): empty filter, double-filtering, disjoint sets, pair filtering, ablation-only filter, prefix-based matching
- **printMatrixSummary** (11 tests): header, all numeric fields, visual dividers, filtered output
- **printMatrixSummary formatting** (4 tests): box-drawing characters, multi-line, label alignment, reduced total
- **matrix invariants** (7 tests): valid scenario IDs, valid models, valid conditions, seed/rep ranges, ID encoding
- **matrix consistency** (4 tests): repeated generation, field completeness, JSON serialization, compound/ablation isolation
- **executeCell runner** (15 tests): baseline/hardened/ablated execution, metric structure, mitigationActive flag, observation data, error handling, cross-category execution, seed variation, multi-model, timestamp validation
- **171,191 expect() calls** — exhaustive verification over 8,000+ matrix cells

### agent-handle.test.ts (86 tests)
- **Baseline config** (18 tests): config properties, sendTask passthrough, determinism, state tracking
- **Hardened config** (18 tests): benign passthrough, adversarial blocking (6 vectors), HTML hidden elements, semantic manipulation, decision tracking
- **Ablated config** (5 tests): mitigation removal, cross-mitigation coverage, functional agent per ablation
- **Content-type detection** (6 tests): HTML, JSON, JSON array, plain text, whitespace, invalid JSON
- **Multi-model** (2 tests): all 4 models, token tracking per model
- **Token/latency tracking** (3 tests): accumulation, positivity, length scaling
- **Pipeline ordering** (3 tests): pre-block before LLM, benign passthrough, sequential integrity
- **Error handling** (2 tests): unknown mitigation, empty prompt
- **Config factories** (4 tests): baseline tools, hardened prompt, ablation removal, ablation inheritance
- **System prompt construction** (3 tests): baseline absence, validation mention, suspicious content mention
- **Edge case inputs** (7 tests): very long input, Unicode, special chars, whitespace-only, empty context, adversarial context in baseline/hardened
- **Adversarial pattern coverage** (6 tests): "you must now", "new instructions:", "disregard prior", AI/ASSISTANT prefix, benign mentions
- **Concurrent & sequential** (3 tests): rapid sequential, independent handles, parallel execution
- **All models hardened** (2 tests): adversarial blocking across 4 models, benign passthrough across 4 models
- **Response structure validation** (2 tests): normal response fields, blocked response structure
