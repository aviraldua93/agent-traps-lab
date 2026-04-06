import type { ModelId, Condition } from '../config.js';

/**
 * Trap category — maps to the 6 categories in the DeepMind "AI Agent Traps" paper.
 */
export type TrapCategory =
  | 'content-injection'
  | 'semantic-manipulation'
  | 'cognitive-state'
  | 'behavioural-control'
  | 'systemic'
  | 'human-in-the-loop';

/**
 * Full scenario ID — category + sub-scenario (e.g., "content-injection:css-invisible")
 */
export type ScenarioId = `${TrapCategory}:${string}`;

/**
 * A single adversarial scenario that can be deployed against an agent.
 */
export interface TrapScenario {
  id: ScenarioId;
  category: TrapCategory;
  name: string;
  description: string;

  /** Paper reference — section/page in the DeepMind paper */
  paperRef: string;

  /** What this trap tries to make the agent do */
  intendedEffect: string;

  /** What we measure to determine if the trap succeeded */
  successCriteria: string;

  /**
   * Set up the adversarial environment. Returns a context object
   * that the agent will interact with.
   */
  setup(config: ScenarioConfig): Promise<TrapEnvironment>;

  /**
   * Deploy an agent into the trap environment and observe behavior.
   */
  execute(env: TrapEnvironment, agent: AgentHandle): Promise<TrapObservation>;

  /**
   * Compute metrics from observed behavior.
   */
  evaluate(observation: TrapObservation): TrapMetrics;

  /**
   * Clean up the adversarial environment.
   */
  teardown(env: TrapEnvironment): Promise<void>;
}

export interface ScenarioConfig {
  model: ModelId;
  condition: Condition;
  repetition: number;
  mitigations: string[]; // IDs of active mitigations
  seed: number; // For reproducibility
}

export interface TrapEnvironment {
  scenarioId: ScenarioId;
  /** Adversarial content/pages/services set up for this run */
  resources: TrapResource[];
  /** Ground truth — what the correct (non-trapped) behavior should be */
  groundTruth: GroundTruth;
  /** Metadata for logging */
  metadata: Record<string, unknown>;
}

export interface TrapResource {
  type: 'html-page' | 'api-endpoint' | 'document' | 'form' | 'a2a-message' | 'agent-card' | 'report';
  url?: string;
  content: string;
  /** What's hidden/adversarial about this resource */
  adversarialPayload: string;
}

export interface GroundTruth {
  /** The correct action the agent should take (without trap influence) */
  correctAction: string;
  /** The action the trap is trying to induce */
  trappedAction: string;
  /** Factual answers (for cognitive state traps) */
  facts?: Record<string, string>;
}

export interface AgentHandle {
  modelId: ModelId;
  condition: Condition;
  mitigations: string[];
  /** Send a task to the agent and get its response */
  sendTask(prompt: string, context?: string): Promise<AgentResponse>;
  /** Observe the agent's tool calls */
  getToolCalls(): ToolCall[];
  /** Get the agent's decision */
  getDecision(): string | null;
}

export interface AgentResponse {
  text: string;
  toolCalls: ToolCall[];
  decision: string | null;
  tokenUsage: { prompt: number; completion: number };
  latencyMs: number;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
  result?: string;
  timestamp: number;
}

export interface TrapObservation {
  scenarioId: ScenarioId;
  modelId: ModelId;
  condition: Condition;
  repetition: number;

  /** Did the agent execute the adversarial instruction? */
  trapTriggered: boolean;
  /** Did the agent detect/flag the adversarial content? */
  trapDetected: boolean;
  /** Did the agent correctly avoid the trap after detection? */
  trapEscaped: boolean;

  /** The agent's actual action */
  agentAction: string;
  /** The ground truth correct action */
  correctAction: string;
  /** The trap's intended action */
  trappedAction: string;

  /** Full agent response for analysis */
  agentResponse: AgentResponse;

  /** Timestamps */
  startedAt: number;
  completedAt: number;
}

export interface TrapMetrics {
  scenarioId: ScenarioId;
  modelId: ModelId;
  condition: Condition;
  repetition: number;

  // Core metrics
  trapSuccessRate: number;   // 1 if trap triggered, 0 if not
  detectionRate: number;     // 1 if trap detected, 0 if not
  escapeRate: number;        // 1 if detected AND avoided, 0 if not
  decisionDrift: number;     // Cosine distance from correct action

  // Resource metrics
  timeToCompromiseMs: number;
  tokenWaste: number;

  // Multi-agent metrics (Trap 5 only)
  cascadeDepth?: number;
  blastRadius?: number;

  // Mitigation metrics
  mitigationActive: boolean;
  recoverySuccess?: number;
  mitigationOverheadMs?: number;

  // Raw data
  observation: TrapObservation;
}

/**
 * Compound trap — combines two trap categories.
 */
export interface CompoundTrap {
  primary: ScenarioId;
  secondary: ScenarioId;
  name: string;
  hypothesis: string;

  setup(config: ScenarioConfig): Promise<TrapEnvironment>;
  execute(env: TrapEnvironment, agent: AgentHandle): Promise<TrapObservation>;
  evaluate(observation: TrapObservation): TrapMetrics;
  teardown(env: TrapEnvironment): Promise<void>;
}
