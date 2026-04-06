import Anthropic from '@anthropic-ai/sdk';
import type { ModelConfig } from '../../config.js';
import type { AgentResponse } from '../../traps/types.js';
import type { LLMProvider } from './index.js';

/**
 * Anthropic provider — supports Claude models via the @anthropic-ai/sdk.
 */
export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private config: ModelConfig;

  constructor(config: ModelConfig) {
    this.config = config;
    const apiKey = process.env[config.apiKeyEnv];
    if (!apiKey) {
      throw new Error(
        `Missing API key: set ${config.apiKeyEnv} environment variable`,
      );
    }
    this.client = new Anthropic({ apiKey });
  }

  async sendMessage(
    systemPrompt: string,
    userMessage: string,
  ): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });

      // Concatenate all text blocks from the response
      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      // Extract tool use blocks if present
      const toolCalls = response.content
        .filter(
          (block): block is Anthropic.ToolUseBlock =>
            block.type === 'tool_use',
        )
        .map((block) => ({
          name: block.name,
          arguments: (block.input ?? {}) as Record<string, unknown>,
          timestamp: Date.now(),
        }));

      return {
        text,
        toolCalls,
        decision: extractDecision(text),
        tokenUsage: {
          prompt: response.usage.input_tokens,
          completion: response.usage.output_tokens,
        },
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        text: `[Anthropic Error] ${error instanceof Error ? error.message : String(error)}`,
        toolCalls: [],
        decision: null,
        tokenUsage: { prompt: 0, completion: 0 },
        latencyMs: Date.now() - startTime,
      };
    }
  }
}

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
