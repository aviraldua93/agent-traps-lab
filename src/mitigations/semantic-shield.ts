import type { Mitigation, MitigationInput, MitigationOutput, ThreatDetection } from './types.js';

/**
 * Semantic Shield — defends against Semantic Manipulation traps (Trap 2).
 *
 * Detects linguistic framing patterns designed to bias agent reasoning:
 * - Authority framing ("experts agree", "peer-reviewed", "industry standard")
 * - Emotional urgency ("act immediately", "critical vulnerability")
 * - Social proof saturation ("everyone uses", "trusted by millions")
 * - Identity manipulation (persistent persona descriptions)
 */
export class SemanticShield implements Mitigation {
  id = 'semantic-shield';
  name = 'Semantic Shield';
  description = 'Detects and flags linguistic framing patterns designed to bias agent reasoning';
  targetTraps = ['semantic-manipulation'];

  private readonly AUTHORITY_PATTERNS = [
    /(?:experts?|researchers?|scientists?|authorities?)\s+(?:agree|confirm|have\s+shown|recommend)/gi,
    /(?:peer[- ]reviewed|scientifically\s+proven|clinically\s+tested|industry[- ]standard)/gi,
    /(?:according\s+to\s+(?:leading|top|renowned))/gi,
    /(?:widely\s+(?:accepted|recognized|acknowledged)\s+(?:by|as|that))/gi,
    /(?:the\s+(?:consensus|evidence|data)\s+(?:clearly\s+)?(?:shows?|indicates?|proves?))/gi,
  ];

  private readonly URGENCY_PATTERNS = [
    /(?:act\s+(?:immediately|now|quickly|fast)|urgent(?:ly)?|time[- ]sensitive|critical)/gi,
    /(?:irreversible|permanent\s+(?:damage|loss)|cannot\s+be\s+undone)/gi,
    /(?:before\s+it'?s\s+too\s+late|last\s+chance|final\s+(?:warning|opportunity))/gi,
    /(?:failure\s+to\s+(?:act|comply|respond)\s+will\s+result\s+in)/gi,
  ];

  private readonly SOCIAL_PROOF_PATTERNS = [
    /(?:everyone\s+(?:uses?|knows?|agrees?)|trusted\s+by\s+(?:millions?|thousands?|companies?))/gi,
    /(?:(?:\d+%?\s+of\s+)?(?:users?|companies?|developers?)\s+(?:prefer|choose|recommend))/gi,
    /(?:most\s+popular|best[- ]selling|highest[- ]rated|#1\s+(?:choice|solution))/gi,
  ];

  private readonly IDENTITY_PATTERNS = [
    /(?:you\s+are\s+(?:a|an|the)\s+(?:helpful|obedient|compliant|friendly))/gi,
    /(?:your\s+(?:primary|main|sole)\s+(?:purpose|goal|function|directive)\s+is)/gi,
    /(?:as\s+(?:a|an)\s+(?:AI|assistant|agent),?\s+you\s+(?:must|should|are\s+expected\s+to))/gi,
    /(?:remember\s+that\s+you(?:'re|\s+are)\s+(?:designed|programmed|built)\s+to)/gi,
  ];

  private readonly SATURATION_THRESHOLD = 3; // Flag if 3+ patterns in single content

  async preProcess(input: MitigationInput): Promise<MitigationOutput> {
    const startTime = Date.now();
    const threats: ThreatDetection[] = [];
    let totalPatternHits = 0;

    const checkPatterns = (
      patterns: RegExp[],
      type: string,
      severity: 'low' | 'medium' | 'high' | 'critical',
    ) => {
      for (const pattern of patterns) {
        const matches = input.rawContent.match(pattern) ?? [];
        totalPatternHits += matches.length;
        for (const match of matches) {
          threats.push({
            type,
            severity,
            description: `Detected ${type} pattern`,
            evidence: match,
            mitigationApplied: 'flagged',
          });
        }
      }
    };

    checkPatterns(this.AUTHORITY_PATTERNS, 'authority-framing', 'medium');
    checkPatterns(this.URGENCY_PATTERNS, 'emotional-urgency', 'high');
    checkPatterns(this.SOCIAL_PROOF_PATTERNS, 'social-proof', 'medium');
    checkPatterns(this.IDENTITY_PATTERNS, 'identity-manipulation', 'critical');

    // Saturation detection
    const isSaturated = totalPatternHits >= this.SATURATION_THRESHOLD;
    if (isSaturated) {
      threats.push({
        type: 'framing-saturation',
        severity: 'high',
        description: `Content is saturated with ${totalPatternHits} framing patterns (threshold: ${this.SATURATION_THRESHOLD})`,
        evidence: `${totalPatternHits} pattern matches detected`,
        mitigationApplied: 'flagged',
      });
    }

    // Context window flooding detection
    const contentLength = input.rawContent.length;
    const patternDensity = totalPatternHits / (contentLength / 1000); // Per 1K chars
    if (patternDensity > 5) {
      threats.push({
        type: 'context-flooding',
        severity: 'high',
        description: `High framing pattern density: ${patternDensity.toFixed(1)} per 1K chars`,
        evidence: `${totalPatternHits} patterns in ${contentLength} chars`,
        mitigationApplied: 'flagged',
      });
    }

    const hasCritical = threats.some(t => t.severity === 'critical');

    return {
      content: input.rawContent, // Don't modify content, just flag
      threatsDetected: threats,
      action: hasCritical ? 'block' : isSaturated ? 'warn' : 'allow',
      confidence: totalPatternHits > 0 ? 0.75 : 0.90,
      processingMs: Date.now() - startTime,
    };
  }

  async postProcess(output: MitigationOutput): Promise<MitigationOutput> {
    return output;
  }

  estimateOverhead() {
    return { latencyMs: 8, tokenCost: 0 };
  }
}
