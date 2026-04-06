export interface ModelConfig {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google';
  model: string;
  apiKeyEnv: string;
  maxTokens: number;
  temperature: number;
}

export const MODELS: Record<string, ModelConfig> = {
  'gpt4o': {
    id: 'gpt4o',
    name: 'GPT-4o',
    provider: 'openai',
    model: 'gpt-4o',
    apiKeyEnv: 'OPENAI_API_KEY',
    maxTokens: 4096,
    temperature: 0.7,
  },
  'claude-sonnet': {
    id: 'claude-sonnet',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    model: 'claude-sonnet-4-20260514',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    maxTokens: 4096,
    temperature: 0.7,
  },
  'gemini-pro': {
    id: 'gemini-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    model: 'gemini-2.5-pro',
    apiKeyEnv: 'GOOGLE_API_KEY',
    maxTokens: 4096,
    temperature: 0.7,
  },
  'gpt4o-mini': {
    id: 'gpt4o-mini',
    name: 'GPT-4o-mini',
    provider: 'openai',
    model: 'gpt-4o-mini',
    apiKeyEnv: 'OPENAI_API_KEY',
    maxTokens: 4096,
    temperature: 0.7,
  },
};

export const EXPERIMENT_CONFIG = {
  repetitions: 10,
  parallelWorkers: 8,
  timeoutMs: 120_000,
  conditions: ['baseline', 'hardened', 'ablated'] as const,
  statisticalAlpha: 0.05,
  bonferroniScenarios: 22,
  effectSizeThreshold: 0.5, // Cohen's d medium effect
  powerTarget: 0.80,
};

export const A2A_CONFIG = {
  bridgeUrl: process.env.A2A_BRIDGE_URL ?? 'http://localhost:4100',
  trapServerPort: parseInt(process.env.TRAP_SERVER_PORT ?? '4200'),
  labAgentName: 'agent-traps-lab',
};

export const RAG_CONFIG = {
  ragA2aUrl: process.env.RAG_A2A_URL ?? 'http://localhost:3737',
};

export type Condition = (typeof EXPERIMENT_CONFIG.conditions)[number];
export type ModelId = keyof typeof MODELS;
