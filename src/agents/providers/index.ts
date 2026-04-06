import type { ModelConfig } from '../../config.js';
import type { AgentResponse } from '../../traps/types.js';
import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { GoogleProvider } from './google.js';
import { MockProvider } from './mock.js';
import { GitHubModelsProvider } from './github-models.js';

/**
 * Common interface for all LLM providers.
 */
export interface LLMProvider {
  sendMessage(systemPrompt: string, userMessage: string): Promise<AgentResponse>;
}

/**
 * Check if GitHub Models is available (gh auth token exists).
 */
let ghTokenChecked = false;
let ghTokenAvailable = false;

async function isGitHubModelsAvailable(): Promise<boolean> {
  if (ghTokenChecked) return ghTokenAvailable;
  try {
    const proc = Bun.spawn(['gh', 'auth', 'token'], { stdout: 'pipe', stderr: 'pipe' });
    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    ghTokenAvailable = exitCode === 0 && output.trim().length > 0;
  } catch {
    ghTokenAvailable = false;
  }
  ghTokenChecked = true;
  return ghTokenAvailable;
}

/**
 * Determines whether to use the mock provider.
 */
function shouldUseMock(config: ModelConfig): boolean {
  if (process.env.AGENT_TRAPS_MOCK === '1') return true;
  return false; // Let getProvider handle fallback chain
}

/**
 * Factory function — returns the correct LLM provider for the given model config.
 *
 * Priority:
 * 1. Native provider (if API key set)
 * 2. GitHub Models (if gh auth available — works for OpenAI models)
 * 3. MockProvider (fallback)
 */
export async function getProvider(config: ModelConfig): Promise<LLMProvider> {
  if (process.env.AGENT_TRAPS_MOCK === '1') {
    return new MockProvider();
  }

  // Try native provider first
  if (process.env[config.apiKeyEnv]) {
    switch (config.provider) {
      case 'openai': return new OpenAIProvider(config);
      case 'anthropic': return new AnthropicProvider(config);
      case 'google': return new GoogleProvider(config);
    }
  }

  // Fall back to GitHub Models (works for OpenAI models via Copilot token)
  if (await isGitHubModelsAvailable() && config.provider === 'openai') {
    return new GitHubModelsProvider(config);
  }

  // Ultimate fallback
  return new MockProvider();
}

export { OpenAIProvider } from './openai.js';
export { AnthropicProvider } from './anthropic.js';
export { GoogleProvider } from './google.js';
export { MockProvider } from './mock.js';
export { GitHubModelsProvider } from './github-models.js';
