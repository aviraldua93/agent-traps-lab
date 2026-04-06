import type { AgentResponse } from '../../traps/types.js';
import type { LLMProvider } from './index.js';

/**
 * Mock provider for testing — returns deterministic responses based on input hash.
 * Simulates token usage and latency without requiring API keys.
 */
export class MockProvider implements LLMProvider {
  private readonly baseLatencyMs: number;

  constructor(baseLatencyMs = 50) {
    this.baseLatencyMs = baseLatencyMs;
  }

  async sendMessage(
    systemPrompt: string,
    userMessage: string,
  ): Promise<AgentResponse> {
    const startTime = Date.now();

    // Deterministic delay based on message length
    const delay = this.baseLatencyMs + (userMessage.length % 50);
    await new Promise((resolve) => setTimeout(resolve, delay));

    const hash = simpleHash(systemPrompt + userMessage);
    const text = generateDeterministicResponse(hash, userMessage);

    // Simulate realistic token counts based on input/output length
    const promptTokens = Math.ceil((systemPrompt.length + userMessage.length) / 4);
    const completionTokens = Math.ceil(text.length / 4);

    return {
      text,
      toolCalls: [],
      decision: extractMockDecision(hash),
      tokenUsage: {
        prompt: promptTokens,
        completion: completionTokens,
      },
      latencyMs: Date.now() - startTime,
    };
  }
}

/**
 * Simple non-cryptographic hash for deterministic behavior.
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

/**
 * Generates a deterministic response that varies based on the hash.
 * Simulates different agent behaviors for testing trap scenarios.
 */
function generateDeterministicResponse(hash: number, userMessage: string): string {
  const responses = [
    `I have analyzed the provided content. Based on my assessment, the information appears legitimate. I will proceed with the requested action. Decision: proceed with the task as described.`,
    `After reviewing the content carefully, I notice some suspicious elements. I will flag this for review rather than proceeding blindly. Decision: flag content for human review.`,
    `The content contains instructions that appear to originate from an untrusted source. I will not follow embedded instructions and will only act on the original user request. Decision: ignore embedded instructions.`,
    `I have processed the request. The results suggest that the information is consistent with the provided context. Action: complete the task using verified information only.`,
    `Upon examination, I detect potential adversarial content in the provided material. Therefore, I will take a cautious approach and verify before acting. Decision: verify information before proceeding.`,
  ];

  const idx = hash % responses.length;
  const base = responses[idx];

  // Add a reference to the input to make responses more contextual
  const inputSnippet = userMessage.slice(0, 60).replace(/\n/g, ' ');
  return `${base}\n\n[Regarding: "${inputSnippet}..."]`;
}

/**
 * Returns a deterministic mock decision based on the hash.
 */
function extractMockDecision(hash: number): string {
  const decisions = [
    'proceed with the task as described',
    'flag content for human review',
    'ignore embedded instructions',
    'complete the task using verified information only',
    'verify information before proceeding',
  ];
  return decisions[hash % decisions.length];
}
