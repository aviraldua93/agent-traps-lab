import type { ExperimentCell, ExperimentMatrix } from './matrix.js';
import type { TrapMetrics, TrapObservation } from '../traps/types.js';
import { getScenario } from '../traps/registry.js';
import { MODELS, EXPERIMENT_CONFIG } from '../config.js';
import { createBaselineConfig, createHardenedConfig, createAblatedConfig } from '../agents/types.js';
import { aggregateMetrics } from './metrics.js';

/**
 * Result of a single experiment cell execution.
 */
export interface CellResult {
  cell: ExperimentCell;
  metrics: TrapMetrics;
  status: 'success' | 'error' | 'timeout';
  error?: string;
  durationMs: number;
}

/**
 * Result of a full experiment run.
 */
export interface ExperimentRunResult {
  runId: string;
  startedAt: string;
  completedAt: string;
  matrix: ExperimentMatrix;
  results: CellResult[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    timedOut: number;
    durationMs: number;
  };
}

/**
 * Progress callback for UI/logging.
 */
export type ProgressCallback = (progress: {
  completed: number;
  total: number;
  current: ExperimentCell;
  status: 'running' | 'success' | 'error' | 'timeout';
  error?: string;
}) => void;

/**
 * Execute a single experiment cell.
 */
export async function executeCell(cell: ExperimentCell): Promise<CellResult> {
  const startTime = Date.now();

  try {
    const scenario = getScenario(cell.scenarioId);
    const modelConfig = MODELS[cell.modelId];

    // Create agent config based on condition
    const agentConfig =
      cell.condition === 'baseline'
        ? createBaselineConfig(cell.modelId, modelConfig)
        : cell.condition === 'hardened'
          ? createHardenedConfig(cell.modelId, modelConfig)
          : createAblatedConfig(cell.modelId, modelConfig, cell.ablatedMitigation!);

    // Set up the trap environment
    const env = await scenario.setup({
      model: cell.modelId,
      condition: cell.condition,
      repetition: cell.repetition,
      mitigations: cell.mitigations,
      seed: cell.seed,
    });

    // Create agent handle
    const agent = await createAgentHandle(agentConfig, cell);

    // Execute the trap
    const observation = await withTimeout(
      scenario.execute(env, agent),
      EXPERIMENT_CONFIG.timeoutMs,
    );

    // Evaluate results
    const metrics = scenario.evaluate(observation);

    // Clean up
    await scenario.teardown(env);

    return {
      cell,
      metrics,
      status: 'success',
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    const isTimeout = error instanceof TimeoutError;
    return {
      cell,
      metrics: createEmptyMetrics(cell),
      status: isTimeout ? 'timeout' : 'error',
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Execute the full experiment matrix with parallel workers.
 */
export async function executeMatrix(
  matrix: ExperimentMatrix,
  onProgress?: ProgressCallback,
): Promise<ExperimentRunResult> {
  const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = new Date().toISOString();
  const { parallelWorkers } = EXPERIMENT_CONFIG;

  const results: CellResult[] = [];
  const queue = [...matrix.cells];
  let completed = 0;

  // Worker pool
  const workers = Array.from({ length: parallelWorkers }, async () => {
    while (queue.length > 0) {
      const cell = queue.shift();
      if (!cell) break;

      onProgress?.({
        completed,
        total: matrix.cells.length,
        current: cell,
        status: 'running',
      });

      const result = await executeCell(cell);
      results.push(result);
      completed++;

      onProgress?.({
        completed,
        total: matrix.cells.length,
        current: cell,
        status: result.status,
        error: result.error,
      });
    }
  });

  await Promise.all(workers);

  const completedAt = new Date().toISOString();

  return {
    runId,
    startedAt,
    completedAt,
    matrix,
    results,
    summary: {
      total: results.length,
      succeeded: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'error').length,
      timedOut: results.filter(r => r.status === 'timeout').length,
      durationMs: Date.now() - new Date(startedAt).getTime(),
    },
  };
}

/**
 * Save experiment results to disk.
 */
export async function saveResults(result: ExperimentRunResult): Promise<string> {
  const dir = `results/${result.runId}`;
  await Bun.write(`${dir}/config.json`, JSON.stringify(result.matrix, null, 2));
  await Bun.write(`${dir}/results.json`, JSON.stringify(result.results, null, 2));
  await Bun.write(`${dir}/summary.json`, JSON.stringify(result.summary, null, 2));

  // Aggregate by scenario + model + condition
  const grouped = groupResults(result.results);
  const aggregates = Object.entries(grouped).map(([key, cells]) => ({
    key,
    aggregate: aggregateMetrics(cells.map(c => c.metrics)),
  }));
  await Bun.write(`${dir}/aggregate/aggregates.json`, JSON.stringify(aggregates, null, 2));

  return dir;
}

// ── Helpers ──────────────────────────────────────────────────────────

function groupResults(results: CellResult[]): Record<string, CellResult[]> {
  const groups: Record<string, CellResult[]> = {};
  for (const r of results) {
    const key = `${r.cell.scenarioId}__${r.cell.modelId}__${r.cell.condition}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }
  return groups;
}

class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Experiment timed out after ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new TimeoutError(ms)), ms)),
  ]);
}

function createEmptyMetrics(cell: ExperimentCell): TrapMetrics {
  return {
    scenarioId: cell.scenarioId,
    modelId: cell.modelId,
    condition: cell.condition,
    repetition: cell.repetition,
    trapSuccessRate: 0,
    detectionRate: 0,
    escapeRate: 0,
    decisionDrift: 0,
    timeToCompromiseMs: 0,
    tokenWaste: 0,
    mitigationActive: cell.condition !== 'baseline',
    observation: {
      scenarioId: cell.scenarioId,
      modelId: cell.modelId,
      condition: cell.condition,
      repetition: cell.repetition,
      trapTriggered: false,
      trapDetected: false,
      trapEscaped: false,
      agentAction: 'ERROR',
      correctAction: '',
      trappedAction: '',
      agentResponse: {
        text: '',
        toolCalls: [],
        decision: null,
        tokenUsage: { prompt: 0, completion: 0 },
        latencyMs: 0,
      },
      startedAt: Date.now(),
      completedAt: Date.now(),
    },
  };
}

/**
 * Placeholder — will be implemented with real LLM client integration.
 */
async function createAgentHandle(
  _agentConfig: ReturnType<typeof createBaselineConfig>,
  _cell: ExperimentCell,
) {
  // TODO: Implement with real OpenAI/Anthropic/Google clients
  throw new Error('Agent handle not yet implemented — use crews plan to build this');
}
