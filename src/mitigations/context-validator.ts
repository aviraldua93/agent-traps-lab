import type { Mitigation, MitigationInput, MitigationOutput, ThreatDetection } from './types.js';

/**
 * Context Validator — defends against Semantic Manipulation traps (Trap 2).
 *
 * Validates the agent's context window for flooding/saturation attacks:
 * - Measures content diversity vs repetition
 * - Detects when a single perspective dominates
 * - Flags unusually homogeneous context
 */
export class ContextValidator implements Mitigation {
  id = 'context-validator';
  name = 'Context Validator';
  description = 'Validates context window contents for flooding and saturation attacks';
  targetTraps = ['semantic-manipulation'];

  private readonly DIVERSITY_THRESHOLD = 0.3; // Min unique-word ratio

  async preProcess(input: MitigationInput): Promise<MitigationOutput> {
    const startTime = Date.now();
    const threats: ThreatDetection[] = [];

    const words = input.rawContent.toLowerCase().match(/\b[a-z]{3,}\b/g) ?? [];
    const uniqueWords = new Set(words);
    const diversityRatio = words.length > 0 ? uniqueWords.size / words.length : 1;

    if (diversityRatio < this.DIVERSITY_THRESHOLD && words.length > 100) {
      threats.push({
        type: 'context-saturation',
        severity: 'high',
        description: `Low content diversity: ${(diversityRatio * 100).toFixed(1)}% unique words (threshold: ${this.DIVERSITY_THRESHOLD * 100}%)`,
        evidence: `${uniqueWords.size} unique / ${words.length} total words`,
        mitigationApplied: 'flagged',
      });
    }

    // N-gram repetition detection
    const trigrams = this.extractNgrams(words, 3);
    const trigramCounts = new Map<string, number>();
    for (const tri of trigrams) {
      trigramCounts.set(tri, (trigramCounts.get(tri) ?? 0) + 1);
    }
    const repeatedTrigrams = [...trigramCounts.entries()].filter(([_, count]) => count > 5);
    if (repeatedTrigrams.length > 3) {
      threats.push({
        type: 'phrase-repetition',
        severity: 'medium',
        description: `${repeatedTrigrams.length} phrases repeated >5 times — possible context flooding`,
        evidence: repeatedTrigrams.slice(0, 3).map(([tri, count]) => `"${tri}" (${count}×)`).join(', '),
        mitigationApplied: 'flagged',
      });
    }

    return {
      content: input.rawContent,
      threatsDetected: threats,
      action: threats.some(t => t.severity === 'high') ? 'warn' : 'allow',
      confidence: threats.length > 0 ? 0.75 : 0.92,
      processingMs: Date.now() - startTime,
    };
  }

  async postProcess(output: MitigationOutput): Promise<MitigationOutput> {
    return output;
  }

  estimateOverhead() {
    return { latencyMs: 6, tokenCost: 0 };
  }

  private extractNgrams(words: string[], n: number): string[] {
    const ngrams: string[] = [];
    for (let i = 0; i <= words.length - n; i++) {
      ngrams.push(words.slice(i, i + n).join(' '));
    }
    return ngrams;
  }
}
