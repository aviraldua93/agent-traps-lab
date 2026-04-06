/**
 * Barrel file — re-exports everything from all trap categories,
 * the registry, types, and the central registration function.
 */

// Registration
export { registerAllScenarios, SCENARIO_COUNT } from './register-all.js';

// Registry API
export {
  registerScenario,
  registerCompound,
  getScenario,
  listScenarios,
  listCompounds,
  getScenariosByCategory,
  registrySummary,
} from './registry.js';

// Types
export type * from './types.js';

// ── Category re-exports ──
export {
  cssInvisibleTrap,
  htmlCommentTrap,
  imageMetadataTrap,
  dynamicCloakingTrap,
} from './content-injection/index.js';

export {
  authorityFramingTrap,
  emotionalUrgencyTrap,
  contextFloodingTrap,
  identityManipulationTrap,
} from './semantic-manipulation/index.js';

export {
  vectorPoisoningTrap,
  rankingManipulationTrap,
  gradualDriftTrap,
  crossContaminationTrap,
} from './cognitive-state/index.js';

export {
  deceptiveDialogsTrap,
  misleadingFormsTrap,
  hiddenFieldsTrap,
  infiniteLoopsTrap,
} from './behavioural-control/index.js';

export {
  messagePoisoningTrap,
  agentImpersonationTrap,
  cascadeFailureTrap,
} from './systemic/index.js';

export {
  cherryPickedTrap,
  anchoringTrap,
  decisionFatigueTrap,
} from './human-in-the-loop/index.js';
