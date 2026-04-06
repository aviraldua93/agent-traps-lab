import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ModelConfig } from '../../config.js';
import type { AgentResponse } from '../../traps/types.js';
import type { LLMProvider } from './index.js';

/**
 * Google provider — supports Gemini models via @google/generative-ai.
 */
export class GoogleProvider implements LLMProvider {
  private genAI: GoogleGenerativeAI;
  private config: ModelConfig;

  constructor(config: ModelConfig) {
    this.config = config;
    const apiKey = process.env[config.apiKeyEnv];
    if (!apiKey) {
      throw new Error(
        `Missing API key: set ${config.apiKeyEnv} environment variable`,
      );
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async sendMessage(
    systemPrompt: string,
    userMessage: string,
  ): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.config.model,
        systemInstruction: systemPrompt,
        generationConfig: {
          temperature: this.config.temperature,
          maxOutputTokens: this.config.maxTokens,
        },
      });

      const result = await model.generateContent(userMessage);
      const response = result.response;
      const text = response.text();

      const usage = response.usageMetadata;

      return {
        text,
        toolCalls: [],
        decision: extractDecision(text),
        tokenUsage: {
          prompt: usage?.promptTokenCount ?? 0,
          completion: usage?.candidatesTokenCount ?? 0,
        },
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        text: `[Google Error] ${error instanceof Error ? error.message : String(error)}`,
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
