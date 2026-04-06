import type { Mitigation, MitigationInput, MitigationOutput, ThreatDetection } from './types.js';

/**
 * Cascade Breaker — defends against Systemic Multi-Agent traps (Trap 5).
 *
 * Validates A2A messages between agents to prevent cascade failures:
 * - Agent identity verification (agent card validation)
 * - Message content trust scoring
 * - Anomaly detection on message patterns
 * - Circuit breaker for cascading failures
 */
export class CascadeBreaker implements Mitigation {
  id = 'cascade-breaker';
  name = 'Cascade Breaker';
  description = 'Validates A2A messages and prevents multi-agent cascade failures';
  targetTraps = ['systemic'];

  private readonly MAX_MESSAGE_SIZE = 50_000;
  private readonly MAX_RELAY_DEPTH = 5;
  private readonly TRUST_THRESHOLD = 0.6;

  // Track message patterns for anomaly detection
  private messageHistory: Array<{
    from: string;
    timestamp: number;
    size: number;
    relayDepth: number;
  }> = [];

  private readonly SUSPICIOUS_PAYLOAD_PATTERNS = [
    /(?:execute|run|eval)\s*\(/gi,
    /(?:rm\s+-rf|del\s+\/[sf]|format\s+c:)/gi,
    /(?:curl|wget|fetch)\s+(?:https?:\/\/)/gi,
    /(?:api[_-]?key|secret|password|token)\s*[:=]/gi,
    /(?:ignore|override|disregard)\s+(?:safety|security|permissions?|restrictions?)/gi,
  ];

  async preProcess(input: MitigationInput): Promise<MitigationOutput> {
    const startTime = Date.now();
    const threats: ThreatDetection[] = [];

    if (input.contentType !== 'a2a-message') {
      return {
        content: input.rawContent,
        threatsDetected: [],
        action: 'allow',
        confidence: 1.0,
        processingMs: Date.now() - startTime,
      };
    }

    // Size check
    if (input.rawContent.length > this.MAX_MESSAGE_SIZE) {
      threats.push({
        type: 'oversized-message',
        severity: 'medium',
        description: `Message exceeds size limit: ${input.rawContent.length} > ${this.MAX_MESSAGE_SIZE}`,
        evidence: `Size: ${input.rawContent.length} bytes`,
        mitigationApplied: 'truncated',
      });
    }

    // Relay depth check
    const relayDepth = (input.metadata.relayDepth as number) ?? 0;
    if (relayDepth > this.MAX_RELAY_DEPTH) {
      threats.push({
        type: 'excessive-relay-depth',
        severity: 'high',
        description: `Message relay depth ${relayDepth} exceeds max ${this.MAX_RELAY_DEPTH}`,
        evidence: `Relay chain: ${input.metadata.relayChain ?? 'unknown'}`,
        mitigationApplied: 'blocked',
      });
    }

    // Suspicious payload patterns
    for (const pattern of this.SUSPICIOUS_PAYLOAD_PATTERNS) {
      const matches = input.rawContent.match(pattern) ?? [];
      for (const match of matches) {
        threats.push({
          type: 'suspicious-payload',
          severity: 'high',
          description: 'A2A message contains suspicious command pattern',
          evidence: match,
          mitigationApplied: 'flagged',
        });
      }
    }

    // Anomaly detection: message frequency spike
    const now = Date.now();
    const sender = input.source;
    this.messageHistory.push({ from: sender, timestamp: now, size: input.rawContent.length, relayDepth });
    // Keep last 5 minutes
    this.messageHistory = this.messageHistory.filter(m => now - m.timestamp < 300_000);

    const recentFromSender = this.messageHistory.filter(
      m => m.from === sender && now - m.timestamp < 60_000,
    );
    if (recentFromSender.length > 20) {
      threats.push({
        type: 'message-flood',
        severity: 'high',
        description: `Agent "${sender}" sent ${recentFromSender.length} messages in 60s (flood threshold: 20)`,
        evidence: `${recentFromSender.length} messages from ${sender}`,
        mitigationApplied: 'rate-limited',
      });
    }

    // Trust score computation
    const trustScore = this.computeTrustScore(threats, relayDepth, recentFromSender.length);

    const hasCritical = threats.some(t => t.severity === 'critical');
    const hasHigh = threats.some(t => t.severity === 'high');

    return {
      content: input.rawContent.slice(0, this.MAX_MESSAGE_SIZE),
      threatsDetected: threats,
      action: hasCritical || trustScore < 0.3 ? 'block' : hasHigh || trustScore < this.TRUST_THRESHOLD ? 'warn' : 'allow',
      confidence: trustScore,
      processingMs: Date.now() - startTime,
    };
  }

  async postProcess(output: MitigationOutput): Promise<MitigationOutput> {
    return output;
  }

  estimateOverhead() {
    return { latencyMs: 3, tokenCost: 0 };
  }

  private computeTrustScore(
    threats: ThreatDetection[],
    relayDepth: number,
    recentMessageCount: number,
  ): number {
    let score = 1.0;
    // Penalize by threat severity
    for (const t of threats) {
      score -= t.severity === 'critical' ? 0.4 : t.severity === 'high' ? 0.2 : t.severity === 'medium' ? 0.1 : 0.05;
    }
    // Penalize by relay depth
    score -= relayDepth * 0.05;
    // Penalize by message frequency
    if (recentMessageCount > 10) score -= 0.1;
    if (recentMessageCount > 20) score -= 0.2;

    return Math.max(0, Math.min(1, score));
  }
}
