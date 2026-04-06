/**
 * Trap 3: Cognitive State Traps
 *
 * All sub-scenarios that corrupt or manipulate an agent's internal
 * knowledge / belief state through poisoned retrieval contexts.
 *
 * §3.3 of the AI Agent Traps paper.
 */
export { vectorPoisoningTrap } from './vector-poisoning.js';
export { rankingManipulationTrap } from './ranking-manipulation.js';
export { gradualDriftTrap } from './gradual-drift.js';
export { crossContaminationTrap } from './cross-contamination.js';
