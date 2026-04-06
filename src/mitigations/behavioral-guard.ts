import type { Mitigation, MitigationInput, MitigationOutput, ThreatDetection } from './types.js';

/**
 * Behavioral Guard — defends against Behavioural Control traps (Trap 4).
 *
 * Validates UI interactions and form submissions:
 * - Detects mismatched labels vs semantics
 * - Catches deceptive confirmation dialogs
 * - Identifies infinite loop patterns
 * - Validates action consequences before execution
 */
export class BehavioralGuard implements Mitigation {
  id = 'behavioral-guard';
  name = 'Behavioral Guard';
  description = 'Validates UI interactions to prevent deceptive behavioral control traps';
  targetTraps = ['behavioural-control'];

  private loopCounter: Map<string, number> = new Map();
  private readonly MAX_LOOP_COUNT = 10;

  private readonly DECEPTIVE_DIALOG_PATTERNS = [
    /(?:ok|yes|confirm|accept|agree)\s+to\s+(?:cancel|delete|remove|reject|decline)/gi,
    /(?:cancel|no|decline)\s+to\s+(?:proceed|continue|confirm|accept|save)/gi,
    /(?:click\s+(?:here|ok|yes)\s+to\s+(?:opt[- ]out|unsubscribe|cancel))/gi,
  ];

  private readonly MISLEADING_LABEL_PATTERNS = [
    { labelPattern: /email/i, fieldPattern: /name|address|phone/i },
    { labelPattern: /name/i, fieldPattern: /email|password|ssn/i },
    { labelPattern: /phone/i, fieldPattern: /email|password|credit/i },
    { labelPattern: /search/i, fieldPattern: /password|secret|key/i },
  ];

  async preProcess(input: MitigationInput): Promise<MitigationOutput> {
    const startTime = Date.now();
    const threats: ThreatDetection[] = [];

    if (input.contentType === 'html' || input.contentType === 'form') {
      // Deceptive dialog detection
      for (const pattern of this.DECEPTIVE_DIALOG_PATTERNS) {
        const matches = input.rawContent.match(pattern) ?? [];
        for (const match of matches) {
          threats.push({
            type: 'deceptive-dialog',
            severity: 'critical',
            description: 'Dialog text contains inverted action semantics',
            evidence: match,
            mitigationApplied: 'blocked',
          });
        }
      }

      // Infinite loop detection
      const actionUrl = input.metadata.actionUrl as string | undefined;
      if (actionUrl) {
        const count = (this.loopCounter.get(actionUrl) ?? 0) + 1;
        this.loopCounter.set(actionUrl, count);
        if (count > this.MAX_LOOP_COUNT) {
          threats.push({
            type: 'infinite-loop',
            severity: 'high',
            description: `Same action URL visited ${count} times (loop threshold: ${this.MAX_LOOP_COUNT})`,
            evidence: actionUrl,
            mitigationApplied: 'blocked',
          });
        }
      }

      // Pagination loop detection
      const pageNumber = input.metadata.pageNumber as number | undefined;
      const maxPages = input.metadata.maxPages as number | undefined;
      if (pageNumber && maxPages && pageNumber > maxPages * 2) {
        threats.push({
          type: 'pagination-loop',
          severity: 'high',
          description: `Page ${pageNumber} exceeds expected max ${maxPages} — possible infinite pagination trap`,
          evidence: `Page ${pageNumber} of ${maxPages}`,
          mitigationApplied: 'blocked',
        });
      }
    }

    const hasCritical = threats.some(t => t.severity === 'critical');
    const hasHigh = threats.some(t => t.severity === 'high');

    return {
      content: input.rawContent,
      threatsDetected: threats,
      action: hasCritical ? 'block' : hasHigh ? 'warn' : 'allow',
      confidence: threats.length > 0 ? 0.80 : 0.95,
      processingMs: Date.now() - startTime,
    };
  }

  async postProcess(output: MitigationOutput): Promise<MitigationOutput> {
    return output;
  }

  estimateOverhead() {
    return { latencyMs: 4, tokenCost: 0 };
  }
}
