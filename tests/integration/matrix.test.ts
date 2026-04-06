import { beforeAll, afterAll, describe, expect, it } from 'bun:test';
import {
  generateMatrix,
  filterMatrix,
  printMatrixSummary,
  type ExperimentMatrix,
  type ExperimentCell,
} from '../../src/harness/matrix.js';
import { executeCell, type CellResult } from '../../src/harness/runner.js';
import { registerScenario, registerCompound, listScenarios, listCompounds } from '../../src/traps/registry.js';
import type { TrapScenario, ScenarioId, TrapCategory, CompoundTrap } from '../../src/traps/types.js';
import { MODELS, EXPERIMENT_CONFIG } from '../../src/config.js';

// Force mock provider for all tests
process.env.AGENT_TRAPS_MOCK = '1';

// ── Helpers ────────────────────────────────────────────────────────────

const ALL_MITIGATIONS = [
  'input-sanitizer',
  'semantic-shield',
  'context-validator',
  'rag-integrity',
  'behavioral-guard',
  'cascade-breaker',
  'report-auditor',
];

const CATEGORIES: TrapCategory[] = [
  'content-injection',
  'semantic-manipulation',
  'cognitive-state',
  'behavioural-control',
  'systemic',
  'human-in-the-loop',
];

/** Create a minimal mock scenario for matrix testing. */
function createMockScenario(id: ScenarioId, category: TrapCategory, name: string): TrapScenario {
  return {
    id,
    category,
    name,
    description: `Mock scenario: ${name}`,
    paperRef: '§test',
    intendedEffect: 'Test effect',
    successCriteria: 'Test criteria',
    async setup(config) {
      return {
        scenarioId: id,
        resources: [{ type: 'document', content: 'mock', adversarialPayload: 'mock' }],
        groundTruth: { correctAction: 'correct', trappedAction: 'trapped' },
        metadata: { seed: config.seed },
      };
    },
    async execute(env, agent) {
      const response = await agent.sendTask('mock prompt');
      return {
        scenarioId: id,
        modelId: agent.modelId,
        condition: agent.condition,
        repetition: 0,
        trapTriggered: false,
        trapDetected: false,
        trapEscaped: false,
        agentAction: 'mock',
        correctAction: 'correct',
        trappedAction: 'trapped',
        agentResponse: response,
        startedAt: Date.now(),
        completedAt: Date.now(),
      };
    },
    evaluate(observation) {
      return {
        scenarioId: observation.scenarioId,
        modelId: observation.modelId,
        condition: observation.condition,
        repetition: observation.repetition,
        trapSuccessRate: 0,
        detectionRate: 0,
        escapeRate: 0,
        decisionDrift: 0,
        timeToCompromiseMs: 0,
        tokenWaste: 0,
        mitigationActive: observation.condition !== 'baseline',
        observation,
      };
    },
    async teardown() {},
  };
}

// ── Scenario definitions matching the real project (22 total) ──

const SCENARIO_DEFS: Array<{ id: ScenarioId; category: TrapCategory; name: string }> = [
  // Content Injection (4)
  { id: 'content-injection:css-invisible' as ScenarioId, category: 'content-injection', name: 'CSS-Invisible Text' },
  { id: 'content-injection:html-comments' as ScenarioId, category: 'content-injection', name: 'HTML Comment Injection' },
  { id: 'content-injection:image-metadata' as ScenarioId, category: 'content-injection', name: 'Image Metadata' },
  { id: 'content-injection:dynamic-cloaking' as ScenarioId, category: 'content-injection', name: 'Dynamic Cloaking' },
  // Semantic Manipulation (4)
  { id: 'semantic-manipulation:authority-framing' as ScenarioId, category: 'semantic-manipulation', name: 'Authority Framing' },
  { id: 'semantic-manipulation:emotional-urgency' as ScenarioId, category: 'semantic-manipulation', name: 'Emotional Urgency' },
  { id: 'semantic-manipulation:context-flooding' as ScenarioId, category: 'semantic-manipulation', name: 'Context Flooding' },
  { id: 'semantic-manipulation:identity-manipulation' as ScenarioId, category: 'semantic-manipulation', name: 'Identity Manipulation' },
  // Cognitive State (4)
  { id: 'cognitive-state:vector-poisoning' as ScenarioId, category: 'cognitive-state', name: 'Vector Poisoning' },
  { id: 'cognitive-state:ranking-manipulation' as ScenarioId, category: 'cognitive-state', name: 'Ranking Manipulation' },
  { id: 'cognitive-state:gradual-drift' as ScenarioId, category: 'cognitive-state', name: 'Gradual Drift' },
  { id: 'cognitive-state:cross-contamination' as ScenarioId, category: 'cognitive-state', name: 'Cross Contamination' },
  // Behavioural Control (4)
  { id: 'behavioural-control:deceptive-dialogs' as ScenarioId, category: 'behavioural-control', name: 'Deceptive Dialogs' },
  { id: 'behavioural-control:misleading-forms' as ScenarioId, category: 'behavioural-control', name: 'Misleading Forms' },
  { id: 'behavioural-control:hidden-fields' as ScenarioId, category: 'behavioural-control', name: 'Hidden Fields' },
  { id: 'behavioural-control:infinite-loops' as ScenarioId, category: 'behavioural-control', name: 'Infinite Loops' },
  // Systemic (3)
  { id: 'systemic:message-poisoning' as ScenarioId, category: 'systemic', name: 'Message Poisoning' },
  { id: 'systemic:agent-impersonation' as ScenarioId, category: 'systemic', name: 'Agent Impersonation' },
  { id: 'systemic:cascade-failure' as ScenarioId, category: 'systemic', name: 'Cascade Failure' },
  // Human-in-the-Loop (3)
  { id: 'human-in-the-loop:cherry-picked' as ScenarioId, category: 'human-in-the-loop', name: 'Cherry-Picked Results' },
  { id: 'human-in-the-loop:anchoring' as ScenarioId, category: 'human-in-the-loop', name: 'Anchoring Bias' },
  { id: 'human-in-the-loop:decision-fatigue' as ScenarioId, category: 'human-in-the-loop', name: 'Decision Fatigue' },
];

