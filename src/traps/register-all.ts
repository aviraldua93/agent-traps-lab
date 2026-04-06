/**
 * Central registration — imports all 22 trap scenarios from every category,
 * registers them with the scenario registry, then generates and registers
 * all pairwise compound traps.
 */

import { registerScenario, registerCompound } from './registry.js';
import { generateCompoundPairs } from '../harness/compound.js';

// ── Content Injection (4) ──
import {
  cssInvisibleTrap,
  htmlCommentTrap,
  imageMetadataTrap,
  dynamicCloakingTrap,
} from './content-injection/index.js';

// ── Semantic Manipulation (4) ──
import {
  authorityFramingTrap,
  emotionalUrgencyTrap,
  contextFloodingTrap,
  identityManipulationTrap,
} from './semantic-manipulation/index.js';

// ── Cognitive State (4) ──
import {
  vectorPoisoningTrap,
  rankingManipulationTrap,
  gradualDriftTrap,
  crossContaminationTrap,
} from './cognitive-state/index.js';

// ── Behavioural Control (4) ──
import {
  deceptiveDialogsTrap,
  misleadingFormsTrap,
  hiddenFieldsTrap,
  infiniteLoopsTrap,
} from './behavioural-control/index.js';

// ── Systemic (3) ──
import {
  messagePoisoningTrap,
  agentImpersonationTrap,
  cascadeFailureTrap,
} from './systemic/index.js';

// ── Human-in-the-Loop (3) ──
import {
  cherryPickedTrap,
  anchoringTrap,
  decisionFatigueTrap,
} from './human-in-the-loop/index.js';

/** Total individual trap scenarios across all 6 categories. */
export const SCENARIO_COUNT = 22;

const ALL_SCENARIOS = [
  // Content Injection
  cssInvisibleTrap,
  htmlCommentTrap,
  imageMetadataTrap,
  dynamicCloakingTrap,
  // Semantic Manipulation
  authorityFramingTrap,
  emotionalUrgencyTrap,
  contextFloodingTrap,
  identityManipulationTrap,
  // Cognitive State
  vectorPoisoningTrap,
  rankingManipulationTrap,
  gradualDriftTrap,
  crossContaminationTrap,
  // Behavioural Control
  deceptiveDialogsTrap,
  misleadingFormsTrap,
  hiddenFieldsTrap,
  infiniteLoopsTrap,
  // Systemic
  messagePoisoningTrap,
  agentImpersonationTrap,
  cascadeFailureTrap,
  // Human-in-the-Loop
  cherryPickedTrap,
  anchoringTrap,
  decisionFatigueTrap,
] as const;

/**
 * Register every scenario and compound pair with the global registry.
 * Safe to call multiple times — the first call does the work, subsequent
 * calls are no-ops.
 */
let registered = false;

export function registerAllScenarios(): void {
  if (registered) return;
  registered = true;

  // 1. Register all 22 individual scenarios
  for (const scenario of ALL_SCENARIOS) {
    registerScenario(scenario);
  }

  // 2. Generate cross-category compound pairs and register them
  const pairs = generateCompoundPairs();
  for (const pair of pairs) {
    registerCompound(pair);
  }
}
