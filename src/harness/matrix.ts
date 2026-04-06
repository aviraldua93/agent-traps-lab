import { MODELS, EXPERIMENT_CONFIG, type ModelId, type Condition } from '../config.js';
import { listScenarios, listCompounds } from '../traps/registry.js';
import type { ScenarioId } from '../traps/types.js';

/**
 * A single experiment cell in the matrix.
 */
export interface ExperimentCell {
  id: string;
  scenarioId: ScenarioId;
  modelId: ModelId;
  condition: Condition;
  repetition: number;
  mitigations: string[];
  /** For ablation: which mitigation was removed */
  ablatedMitigation?: string;
  seed: number;
}

/**
 * The full experiment matrix — all cells to be executed.
 */
export interface ExperimentMatrix {
  cells: ExperimentCell[];
  summary: {
    totalCells: number;
    scenarios: number;
    models: number;
    conditions: number;
    repetitions: number;
    compoundCells: number;
    ablationCells: number;
  };
}

const ALL_MITIGATIONS = [
  'input-sanitizer',
  'semantic-shield',
  'context-validator',
  'rag-integrity',
  'behavioral-guard',
  'cascade-breaker',
  'report-auditor',
];

/**
 * Generate the full experiment matrix.
 *
 * 22 scenarios × 4 models × 3 conditions × 10 reps = 2,640
 * + compound traps × 4 models × 10 reps
 * + ablation studies × 4 models × 10 reps
 */
export function generateMatrix(): ExperimentMatrix {
  const cells: ExperimentCell[] = [];
  const scenarios = listScenarios();
  const compounds = listCompounds();
  const modelIds = Object.keys(MODELS) as ModelId[];
  const { repetitions } = EXPERIMENT_CONFIG;

  let cellIndex = 0;

  // ── Main matrix: scenario × model × condition × repetition ──
  for (const scenario of scenarios) {
    for (const modelId of modelIds) {
      for (const condition of ['baseline', 'hardened'] as Condition[]) {
        const mitigations = condition === 'hardened' ? ALL_MITIGATIONS : [];
        for (let rep = 0; rep < repetitions; rep++) {
          cells.push({
            id: `${scenario.id}__${modelId}__${condition}__rep${rep}`,
            scenarioId: scenario.id,
            modelId,
            condition,
            repetition: rep,
            mitigations,
            seed: cellIndex * 1337 + rep,
          });
          cellIndex++;
        }
      }
    }
  }

  // ── Ablation matrix: per-mitigation removal ──
  let ablationCount = 0;
  for (const scenario of scenarios) {
    for (const modelId of modelIds) {
      for (const removeMitigation of ALL_MITIGATIONS) {
        for (let rep = 0; rep < repetitions; rep++) {
          cells.push({
            id: `${scenario.id}__${modelId}__ablated-${removeMitigation}__rep${rep}`,
            scenarioId: scenario.id,
            modelId,
            condition: 'ablated',
            repetition: rep,
            mitigations: ALL_MITIGATIONS.filter(m => m !== removeMitigation),
            ablatedMitigation: removeMitigation,
            seed: cellIndex * 1337 + rep,
          });
          cellIndex++;
          ablationCount++;
        }
      }
    }
  }

  // ── Compound matrix: pairwise trap combinations ──
  let compoundCount = 0;
  for (const compound of compounds) {
    for (const modelId of modelIds) {
      for (const condition of ['baseline', 'hardened'] as Condition[]) {
        const mitigations = condition === 'hardened' ? ALL_MITIGATIONS : [];
        for (let rep = 0; rep < repetitions; rep++) {
          const compoundId = `${compound.primary}+${compound.secondary}` as ScenarioId;
          cells.push({
            id: `compound__${compoundId}__${modelId}__${condition}__rep${rep}`,
            scenarioId: compoundId,
            modelId,
            condition,
            repetition: rep,
            mitigations,
            seed: cellIndex * 1337 + rep,
          });
          cellIndex++;
          compoundCount++;
        }
      }
    }
  }

  return {
    cells,
    summary: {
      totalCells: cells.length,
      scenarios: scenarios.length,
      models: modelIds.length,
      conditions: 3, // baseline, hardened, ablated
      repetitions,
      compoundCells: compoundCount,
      ablationCells: ablationCount,
    },
  };
}

/**
 * Filter the matrix to a subset for targeted runs.
 */
export function filterMatrix(
  matrix: ExperimentMatrix,
  filters: {
    scenario?: ScenarioId;
    category?: string;
    model?: ModelId;
    condition?: Condition;
  },
): ExperimentMatrix {
  let filtered = matrix.cells;

  if (filters.scenario) {
    filtered = filtered.filter(c => c.scenarioId === filters.scenario);
  }
  if (filters.category) {
    filtered = filtered.filter(c => c.scenarioId.startsWith(filters.category!));
  }
  if (filters.model) {
    filtered = filtered.filter(c => c.modelId === filters.model);
  }
  if (filters.condition) {
    filtered = filtered.filter(c => c.condition === filters.condition);
  }

  return {
    cells: filtered,
    summary: {
      ...matrix.summary,
      totalCells: filtered.length,
    },
  };
}

/**
 * Print matrix summary to console.
 */
export function printMatrixSummary(matrix: ExperimentMatrix): string {
  const { summary } = matrix;
  return [
    `╔══════════════════════════════════════════════╗`,
    `║  EXPERIMENT MATRIX                           ║`,
    `╚══════════════════════════════════════════════╝`,
    ``,
    `  Scenarios:      ${summary.scenarios}`,
    `  Models:         ${summary.models}`,
    `  Conditions:     ${summary.conditions} (baseline / hardened / ablated)`,
    `  Repetitions:    ${summary.repetitions}`,
    `  ────────────────────────────────`,
    `  Main cells:     ${summary.scenarios * summary.models * 2 * summary.repetitions}`,
    `  Ablation cells: ${summary.ablationCells}`,
    `  Compound cells: ${summary.compoundCells}`,
    `  ════════════════════════════════`,
    `  TOTAL:          ${summary.totalCells} experiment runs`,
  ].join('\n');
}
