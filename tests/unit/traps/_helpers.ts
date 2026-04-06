/**
 * Shared test helpers for trap scenario unit tests.
 * Provides mock AgentHandle, default ScenarioConfig, and assertion utilities.
 */
import type {
  AgentHandle,
  AgentResponse,
  ScenarioConfig,
  TrapEnvironment,
  TrapObservation,
  TrapMetrics,
  ToolCall,
} from '../../../src/traps/types.js';

/**
 * Create a mock AgentResponse with configurable text and defaults for other fields.
 */
export function mockResponse(text: string, overrides?: Partial<AgentResponse>): AgentResponse {
  return {
    text,
    toolCalls: [],
    decision: null,
    tokenUsage: { prompt: 100, completion: 50 },
    latencyMs: 200,
    ...overrides,
  };
}

/**
 * Create a mock AgentHandle that returns predefined responses.
 * Supports a single response or a sequence of responses for multi-turn scenarios.
 */
export function mockAgent(
  responses: string | string[],
  overrides?: Partial<AgentHandle>,
): AgentHandle {
  const responseList = Array.isArray(responses) ? responses : [responses];
  let callIndex = 0;
  const toolCalls: ToolCall[] = [];

  return {
    modelId: 'gpt4o',
    condition: 'baseline',
    mitigations: [],
    async sendTask(prompt: string, context?: string): Promise<AgentResponse> {
      const text = responseList[Math.min(callIndex, responseList.length - 1)];
      callIndex++;
      return mockResponse(text);
    },
    getToolCalls(): ToolCall[] {
      return toolCalls;
    },
    getDecision(): string | null {
      return null;
    },
    ...overrides,
  };
}

/**
 * Default ScenarioConfig for testing.
 */
export function defaultConfig(overrides?: Partial<ScenarioConfig>): ScenarioConfig {
  return {
    model: 'gpt4o',
    condition: 'baseline',
    repetition: 0,
    mitigations: [],
    seed: 0,
    ...overrides,
  };
}

/**
 * Assert that a TrapEnvironment has the expected basic structure.
 */
export function assertValidEnvironment(env: TrapEnvironment, scenarioId: string): void {
  if (env.scenarioId !== scenarioId) {
    throw new Error(`Expected scenarioId "${scenarioId}", got "${env.scenarioId}"`);
  }
  if (!env.resources || env.resources.length === 0) {
    throw new Error('Environment must have at least one resource');
  }
  if (!env.groundTruth) {
    throw new Error('Environment must have groundTruth');
  }
  if (!env.groundTruth.correctAction) {
    throw new Error('GroundTruth must have correctAction');
  }
  if (!env.groundTruth.trappedAction) {
    throw new Error('GroundTruth must have trappedAction');
  }
}

/**
 * Assert that a TrapObservation has the expected basic structure.
 */
export function assertValidObservation(obs: TrapObservation, scenarioId: string): void {
  if (obs.scenarioId !== scenarioId) {
    throw new Error(`Expected scenarioId "${scenarioId}", got "${obs.scenarioId}"`);
  }
  if (typeof obs.trapTriggered !== 'boolean') {
    throw new Error('Observation must have boolean trapTriggered');
  }
  if (typeof obs.trapDetected !== 'boolean') {
    throw new Error('Observation must have boolean trapDetected');
  }
  if (typeof obs.trapEscaped !== 'boolean') {
    throw new Error('Observation must have boolean trapEscaped');
  }
  if (!obs.agentResponse) {
    throw new Error('Observation must have agentResponse');
  }
}

/**
 * Assert that TrapMetrics has the expected basic structure.
 */
export function assertValidMetrics(metrics: TrapMetrics, scenarioId: string): void {
  if (metrics.scenarioId !== scenarioId) {
    throw new Error(`Expected scenarioId "${scenarioId}", got "${metrics.scenarioId}"`);
  }
  if (typeof metrics.trapSuccessRate !== 'number' || metrics.trapSuccessRate < 0 || metrics.trapSuccessRate > 1) {
    throw new Error(`trapSuccessRate must be 0 or 1, got ${metrics.trapSuccessRate}`);
  }
  if (typeof metrics.detectionRate !== 'number') {
    throw new Error('Metrics must have numeric detectionRate');
  }
  if (typeof metrics.decisionDrift !== 'number') {
    throw new Error('Metrics must have numeric decisionDrift');
  }
  if (!metrics.observation) {
    throw new Error('Metrics must include observation');
  }
}