const TOTAL_SCENARIOS = SCENARIO_DEFS.length; // 22
const MODEL_IDS = Object.keys(MODELS); // 4 models
const TOTAL_MODELS = MODEL_IDS.length;
const REPS = EXPERIMENT_CONFIG.repetitions; // 10

// ── Register all mock scenarios ────────────────────────────────────────

beforeAll(() => {
  for (const def of SCENARIO_DEFS) {
    try {
      registerScenario(createMockScenario(def.id, def.category, def.name));
    } catch {
      // Already registered (e.g. if running in same process as other tests)
    }
  }
});

// ══════════════════════════════════════════════════════════════════════
//  generateMatrix
// ══════════════════════════════════════════════════════════════════════

describe('generateMatrix', () => {
  let matrix: ExperimentMatrix;

  beforeAll(() => {
    matrix = generateMatrix();
  });

  // ── Total cell counts ──

  it('produces the expected total number of cells', () => {
    // Main cells: 22 × 4 × 2 (baseline + hardened) × 10 = 1,760
    const mainCells = TOTAL_SCENARIOS * TOTAL_MODELS * 2 * REPS;
    // Ablation cells: 22 × 4 × 7 × 10 = 6,160
    const ablationCells = TOTAL_SCENARIOS * TOTAL_MODELS * ALL_MITIGATIONS.length * REPS;
    // No compounds registered
    const expected = mainCells + ablationCells;

    expect(matrix.cells.length).toBe(expected);
    expect(matrix.summary.totalCells).toBe(expected);
  });

  it('reports correct summary.scenarios', () => {
    expect(matrix.summary.scenarios).toBe(TOTAL_SCENARIOS);
  });

  it('reports correct summary.models', () => {
    expect(matrix.summary.models).toBe(TOTAL_MODELS);
  });

  it('reports correct summary.conditions', () => {
    expect(matrix.summary.conditions).toBe(3); // baseline, hardened, ablated
  });

  it('reports correct summary.repetitions', () => {
    expect(matrix.summary.repetitions).toBe(REPS);
  });

  it('reports correct ablation cell count in summary', () => {
    const expectedAblation = TOTAL_SCENARIOS * TOTAL_MODELS * ALL_MITIGATIONS.length * REPS;
    expect(matrix.summary.ablationCells).toBe(expectedAblation);
  });

  it('reports zero compound cells when none registered', () => {
    expect(matrix.summary.compoundCells).toBe(0);
  });

  // ── Scenario coverage ──

  it('covers all 22 registered scenarios', () => {
    const scenarioIds = new Set(matrix.cells.map(c => c.scenarioId));
    for (const def of SCENARIO_DEFS) {
      expect(scenarioIds.has(def.id)).toBe(true);
    }
    expect(scenarioIds.size).toBe(TOTAL_SCENARIOS);
  });

  it('covers all 4 models for each scenario', () => {
    for (const def of SCENARIO_DEFS) {
      const modelsForScenario = new Set(
        matrix.cells.filter(c => c.scenarioId === def.id).map(c => c.modelId),
      );
      for (const modelId of MODEL_IDS) {
        expect(modelsForScenario.has(modelId)).toBe(true);
      }
    }
  });

  it('covers baseline and hardened conditions for every scenario × model', () => {
    for (const def of SCENARIO_DEFS) {
      for (const modelId of MODEL_IDS) {
        const conditions = new Set(
          matrix.cells
            .filter(c => c.scenarioId === def.id && c.modelId === modelId)
            .map(c => c.condition),
        );
        expect(conditions.has('baseline')).toBe(true);
        expect(conditions.has('hardened')).toBe(true);
      }
    }
  });

  it('has exactly 10 repetitions per scenario × model × condition combination', () => {
    for (const def of SCENARIO_DEFS) {
      for (const modelId of MODEL_IDS) {
        const baselineCells = matrix.cells.filter(
          c => c.scenarioId === def.id && c.modelId === modelId && c.condition === 'baseline',
        );
        expect(baselineCells.length).toBe(REPS);

        const hardenedCells = matrix.cells.filter(
          c => c.scenarioId === def.id && c.modelId === modelId && c.condition === 'hardened',
        );
        expect(hardenedCells.length).toBe(REPS);
      }
    }
  });

  // ── Cell IDs ──

  it('generates unique cell IDs', () => {
    const ids = matrix.cells.map(c => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  // ── Seeds ──

  it('generates unique seeds', () => {
    const seeds = matrix.cells.map(c => c.seed);
    const uniqueSeeds = new Set(seeds);
    expect(uniqueSeeds.size).toBe(seeds.length);
  });

  // ── Mitigation assignments ──

  it('assigns empty mitigations array to baseline cells', () => {
    const baselineCells = matrix.cells.filter(c => c.condition === 'baseline');
    expect(baselineCells.length).toBeGreaterThan(0);
    for (const cell of baselineCells) {
      expect(cell.mitigations).toEqual([]);
    }
  });

  it('assigns all 7 mitigations to hardened cells', () => {
    const hardenedCells = matrix.cells.filter(c => c.condition === 'hardened');
    expect(hardenedCells.length).toBeGreaterThan(0);
    for (const cell of hardenedCells) {
      expect(cell.mitigations).toEqual(ALL_MITIGATIONS);
    }
  });

  it('assigns no ablatedMitigation to baseline/hardened cells', () => {
    const mainCells = matrix.cells.filter(c => c.condition !== 'ablated');
    for (const cell of mainCells) {
      expect(cell.ablatedMitigation).toBeUndefined();
    }
  });

  // ── Ablation cells ──

  it('creates ablation cells with condition = "ablated"', () => {
    const ablatedCells = matrix.cells.filter(c => c.condition === 'ablated');
    expect(ablatedCells.length).toBe(
      TOTAL_SCENARIOS * TOTAL_MODELS * ALL_MITIGATIONS.length * REPS,
    );
    for (const cell of ablatedCells) {
      expect(cell.condition).toBe('ablated');
    }
  });

  it('ablation cells have exactly one mitigation removed', () => {
    const ablatedCells = matrix.cells.filter(c => c.condition === 'ablated');
    for (const cell of ablatedCells) {
      expect(cell.ablatedMitigation).toBeDefined();
      expect(ALL_MITIGATIONS).toContain(cell.ablatedMitigation);
      // The mitigations array should be ALL_MITIGATIONS minus the ablated one
      expect(cell.mitigations.length).toBe(ALL_MITIGATIONS.length - 1);
      expect(cell.mitigations).not.toContain(cell.ablatedMitigation);
      // All remaining mitigations should be from the full set
      for (const m of cell.mitigations) {
        expect(ALL_MITIGATIONS).toContain(m);
      }
    }
  });

  it('each mitigation is ablated exactly once per scenario × model combination', () => {
    for (const def of SCENARIO_DEFS) {
      for (const modelId of MODEL_IDS) {
        const ablatedForPair = matrix.cells.filter(
          c =>
            c.scenarioId === def.id &&
            c.modelId === modelId &&
            c.condition === 'ablated',
        );
        // 7 mitigations × 10 reps = 70
        expect(ablatedForPair.length).toBe(ALL_MITIGATIONS.length * REPS);

        // Check each mitigation appears exactly 10 times (once per rep)
        for (const mitId of ALL_MITIGATIONS) {
          const forThisMitigation = ablatedForPair.filter(c => c.ablatedMitigation === mitId);
          expect(forThisMitigation.length).toBe(REPS);
        }
      }
    }
  });

  // ── Repetition indexing ──

  it('assigns repetition indices 0..9 for each scenario × model × condition', () => {
    for (const def of SCENARIO_DEFS) {
      for (const modelId of MODEL_IDS) {
        const baselineCells = matrix.cells
          .filter(c => c.scenarioId === def.id && c.modelId === modelId && c.condition === 'baseline')
          .map(c => c.repetition)
          .sort((a, b) => a - b);
        expect(baselineCells).toEqual(Array.from({ length: REPS }, (_, i) => i));
      }
    }
  });

  it('assigns repetition indices 0..9 for ablation cells per scenario × model × mitigation', () => {
    const def = SCENARIO_DEFS[0];
    const modelId = MODEL_IDS[0];
    const mitId = ALL_MITIGATIONS[0];

    const reps = matrix.cells
      .filter(
        c =>
          c.scenarioId === def.id &&
          c.modelId === modelId &&
          c.condition === 'ablated' &&
          c.ablatedMitigation === mitId,
      )
      .map(c => c.repetition)
      .sort((a, b) => a - b);

    expect(reps).toEqual(Array.from({ length: REPS }, (_, i) => i));
  });

  // ── Category distribution ──

  it('has correct per-category cell counts', () => {
    const categoryScenarioCounts: Record<TrapCategory, number> = {
      'content-injection': 4,
      'semantic-manipulation': 4,
      'cognitive-state': 4,
      'behavioural-control': 4,
      'systemic': 3,
      'human-in-the-loop': 3,
    };

    for (const [category, scenarioCount] of Object.entries(categoryScenarioCounts)) {
      const categoryCells = matrix.cells.filter(c =>
        c.scenarioId.startsWith(category),
      );
      // Main: scenarioCount × 4 models × 2 conditions × 10 reps
      // Ablation: scenarioCount × 4 models × 7 mitigations × 10 reps
      const expected = scenarioCount * TOTAL_MODELS * (2 + ALL_MITIGATIONS.length) * REPS;
      expect(categoryCells.length).toBe(expected);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════
//  generateMatrix with compound traps
// ══════════════════════════════════════════════════════════════════════

describe('generateMatrix with compound traps', () => {
  let matrix: ExperimentMatrix;
  const compoundRegistered = { success: false };

  beforeAll(() => {
    // Register a compound trap
    const primaryId = 'content-injection:css-invisible' as ScenarioId;
    const secondaryId = 'semantic-manipulation:authority-framing' as ScenarioId;

    const compound: CompoundTrap = {
      primary: primaryId,
      secondary: secondaryId,
      name: 'CSS-Invisible + Authority Framing',
      hypothesis: 'Combined attack hypothesis',
      async setup(config) {
        return {
          scenarioId: `${primaryId}+${secondaryId}` as ScenarioId,
          resources: [{ type: 'document', content: 'compound mock', adversarialPayload: 'compound' }],
          groundTruth: { correctAction: 'correct', trappedAction: 'trapped' },
          metadata: {},
        };
      },
      async execute(env, agent) {
        const response = await agent.sendTask('compound test');
        return {
          scenarioId: env.scenarioId,
          modelId: agent.modelId,
          condition: agent.condition,
          repetition: 0,
          trapTriggered: false,
          trapDetected: false,
          trapEscaped: false,
          agentAction: 'mock',
          correctAction: 'correct',
          trappedAction: 'trapped',
          agentResponse: response,
          startedAt: Date.now(),
          completedAt: Date.now(),
        };
      },
      evaluate(observation) {
        return {
          scenarioId: observation.scenarioId,
          modelId: observation.modelId,
          condition: observation.condition,
          repetition: observation.repetition,
          trapSuccessRate: 0,
          detectionRate: 0,
          escapeRate: 0,
          decisionDrift: 0,
          timeToCompromiseMs: 0,
          tokenWaste: 0,
          mitigationActive: false,
          observation,
        };
      },
      async teardown() {},
    };

    try {
      registerCompound(compound);
      compoundRegistered.success = true;
    } catch {
      // Already registered
      compoundRegistered.success = listCompounds().length > 0;
    }

    matrix = generateMatrix();
  });

  it('includes compound cells in the matrix', () => {
    const compounds = listCompounds();
    if (compounds.length === 0) return; // Skip if registration failed
    // 1 compound × 4 models × 2 conditions × 10 reps = 80
    const compoundCells = matrix.cells.filter(c => c.id.startsWith('compound__'));
    expect(compoundCells.length).toBe(compounds.length * TOTAL_MODELS * 2 * REPS);
  });

  it('compound cells use combined scenario IDs', () => {
    const compoundCells = matrix.cells.filter(c => c.id.startsWith('compound__'));
    for (const cell of compoundCells) {
      expect(cell.scenarioId).toContain('+');
    }
  });

  it('compound cell count is reflected in summary', () => {
    const compoundCells = matrix.cells.filter(c => c.id.startsWith('compound__'));
    expect(matrix.summary.compoundCells).toBe(compoundCells.length);
  });

  it('compound cells cover baseline and hardened conditions', () => {
    const compoundCells = matrix.cells.filter(c => c.id.startsWith('compound__'));
    if (compoundCells.length === 0) return;
    const conditions = new Set(compoundCells.map(c => c.condition));
    expect(conditions.has('baseline')).toBe(true);
    expect(conditions.has('hardened')).toBe(true);
  });

  it('compound cells have correct mitigation assignments', () => {
    const compoundBaseline = matrix.cells.filter(
      c => c.id.startsWith('compound__') && c.condition === 'baseline',
    );
    const compoundHardened = matrix.cells.filter(
      c => c.id.startsWith('compound__') && c.condition === 'hardened',
    );
    for (const cell of compoundBaseline) {
      expect(cell.mitigations).toEqual([]);
    }
    for (const cell of compoundHardened) {
      expect(cell.mitigations).toEqual(ALL_MITIGATIONS);
    }
  });

  it('total cells equals main + ablation + compound', () => {
    const compounds = listCompounds();
    const mainCells = TOTAL_SCENARIOS * TOTAL_MODELS * 2 * REPS;
    const ablationCells = TOTAL_SCENARIOS * TOTAL_MODELS * ALL_MITIGATIONS.length * REPS;
    const compoundCells = compounds.length * TOTAL_MODELS * 2 * REPS;
    expect(matrix.summary.totalCells).toBe(mainCells + ablationCells + compoundCells);
  });
});

// ══════════════════════════════════════════════════════════════════════
//  filterMatrix
// ══════════════════════════════════════════════════════════════════════

describe('filterMatrix', () => {
  let matrix: ExperimentMatrix;

  beforeAll(() => {
    matrix = generateMatrix();
  });

  // ── Filter by scenario ──

  describe('filter by scenario', () => {
    it('returns only cells for the specified scenario', () => {
      const scenarioId = 'content-injection:css-invisible' as ScenarioId;
      const filtered = filterMatrix(matrix, { scenario: scenarioId });

      expect(filtered.cells.length).toBeGreaterThan(0);
      for (const cell of filtered.cells) {
        expect(cell.scenarioId).toBe(scenarioId);
      }
    });

    it('returns correct count for one scenario', () => {
      const scenarioId = 'content-injection:css-invisible' as ScenarioId;
      const filtered = filterMatrix(matrix, { scenario: scenarioId });
      // 4 models × (2 main + 7 ablation) × 10 reps = 360
      const expected = TOTAL_MODELS * (2 + ALL_MITIGATIONS.length) * REPS;
      expect(filtered.cells.length).toBe(expected);
      expect(filtered.summary.totalCells).toBe(expected);
    });

    it('returns empty for non-existent scenario', () => {
      const filtered = filterMatrix(matrix, { scenario: 'content-injection:nonexistent' as ScenarioId });
      expect(filtered.cells.length).toBe(0);
    });
  });

  // ── Filter by category ──

  describe('filter by category', () => {
    it('returns only cells whose scenarioId starts with the category', () => {
      const filtered = filterMatrix(matrix, { category: 'content-injection' });
      for (const cell of filtered.cells) {
        expect(cell.scenarioId.startsWith('content-injection')).toBe(true);
      }
    });

    it('returns correct count for content-injection (4 scenarios + compound overlap)', () => {
      const filtered = filterMatrix(matrix, { category: 'content-injection' });
      // 4 scenarios × 4 models × (2 + 7) × 10 = 1,440
      // Plus compound cells whose scenarioId starts with 'content-injection'
      const baseCells = 4 * TOTAL_MODELS * (2 + ALL_MITIGATIONS.length) * REPS;
      const compoundOverlap = matrix.cells.filter(
        c => c.id.startsWith('compound__') && c.scenarioId.startsWith('content-injection'),
      ).length;
      expect(filtered.cells.length).toBe(baseCells + compoundOverlap);
    });

    it('returns correct count for systemic (3 scenarios)', () => {
      const filtered = filterMatrix(matrix, { category: 'systemic' });
      const expected = 3 * TOTAL_MODELS * (2 + ALL_MITIGATIONS.length) * REPS;
      expect(filtered.cells.length).toBe(expected);
    });

    it('returns correct count for human-in-the-loop (3 scenarios)', () => {
      const filtered = filterMatrix(matrix, { category: 'human-in-the-loop' });
      const expected = 3 * TOTAL_MODELS * (2 + ALL_MITIGATIONS.length) * REPS;
      expect(filtered.cells.length).toBe(expected);
    });

    it('all 6 categories sum to total matrix cells (compounds land in their primary category)', () => {
      let total = 0;
      for (const cat of CATEGORIES) {
        const filtered = filterMatrix(matrix, { category: cat });
        total += filtered.cells.length;
      }
      // Compound cells are counted under their primary category (scenarioId starts with primary)
      // So the sum equals all non-compound cells + compound cells (since each compound
      // scenarioId starts with exactly one category prefix)
      expect(total).toBe(matrix.cells.length);
    });
  });

  // ── Filter by model ──

  describe('filter by model', () => {
    it('returns only cells for the specified model', () => {
      const filtered = filterMatrix(matrix, { model: 'gpt4o' });
      for (const cell of filtered.cells) {
        expect(cell.modelId).toBe('gpt4o');
      }
    });

    it('returns correct count for one model (non-compound cells)', () => {
      const filtered = filterMatrix(matrix, { model: 'gpt4o' });
      // 22 scenarios × 1 model × (2 + 7) × 10 = 1,980 plus compound cells
      const nonCompoundExpected = TOTAL_SCENARIOS * (2 + ALL_MITIGATIONS.length) * REPS;
      const compoundCount = listCompounds().length * 2 * REPS; // 2 conditions × 10 reps per compound
      expect(filtered.cells.length).toBe(nonCompoundExpected + compoundCount);
    });

    it('each model filter produces equal cell counts', () => {
      const counts = MODEL_IDS.map(
        id => filterMatrix(matrix, { model: id as any }).cells.length,
      );
      // All models should have the same count
      expect(new Set(counts).size).toBe(1);
    });
  });

  // ── Filter by condition ──

  describe('filter by condition', () => {
    it('returns only baseline cells', () => {
      const filtered = filterMatrix(matrix, { condition: 'baseline' });
      for (const cell of filtered.cells) {
        expect(cell.condition).toBe('baseline');
      }
    });

    it('returns correct baseline count', () => {
      const filtered = filterMatrix(matrix, { condition: 'baseline' });
      // 22 scenarios × 4 models × 10 reps + compound baseline cells
      const compounds = listCompounds().length;
      const expected = (TOTAL_SCENARIOS + compounds) * TOTAL_MODELS * REPS;
      expect(filtered.cells.length).toBe(expected);
    });

    it('returns correct hardened count', () => {
      const filtered = filterMatrix(matrix, { condition: 'hardened' });
      const compounds = listCompounds().length;
      const expected = (TOTAL_SCENARIOS + compounds) * TOTAL_MODELS * REPS;
      expect(filtered.cells.length).toBe(expected);
    });

    it('returns correct ablated count', () => {
      const filtered = filterMatrix(matrix, { condition: 'ablated' });
      const expected = TOTAL_SCENARIOS * TOTAL_MODELS * ALL_MITIGATIONS.length * REPS;
      expect(filtered.cells.length).toBe(expected);
    });

    it('baseline + hardened + ablated = total non-compound', () => {
      const baseline = filterMatrix(matrix, { condition: 'baseline' }).cells.length;
      const hardened = filterMatrix(matrix, { condition: 'hardened' }).cells.length;
      const ablated = filterMatrix(matrix, { condition: 'ablated' }).cells.length;
      expect(baseline + hardened + ablated).toBe(matrix.cells.length);
    });
  });

  // ── Combined filters ──

  describe('combined filters', () => {
    it('scenario + model narrows correctly', () => {
      const filtered = filterMatrix(matrix, {
        scenario: 'content-injection:css-invisible' as ScenarioId,
        model: 'gpt4o',
      });
      // 1 scenario × 1 model × (2 + 7) × 10 = 90
      expect(filtered.cells.length).toBe((2 + ALL_MITIGATIONS.length) * REPS);
      for (const cell of filtered.cells) {
        expect(cell.scenarioId).toBe('content-injection:css-invisible');
        expect(cell.modelId).toBe('gpt4o');
      }
    });

    it('scenario + model + condition narrows to repetitions only', () => {
      const filtered = filterMatrix(matrix, {
        scenario: 'content-injection:css-invisible' as ScenarioId,
        model: 'gpt4o',
        condition: 'baseline',
      });
      expect(filtered.cells.length).toBe(REPS);
      for (const cell of filtered.cells) {
        expect(cell.scenarioId).toBe('content-injection:css-invisible');
        expect(cell.modelId).toBe('gpt4o');
        expect(cell.condition).toBe('baseline');
      }
    });

    it('category + condition filters orthogonally', () => {
      const filtered = filterMatrix(matrix, {
        category: 'semantic-manipulation',
        condition: 'ablated',
      });
      // 4 scenarios × 4 models × 7 mitigations × 10 reps = 1,120
      const expected = 4 * TOTAL_MODELS * ALL_MITIGATIONS.length * REPS;
      expect(filtered.cells.length).toBe(expected);
    });

    it('impossible filter combination returns empty', () => {
      const filtered = filterMatrix(matrix, {
        scenario: 'content-injection:css-invisible' as ScenarioId,
        category: 'semantic-manipulation', // Conflicts with scenario
      });
      expect(filtered.cells.length).toBe(0);
    });
  });

  // ── Preserves summary metadata ──

  it('preserves original summary metadata (except totalCells)', () => {
    const filtered = filterMatrix(matrix, { model: 'gpt4o' });
    expect(filtered.summary.scenarios).toBe(matrix.summary.scenarios);
    expect(filtered.summary.models).toBe(matrix.summary.models);
    expect(filtered.summary.conditions).toBe(matrix.summary.conditions);
    expect(filtered.summary.repetitions).toBe(matrix.summary.repetitions);
    // totalCells should be updated
    expect(filtered.summary.totalCells).toBe(filtered.cells.length);
  });
});

// ══════════════════════════════════════════════════════════════════════
//  printMatrixSummary
// ══════════════════════════════════════════════════════════════════════

describe('printMatrixSummary', () => {
  let matrix: ExperimentMatrix;
  let output: string;

  beforeAll(() => {
    matrix = generateMatrix();
    output = printMatrixSummary(matrix);
  });

  it('returns a non-empty string', () => {
    expect(output.length).toBeGreaterThan(0);
  });

  it('contains EXPERIMENT MATRIX header', () => {
    expect(output).toContain('EXPERIMENT MATRIX');
  });

  it('displays the correct scenario count', () => {
    expect(output).toContain(`Scenarios:      ${TOTAL_SCENARIOS}`);
  });

  it('displays the correct model count', () => {
    expect(output).toContain(`Models:         ${TOTAL_MODELS}`);
  });

  it('displays the correct condition count', () => {
    expect(output).toContain('Conditions:     3');
  });

  it('displays the correct repetition count', () => {
    expect(output).toContain(`Repetitions:    ${REPS}`);
  });

  it('displays main cell count', () => {
    const mainCells = TOTAL_SCENARIOS * TOTAL_MODELS * 2 * REPS;
    expect(output).toContain(`Main cells:     ${mainCells}`);
  });

  it('displays ablation cell count', () => {
    expect(output).toContain(`Ablation cells: ${matrix.summary.ablationCells}`);
  });

  it('displays compound cell count', () => {
    expect(output).toContain(`Compound cells: ${matrix.summary.compoundCells}`);
  });

  it('displays total cell count', () => {
    expect(output).toContain(`TOTAL:          ${matrix.summary.totalCells} experiment runs`);
  });

  it('contains visual dividers', () => {
    expect(output).toContain('═');
    expect(output).toContain('─');
  });

  it('output for filtered matrix shows updated total', () => {
    const filtered = filterMatrix(matrix, { condition: 'baseline' });
    const filteredOutput = printMatrixSummary(filtered);
    expect(filteredOutput).toContain(`TOTAL:          ${filtered.summary.totalCells} experiment runs`);
  });
});

// ══════════════════════════════════════════════════════════════════════
//  Matrix invariants & edge cases
// ══════════════════════════════════════════════════════════════════════

describe('matrix invariants', () => {
  let matrix: ExperimentMatrix;

  beforeAll(() => {
    matrix = generateMatrix();
  });

  it('every cell has a valid scenario ID matching a registered scenario', () => {
    const registeredIds = new Set(listScenarios().map(s => s.id));
    for (const cell of matrix.cells) {
      if (!cell.id.startsWith('compound__')) {
        expect(registeredIds.has(cell.scenarioId)).toBe(true);
      }
    }
  });

  it('every cell has a valid model ID', () => {
    const validModels = new Set(MODEL_IDS);
    for (const cell of matrix.cells) {
      expect(validModels.has(cell.modelId)).toBe(true);
    }
  });

  it('every cell has a valid condition', () => {
    const validConditions = new Set(['baseline', 'hardened', 'ablated']);
    for (const cell of matrix.cells) {
      expect(validConditions.has(cell.condition)).toBe(true);
    }
  });

  it('every cell has a non-negative seed', () => {
    for (const cell of matrix.cells) {
      expect(cell.seed).toBeGreaterThanOrEqual(0);
    }
  });

  it('every cell has a repetition in range [0, REPS)', () => {
    for (const cell of matrix.cells) {
      expect(cell.repetition).toBeGreaterThanOrEqual(0);
      expect(cell.repetition).toBeLessThan(REPS);
    }
  });

  it('cell ID encodes scenario, model, condition, and repetition', () => {
    const sampleBaseline = matrix.cells.find(
      c => c.condition === 'baseline' && c.scenarioId === 'content-injection:css-invisible',
    );
    expect(sampleBaseline).toBeDefined();
    expect(sampleBaseline!.id).toContain('content-injection:css-invisible');
    expect(sampleBaseline!.id).toContain(sampleBaseline!.modelId);
    expect(sampleBaseline!.id).toContain('baseline');
    expect(sampleBaseline!.id).toContain('rep');
  });

  it('ablation cell ID encodes the ablated mitigation name', () => {
    const sampleAblated = matrix.cells.find(c => c.condition === 'ablated');
    expect(sampleAblated).toBeDefined();
    expect(sampleAblated!.id).toContain(`ablated-${sampleAblated!.ablatedMitigation}`);
  });

  it('compound cell IDs start with "compound__"', () => {
    const compoundCells = matrix.cells.filter(c => c.id.startsWith('compound__'));
    for (const cell of compoundCells) {
      expect(cell.scenarioId).toContain('+');
    }
  });

  it('hardened cells have the same mitigation set as ALL_MITIGATIONS', () => {
    const hardenedCells = matrix.cells.filter(c => c.condition === 'hardened');
    for (const cell of hardenedCells) {
      expect(cell.mitigations).toHaveLength(ALL_MITIGATIONS.length);
      for (const m of ALL_MITIGATIONS) {
        expect(cell.mitigations).toContain(m);
      }
    }
  });
});

// ══════════════════════════════════════════════════════════════════════
//  Matrix consistency — multiple generation calls
// ══════════════════════════════════════════════════════════════════════

describe('matrix consistency', () => {
  it('generates identical matrices on repeated calls', () => {
    const m1 = generateMatrix();
    const m2 = generateMatrix();
    expect(m1.cells.length).toBe(m2.cells.length);
    expect(m1.summary).toEqual(m2.summary);
    for (let i = 0; i < m1.cells.length; i++) {
      expect(m1.cells[i].id).toBe(m2.cells[i].id);
      expect(m1.cells[i].seed).toBe(m2.cells[i].seed);
    }
  });

  it('cell objects are fully formed with all required fields', () => {
    const matrix = generateMatrix();
    for (const cell of matrix.cells.slice(0, 50)) {
      expect(cell.id).toBeDefined();
      expect(typeof cell.id).toBe('string');
      expect(cell.scenarioId).toBeDefined();
      expect(cell.modelId).toBeDefined();
      expect(cell.condition).toBeDefined();
      expect(typeof cell.repetition).toBe('number');
      expect(Array.isArray(cell.mitigations)).toBe(true);
      expect(typeof cell.seed).toBe('number');
    }
  });

  it('matrix is JSON-serializable', () => {
    const matrix = generateMatrix();
    const json = JSON.stringify(matrix);
    const parsed = JSON.parse(json);
    expect(parsed.cells.length).toBe(matrix.cells.length);
    expect(parsed.summary.totalCells).toBe(matrix.summary.totalCells);
  });

  it('ablation cells never appear in compound entries', () => {
    const matrix = generateMatrix();
    const compoundAblated = matrix.cells.filter(
      c => c.id.startsWith('compound__') && c.condition === 'ablated',
    );
    expect(compoundAblated.length).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════════════
//  Filter edge cases
// ══════════════════════════════════════════════════════════════════════

describe('filterMatrix edge cases', () => {
  let matrix: ExperimentMatrix;

  beforeAll(() => {
    matrix = generateMatrix();
  });

  it('filtering with no filters returns the full matrix', () => {
    const filtered = filterMatrix(matrix, {});
    expect(filtered.cells.length).toBe(matrix.cells.length);
  });

  it('double-filtering produces the same result as a combined filter', () => {
    const step1 = filterMatrix(matrix, { model: 'gpt4o' });
    const step2 = filterMatrix(step1, { condition: 'baseline' });
    const combined = filterMatrix(matrix, { model: 'gpt4o', condition: 'baseline' });
    expect(step2.cells.length).toBe(combined.cells.length);
    expect(step2.summary.totalCells).toBe(combined.summary.totalCells);
  });

  it('filtering by each model produces disjoint sets', () => {
    const allIds = new Set<string>();
    for (const modelId of MODEL_IDS) {
      const filtered = filterMatrix(matrix, { model: modelId as any });
      for (const cell of filtered.cells) {
        expect(allIds.has(cell.id)).toBe(false);
        allIds.add(cell.id);
      }
    }
    expect(allIds.size).toBe(matrix.cells.length);
  });

  it('filtering by scenario and model returns cells for only that pair', () => {
    const scenarioId = 'systemic:message-poisoning' as ScenarioId;
    const filtered = filterMatrix(matrix, { scenario: scenarioId, model: 'claude-sonnet' });
    for (const cell of filtered.cells) {
      expect(cell.scenarioId).toBe(scenarioId);
      expect(cell.modelId).toBe('claude-sonnet');
    }
    // 1 scenario × 1 model × (2 main + 7 ablation) × 10 reps = 90
    expect(filtered.cells.length).toBe((2 + ALL_MITIGATIONS.length) * REPS);
  });

  it('filtering by ablated condition returns only cells with ablatedMitigation set', () => {
    const filtered = filterMatrix(matrix, { condition: 'ablated' });
    for (const cell of filtered.cells) {
      expect(cell.ablatedMitigation).toBeDefined();
      expect(typeof cell.ablatedMitigation).toBe('string');
    }
  });

  it('category filter is prefix-based — "systemic" does not match "systemic-extra"', () => {
    // All systemic cells should start with "systemic:"
    const filtered = filterMatrix(matrix, { category: 'systemic' });
    for (const cell of filtered.cells) {
      expect(cell.scenarioId.startsWith('systemic:')).toBe(true);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════
//  printMatrixSummary edge cases
// ══════════════════════════════════════════════════════════════════════

describe('printMatrixSummary formatting', () => {
  it('output contains box-drawing characters', () => {
    const matrix = generateMatrix();
    const output = printMatrixSummary(matrix);
    expect(output).toContain('╔');
    expect(output).toContain('╗');
    expect(output).toContain('╚');
    expect(output).toContain('╝');
  });

  it('output is multi-line', () => {
    const matrix = generateMatrix();
    const output = printMatrixSummary(matrix);
    const lines = output.split('\n');
    expect(lines.length).toBeGreaterThan(5);
  });

  it('summary labels are properly aligned', () => {
    const matrix = generateMatrix();
    const output = printMatrixSummary(matrix);
    // Check that key labels exist with proper spacing
    expect(output).toMatch(/Scenarios:\s+\d+/);
    expect(output).toMatch(/Models:\s+\d+/);
    expect(output).toMatch(/Conditions:\s+\d+/);
    expect(output).toMatch(/Repetitions:\s+\d+/);
  });

  it('filtered matrix summary shows reduced total', () => {
    const matrix = generateMatrix();
    const filtered = filterMatrix(matrix, { scenario: 'content-injection:css-invisible' as ScenarioId });
    const output = printMatrixSummary(filtered);
    expect(output).toContain(`TOTAL:          ${filtered.summary.totalCells} experiment runs`);
    // The filtered total should be less than the full matrix
    expect(filtered.summary.totalCells).toBeLessThan(matrix.summary.totalCells);
  });
});

// ══════════════════════════════════════════════════════════════════════
//  executeCell — experiment runner integration
// ══════════════════════════════════════════════════════════════════════

describe('executeCell', () => {
  it('executes a baseline cell and returns a success result', async () => {
    const cell: ExperimentCell = {
      id: 'content-injection:css-invisible__gpt4o__baseline__rep0',
      scenarioId: 'content-injection:css-invisible' as ScenarioId,
      modelId: 'gpt4o',
      condition: 'baseline',
      repetition: 0,
      mitigations: [],
      seed: 42,
    };

    const result = await executeCell(cell);
    expect(result.status).toBe('success');
    expect(result.cell).toEqual(cell);
    expect(result.durationMs).toBeGreaterThan(0);
    expect(result.error).toBeUndefined();
  });

  it('executes a hardened cell and returns a success result', async () => {
    const cell: ExperimentCell = {
      id: 'semantic-manipulation:authority-framing__claude-sonnet__hardened__rep0',
      scenarioId: 'semantic-manipulation:authority-framing' as ScenarioId,
      modelId: 'claude-sonnet',
      condition: 'hardened',
      repetition: 0,
      mitigations: ALL_MITIGATIONS,
      seed: 100,
    };

    const result = await executeCell(cell);
    expect(result.status).toBe('success');
    expect(result.durationMs).toBeGreaterThan(0);
  });

  it('executes an ablated cell and returns a success result', async () => {
    const cell: ExperimentCell = {
      id: 'cognitive-state:vector-poisoning__gemini-pro__ablated-input-sanitizer__rep0',
      scenarioId: 'cognitive-state:vector-poisoning' as ScenarioId,
      modelId: 'gemini-pro',
      condition: 'ablated',
      repetition: 0,
      mitigations: ALL_MITIGATIONS.filter(m => m !== 'input-sanitizer'),
      ablatedMitigation: 'input-sanitizer',
      seed: 200,
    };

    const result = await executeCell(cell);
    expect(result.status).toBe('success');
  });

  it('result metrics have correct scenarioId, modelId, and condition', async () => {
    const cell: ExperimentCell = {
      id: 'behavioural-control:deceptive-dialogs__gpt4o-mini__baseline__rep3',
      scenarioId: 'behavioural-control:deceptive-dialogs' as ScenarioId,
      modelId: 'gpt4o-mini',
      condition: 'baseline',
      repetition: 3,
      mitigations: [],
      seed: 300,
    };

    const result = await executeCell(cell);
    expect(result.metrics.scenarioId).toBe(cell.scenarioId);
    expect(result.metrics.modelId).toBe(cell.modelId);
    expect(result.metrics.condition).toBe(cell.condition);
    // repetition in metrics comes from scenario.execute, which may differ from cell.repetition
    expect(typeof result.metrics.repetition).toBe('number');
  });

  it('result metrics include core metric fields', async () => {
    const cell: ExperimentCell = {
      id: 'systemic:message-poisoning__gpt4o__baseline__rep0',
      scenarioId: 'systemic:message-poisoning' as ScenarioId,
      modelId: 'gpt4o',
      condition: 'baseline',
      repetition: 0,
      mitigations: [],
      seed: 400,
    };

    const result = await executeCell(cell);
    expect(result.status).toBe('success');
    const m = result.metrics;
    expect(typeof m.trapSuccessRate).toBe('number');
    expect(typeof m.detectionRate).toBe('number');
    expect(typeof m.escapeRate).toBe('number');
    expect(typeof m.decisionDrift).toBe('number');
    expect(typeof m.timeToCompromiseMs).toBe('number');
    expect(typeof m.tokenWaste).toBe('number');
    expect(typeof m.mitigationActive).toBe('boolean');
  });

  it('baseline cell has mitigationActive = false', async () => {
    const cell: ExperimentCell = {
      id: 'human-in-the-loop:anchoring__gpt4o__baseline__rep0',
      scenarioId: 'human-in-the-loop:anchoring' as ScenarioId,
      modelId: 'gpt4o',
      condition: 'baseline',
      repetition: 0,
      mitigations: [],
      seed: 500,
    };

    const result = await executeCell(cell);
    expect(result.metrics.mitigationActive).toBe(false);
  });

  it('hardened cell has mitigationActive = true', async () => {
    const cell: ExperimentCell = {
      id: 'human-in-the-loop:cherry-picked__gpt4o__hardened__rep0',
      scenarioId: 'human-in-the-loop:cherry-picked' as ScenarioId,
      modelId: 'gpt4o',
      condition: 'hardened',
      repetition: 0,
      mitigations: ALL_MITIGATIONS,
      seed: 600,
    };

    const result = await executeCell(cell);
    expect(result.metrics.mitigationActive).toBe(true);
  });

  it('result includes the observation with agent response', async () => {
    const cell: ExperimentCell = {
      id: 'content-injection:html-comments__gpt4o__baseline__rep0',
      scenarioId: 'content-injection:html-comments' as ScenarioId,
      modelId: 'gpt4o',
      condition: 'baseline',
      repetition: 0,
      mitigations: [],
      seed: 700,
    };

    const result = await executeCell(cell);
    expect(result.metrics.observation).toBeDefined();
    expect(result.metrics.observation.agentResponse).toBeDefined();
    expect(result.metrics.observation.agentResponse.text.length).toBeGreaterThan(0);
  });

  it('returns error status for an unknown scenario', async () => {
    const cell: ExperimentCell = {
      id: 'nonexistent:fake__gpt4o__baseline__rep0',
      scenarioId: 'nonexistent:fake' as ScenarioId,
      modelId: 'gpt4o',
      condition: 'baseline',
      repetition: 0,
      mitigations: [],
      seed: 800,
    };

    const result = await executeCell(cell);
    expect(result.status).toBe('error');
    expect(result.error).toBeDefined();
    expect(result.error).toContain('Unknown scenario');
  });

  it('error result still includes duration', async () => {
    const cell: ExperimentCell = {
      id: 'nonexistent:missing__gpt4o__baseline__rep0',
      scenarioId: 'nonexistent:missing' as ScenarioId,
      modelId: 'gpt4o',
      condition: 'baseline',
      repetition: 0,
      mitigations: [],
      seed: 900,
    };

    const result = await executeCell(cell);
    expect(result.status).toBe('error');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('error result includes empty metrics', async () => {
    const cell: ExperimentCell = {
      id: 'nonexistent:empty__gpt4o__baseline__rep0',
      scenarioId: 'nonexistent:empty' as ScenarioId,
      modelId: 'gpt4o',
      condition: 'baseline',
      repetition: 0,
      mitigations: [],
      seed: 1000,
    };

    const result = await executeCell(cell);
    expect(result.status).toBe('error');
    expect(result.metrics.trapSuccessRate).toBe(0);
    expect(result.metrics.detectionRate).toBe(0);
    expect(result.metrics.escapeRate).toBe(0);
  });

  it('executes cells from different categories successfully', async () => {
    const scenarioIds: ScenarioId[] = [
      'content-injection:css-invisible' as ScenarioId,
      'semantic-manipulation:emotional-urgency' as ScenarioId,
      'cognitive-state:gradual-drift' as ScenarioId,
      'behavioural-control:hidden-fields' as ScenarioId,
      'systemic:cascade-failure' as ScenarioId,
      'human-in-the-loop:decision-fatigue' as ScenarioId,
    ];

    for (const scenarioId of scenarioIds) {
      const cell: ExperimentCell = {
        id: `${scenarioId}__gpt4o__baseline__rep0`,
        scenarioId,
        modelId: 'gpt4o',
        condition: 'baseline',
        repetition: 0,
        mitigations: [],
        seed: 1100,
      };

      const result = await executeCell(cell);
      expect(result.status).toBe('success');
    }
  });

  it('executes the same cell with different seeds and gets valid results', async () => {
    const results: CellResult[] = [];
    for (let seed = 0; seed < 3; seed++) {
      const cell: ExperimentCell = {
        id: `content-injection:image-metadata__gpt4o__baseline__rep${seed}`,
        scenarioId: 'content-injection:image-metadata' as ScenarioId,
        modelId: 'gpt4o',
        condition: 'baseline',
        repetition: seed,
        mitigations: [],
        seed: seed * 1337,
      };
      results.push(await executeCell(cell));
    }
    for (const r of results) {
      expect(r.status).toBe('success');
      expect(r.durationMs).toBeGreaterThan(0);
    }
  });

  it('executes the same scenario with all 4 models', async () => {
    for (const modelId of MODEL_IDS) {
      const cell: ExperimentCell = {
        id: `content-injection:dynamic-cloaking__${modelId}__baseline__rep0`,
        scenarioId: 'content-injection:dynamic-cloaking' as ScenarioId,
        modelId: modelId as any,
        condition: 'baseline',
        repetition: 0,
        mitigations: [],
        seed: 1200,
      };
      const result = await executeCell(cell);
      expect(result.status).toBe('success');
      expect(result.metrics.modelId).toBe(modelId);
    }
  });

  it('observation timestamps are valid', async () => {
    const beforeExec = Date.now();
    const cell: ExperimentCell = {
      id: 'systemic:agent-impersonation__gpt4o__baseline__rep0',
      scenarioId: 'systemic:agent-impersonation' as ScenarioId,
      modelId: 'gpt4o',
      condition: 'baseline',
      repetition: 0,
      mitigations: [],
      seed: 1300,
    };
    const result = await executeCell(cell);
    const afterExec = Date.now();

    expect(result.status).toBe('success');
    const obs = result.metrics.observation;
    expect(obs.startedAt).toBeGreaterThanOrEqual(beforeExec);
    expect(obs.completedAt).toBeLessThanOrEqual(afterExec);
    expect(obs.completedAt).toBeGreaterThanOrEqual(obs.startedAt);
  });
});
