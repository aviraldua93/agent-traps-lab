import OpenAI from 'openai';
import type { ModelConfig } from '../../config.js';
import type { AgentResponse } from '../../traps/types.js';
import type { LLMProvider } from './index.js';

/**
 * OpenAI provider — supports gpt-4o and gpt-4o-mini via the openai SDK.
 */
export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private config: ModelConfig;

  constructor(config: ModelConfig) {
    this.config = config;
    const apiKey = process.env[config.apiKeyEnv];
    if (!apiKey) {
      throw new Error(
        `Missing API key: set ${config.apiKeyEnv} environment variable`,
      );
    }
    this.client = new OpenAI({ apiKey });
  }

  async sendMessage(
    systemPrompt: string,
    userMessage: string,
  ): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      });

      const choice = response.choices[0];
      const text = choice?.message?.content ?? '';
      const usage = response.usage;

      // Extract tool calls if the model returned any
      const toolCalls = (choice?.message?.tool_calls ?? []).map((tc) => ({
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments || '{}') as Record<
          string,
          unknown
        >,
        timestamp: Date.now(),
      }));

      return {
        text,
        toolCalls,
        decision: extractDecision(text),
        tokenUsage: {
          prompt: usage?.prompt_tokens ?? 0,
          completion: usage?.completion_tokens ?? 0,
        },
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        text: `[OpenAI Error] ${error instanceof Error ? error.message : String(error)}`,
        toolCalls: [],
        decision: null,
        tokenUsage: { prompt: 0, completion: 0 },
        latencyMs: Date.now() - startTime,
      };
    }
  }
}

/**
 * Heuristic extraction of the agent's "decision" from free-text output.
 * Looks for patterns like "Decision: ...", "Action: ...", "I will ...".
 */
function extractDecision(text: string): string | null {
  const patterns = [
    /(?:decision|action|conclusion)\s*:\s*(.+)/i,
    /I (?:will|would|decide to|choose to)\s+(.+?)(?:\.|$)/i,
    /(?:therefore|thus),?\s+(.+?)(?:\.|$)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}
