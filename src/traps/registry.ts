import type { TrapScenario, TrapCategory, ScenarioId, CompoundTrap } from './types.js';

const scenarios = new Map<ScenarioId, TrapScenario>();
const compounds = new Map<string, CompoundTrap>();

/**
 * Register a trap scenario.
 */
export function registerScenario(scenario: TrapScenario): void {
  if (scenarios.has(scenario.id)) {
    throw new Error(`Scenario already registered: ${scenario.id}`);
  }
  scenarios.set(scenario.id, scenario);
}

/**
 * Register a compound trap.
 */
export function registerCompound(compound: CompoundTrap): void {
  const key = `${compound.primary}+${compound.secondary}`;
  if (compounds.has(key)) {
    throw new Error(`Compound trap already registered: ${key}`);
  }
  compounds.set(key, compound);
}

/**
 * Get a scenario by ID.
 */
export function getScenario(id: ScenarioId): TrapScenario {
  const scenario = scenarios.get(id);
  if (!scenario) {
    throw new Error(`Unknown scenario: ${id}. Available: ${[...scenarios.keys()].join(', ')}`);
  }
  return scenario;
}

/**
 * Get all scenarios, optionally filtered by category.
 */
export function listScenarios(category?: TrapCategory): TrapScenario[] {
  const all = [...scenarios.values()];
  if (category) {
    return all.filter(s => s.category === category);
  }
  return all;
}

/**
 * Get all compound traps.
 */
export function listCompounds(): CompoundTrap[] {
  return [...compounds.values()];
}

/**
 * Get all scenario IDs grouped by category.
 */
export function getScenariosByCategory(): Record<TrapCategory, ScenarioId[]> {
  const result: Record<string, ScenarioId[]> = {};
  for (const [id, scenario] of scenarios) {
    if (!result[scenario.category]) {
      result[scenario.category] = [];
    }
    result[scenario.category].push(id);
  }
  return result as Record<TrapCategory, ScenarioId[]>;
}

/**
 * Summary stats for logging.
 */
export function registrySummary(): {
  totalScenarios: number;
  byCategory: Record<string, number>;
  totalCompounds: number;
} {
  const byCategory: Record<string, number> = {};
  for (const scenario of scenarios.values()) {
    byCategory[scenario.category] = (byCategory[scenario.category] ?? 0) + 1;
  }
  return {
    totalScenarios: scenarios.size,
    byCategory,
    totalCompounds: compounds.size,
  };
}
