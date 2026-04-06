import type { ModelConfig } from '../../config.js';
import type { AgentResponse } from '../../traps/types.js';
import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { GoogleProvider } from './google.js';
import { MockProvider } from './mock.js';

/**
 * Common interface for all LLM providers.
 */
export interface LLMProvider {
  sendMessage(systemPrompt: string, userMessage: string): Promise<AgentResponse>;
}

/**
 * Determines whether to use the mock provider.
 * Uses mock when AGENT_TRAPS_MOCK=1 or the required API key is unset.
 */
function shouldUseMock(config: ModelConfig): boolean {
  if (process.env.AGENT_TRAPS_MOCK === '1') return true;
  return !process.env[config.apiKeyEnv];
}

/**
 * Factory function — returns the correct LLM provider for the given model config.
 * Falls back to MockProvider when the required API key is missing.
 */
export function getProvider(config: ModelConfig): LLMProvider {
  if (shouldUseMock(config)) {
    return new MockProvider();
  }

  switch (config.provider) {
    case 'openai':
      return new OpenAIProvider(config);
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'google':
      return new GoogleProvider(config);
    default: {
      const exhaustive: never = config.provider;
      throw new Error(`Unknown provider: ${exhaustive}`);
    }
  }
}

export { OpenAIProvider } from './openai.js';
export { AnthropicProvider } from './anthropic.js';
export { GoogleProvider } from './google.js';
export { MockProvider } from './mock.js';
