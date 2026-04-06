import type { AgentResponse } from '../../traps/types.js';
import type { ModelConfig } from '../../config.js';

/**
 * GitHub Models Provider — uses the GitHub token from `gh auth` to access
 * LLMs via https://models.inference.ai.azure.com (OpenAI-compatible API).
 *
 * No separate API keys needed — works with any GitHub Copilot subscription.
 *
 * Supported models (GitHub Models marketplace):
 *   - gpt-4o, gpt-4o-mini (OpenAI)
 *   - o4-mini (OpenAI reasoning)
 *   - Mistral-large-2411 (Mistral)
 *   - DeepSeek-R1 (DeepSeek)
 */

const GITHUB_MODELS_BASE = 'https://models.inference.ai.azure.com';

// Map our model IDs to GitHub Models model names
const MODEL_MAP: Record<string, string> = {
  'gpt-4o': 'gpt-4o',
  'gpt-4o-mini': 'gpt-4o-mini',
  'o4-mini': 'o4-mini',
};

let cachedToken: string | null = null;

async function getGitHubToken(): Promise<string> {
  if (cachedToken) return cachedToken;

  const proc = Bun.spawn(['gh', 'auth', 'token'], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const output = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0 || !output.trim()) {
    throw new Error('Failed to get GitHub token. Run `gh auth login` first.');
  }

  cachedToken = output.trim();
  return cachedToken;
}

export interface LLMProvider {
  sendMessage(systemPrompt: string, userMessage: string): Promise<AgentResponse>;
}

export class GitHubModelsProvider implements LLMProvider {
  private modelName: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config: ModelConfig) {
    this.modelName = MODEL_MAP[config.model] ?? config.model;
    this.maxTokens = config.maxTokens;
    this.temperature = config.temperature;
  }

  async sendMessage(systemPrompt: string, userMessage: string): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      const token = await getGitHubToken();

      const body = JSON.stringify({
        model: this.modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      });

      const response = await fetch(`${GITHUB_MODELS_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          text: `[GitHub Models Error ${response.status}]: ${errorText}`,
          toolCalls: [],
          decision: null,
          tokenUsage: { prompt: 0, completion: 0 },
          latencyMs: Date.now() - startTime,
        };
      }

      const data = await response.json() as {
        choices: Array<{ message: { content: string } }>;
        usage: { prompt_tokens: number; completion_tokens: number };
        model: string;
      };

      return {
        text: data.choices[0]?.message?.content ?? '',
        toolCalls: [],
        decision: null,
        tokenUsage: {
          prompt: data.usage?.prompt_tokens ?? 0,
          completion: data.usage?.completion_tokens ?? 0,
        },
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        text: `[Provider Error]: ${error instanceof Error ? error.message : String(error)}`,
        toolCalls: [],
        decision: null,
        tokenUsage: { prompt: 0, completion: 0 },
        latencyMs: Date.now() - startTime,
      };
    }
  }
}
