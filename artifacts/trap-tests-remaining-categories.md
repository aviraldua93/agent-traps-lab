# Task: trap-tests-remaining-categories

## Summary
Created/fixed comprehensive unit tests for all 14 remaining trap scenarios across 4 categories: cognitive-state (4), behavioural-control (4), systemic (3), human-in-the-loop (3). Total: 155 tests across 4 files.

## Files Changed
- `tests/unit/traps/cognitive-state.test.ts` — **Existing, verified** (46 tests)
- `tests/unit/traps/behavioural-control.test.ts` — **Existing, fixed 3 failing tests** (40 tests)
- `tests/unit/traps/systemic.test.ts` — **Created** (33 tests)
- `tests/unit/traps/human-in-the-loop.test.ts` — **Created** (36 tests)

## Test Coverage by Category

### Cognitive State (46 tests)
- **vector-poisoning**: 14 tests (6 setup, 4 execute, 3 evaluate, 1 teardown)
- **ranking-manipulation**: 11 tests (4 setup, 4 execute, 2 evaluate, 1 teardown)
- **gradual-drift**: 11 tests (4 setup, 3 execute, 3 evaluate, 1 teardown)
- **cross-contamination**: 10 tests (4 setup, 2 execute, 3 evaluate, 1 teardown)

### Behavioural Control (40 tests)
- **deceptive-dialogs**: 10 tests (4 setup, 3 execute, 2 evaluate, 1 teardown)
- **misleading-forms**: 10 tests (4 setup, 3 execute, 2 evaluate, 1 teardown)
- **hidden-fields**: 10 tests (4 setup, 3 execute, 2 evaluate, 1 teardown)
- **infinite-loops**: 10 tests (4 setup, 2 execute, 3 evaluate, 1 teardown)

### Systemic (33 tests)
- **message-poisoning**: 11 tests (4 setup, 4 execute, 2 evaluate, 1 teardown)
- **agent-impersonation**: 11 tests (4 setup, 3 execute, 2 evaluate, 1 teardown)
- **cascade-failure**: 13 tests (4 setup, 3 execute, 4 evaluate, 1 teardown)

### Human-in-the-Loop (36 tests)
- **cherry-picked**: 13 tests (5 setup, 4 execute, 3 evaluate, 1 teardown)
- **anchoring**: 11 tests (4 setup, 3 execute, 3 evaluate, 1 teardown)
- **decision-fatigue**: 12 tests (5 setup, 3 execute, 3 evaluate, 1 teardown)

## Acceptance Criteria Status
- ☑ cognitive-state.test.ts, behavioural-control.test.ts, systemic.test.ts, and human-in-the-loop.test.ts all exist
- ☑ vector-poisoning test verifies that poisoned facts (e.g., '6.2 billion' for earth_age) are correctly set up in resources
- ☑ cascade-failure evaluate test verifies cascadeDepth and blastRadius metrics are computed from the observation's agentAction pattern
- ☑ cherry-picked setup test verifies that only 3 of 10 data points appear in the report while the full dataset has 10
- ☑ Total test count across all 4 files is 155 (≥56 required: 14 scenarios × 4+ lifecycle tests each)
