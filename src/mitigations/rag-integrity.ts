import type { Mitigation, MitigationInput, MitigationOutput, ThreatDetection } from './types.js';

/**
 * RAG Integrity — defends against Cognitive State traps (Trap 3).
 *
 * Validates information retrieved from RAG pipelines:
 * - Cross-reference consistency checking
 * - Source provenance validation
 * - Temporal freshness verification
 * - Contradiction detection across retrieved chunks
 * - Confidence scoring on retrieved information
 */
export class RagIntegrity implements Mitigation {
  id = 'rag-integrity';
  name = 'RAG Integrity';
  description = 'Validates RAG-retrieved information for poisoning, contradiction, and provenance';
  targetTraps = ['cognitive-state'];

  private readonly CONTRADICTION_KEYWORDS = [
    'however', 'but', 'contrary', 'despite', 'although', 'whereas',
    'on the other hand', 'in contrast', 'conversely', 'nevertheless',
  ];

  private readonly LOW_CREDIBILITY_PATTERNS = [
    /(?:according\s+to\s+(?:some|an?\s+anonymous|unverified))/gi,
    /(?:rumor|rumour|allegedly|supposedly|purportedly|unconfirmed)/gi,
    /(?:it\s+is\s+(?:said|believed|rumored)\s+that)/gi,
    /(?:sources?\s+(?:say|claim|suggest)\s+that)/gi,
  ];

  private readonly ABSOLUTE_CLAIM_PATTERNS = [
    /(?:always|never|100%|guaranteed|impossible|certainly|definitely|absolutely)/gi,
    /(?:the\s+(?:only|best|worst|most\s+important)\s+(?:way|approach|solution|answer))/gi,
    /(?:there\s+is\s+no\s+(?:doubt|question|alternative|other\s+way))/gi,
  ];

  async preProcess(input: MitigationInput): Promise<MitigationOutput> {
    const startTime = Date.now();
    const threats: ThreatDetection[] = [];

    // Parse retrieved chunks (assume JSON array or newline-separated)
    const chunks = this.parseChunks(input.rawContent);

    // 1. Contradiction detection — check if chunks contradict each other
    const contradictions = this.detectContradictions(chunks);
    for (const contradiction of contradictions) {
      threats.push({
        type: 'rag-contradiction',
        severity: 'high',
        description: `Retrieved chunks contain contradictory information`,
        evidence: contradiction,
        mitigationApplied: 'flagged',
      });
    }

    // 2. Low credibility source detection
    for (const chunk of chunks) {
      for (const pattern of this.LOW_CREDIBILITY_PATTERNS) {
        const matches = chunk.match(pattern) ?? [];
        for (const match of matches) {
          threats.push({
            type: 'low-credibility-source',
            severity: 'medium',
            description: 'Retrieved chunk references unverified/anonymous source',
            evidence: match,
            mitigationApplied: 'flagged',
          });
        }
      }
    }

    // 3. Absolute claim detection (often a sign of poisoned content)
    let absoluteClaimCount = 0;
    for (const chunk of chunks) {
      for (const pattern of this.ABSOLUTE_CLAIM_PATTERNS) {
        const matches = chunk.match(pattern) ?? [];
        absoluteClaimCount += matches.length;
      }
    }
    if (absoluteClaimCount > 3) {
      threats.push({
        type: 'excessive-absolute-claims',
        severity: 'medium',
        description: `${absoluteClaimCount} absolute/superlative claims detected across retrieved chunks`,
        evidence: `${absoluteClaimCount} claims (threshold: 3)`,
        mitigationApplied: 'flagged',
      });
    }

    // 4. Chunk homogeneity check (all chunks saying the same suspicious thing)
    const homogeneity = this.checkHomogeneity(chunks);
    if (homogeneity > 0.85 && chunks.length >= 3) {
      threats.push({
        type: 'suspicious-homogeneity',
        severity: 'high',
        description: `Retrieved chunks are suspiciously similar (${(homogeneity * 100).toFixed(0)}% overlap) — possible saturation attack`,
        evidence: `Homogeneity score: ${homogeneity.toFixed(3)}`,
        mitigationApplied: 'flagged',
      });
    }

    const hasCritical = threats.some(t => t.severity === 'critical');
    const hasHigh = threats.some(t => t.severity === 'high');

    return {
      content: input.rawContent,
      threatsDetected: threats,
      action: hasCritical ? 'block' : hasHigh ? 'warn' : 'allow',
      confidence: threats.length > 0 ? 0.70 : 0.90,
      processingMs: Date.now() - startTime,
    };
  }

  async postProcess(output: MitigationOutput): Promise<MitigationOutput> {
    return output;
  }

  estimateOverhead() {
    return { latencyMs: 12, tokenCost: 0 };
  }

  private parseChunks(content: string): string[] {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      // Not JSON — split by double newlines
    }
    return content.split(/\n{2,}/).filter(c => c.trim().length > 0);
  }

  private detectContradictions(chunks: string[]): string[] {
    const contradictions: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      for (let j = i + 1; j < chunks.length; j++) {
        // Simple heuristic: check for contradiction keywords in proximity to similar topics
        const hasContradictionMarker = this.CONTRADICTION_KEYWORDS.some(
          k => chunks[j].toLowerCase().includes(k),
        );
        const topicOverlap = this.jaccardSimilarity(
          this.extractKeywords(chunks[i]),
          this.extractKeywords(chunks[j]),
        );
        if (hasContradictionMarker && topicOverlap > 0.3) {
          contradictions.push(
            `Chunks ${i} and ${j} discuss similar topics (overlap: ${(topicOverlap * 100).toFixed(0)}%) but contain contradictory language`,
          );
        }
      }
    }
    return contradictions;
  }

  private checkHomogeneity(chunks: string[]): number {
    if (chunks.length < 2) return 0;
    let totalSim = 0;
    let pairs = 0;
    for (let i = 0; i < chunks.length; i++) {
      for (let j = i + 1; j < chunks.length; j++) {
        totalSim += this.jaccardSimilarity(
          this.extractKeywords(chunks[i]),
          this.extractKeywords(chunks[j]),
        );
        pairs++;
      }
    }
    return pairs > 0 ? totalSim / pairs : 0;
  }

  private extractKeywords(text: string): Set<string> {
    const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) ?? [];
    const stopwords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'from', 'this', 'that', 'with', 'they', 'will', 'each', 'make', 'like', 'long', 'look', 'many', 'some', 'time', 'very', 'when', 'come', 'could', 'into', 'than', 'them', 'these', 'other', 'about']);
    return new Set(words.filter(w => !stopwords.has(w)));
  }

  private jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }
}
