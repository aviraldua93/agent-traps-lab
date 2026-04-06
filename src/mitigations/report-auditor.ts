import type { Mitigation, MitigationInput, MitigationOutput, ThreatDetection } from './types.js';

/**
 * Report Auditor — defends against Human-in-the-Loop traps (Trap 6).
 *
 * Analyzes generated reports for manipulation patterns:
 * - Cherry-picking detection (selective data presentation)
 * - Anchoring bias exploitation
 * - Decision fatigue patterns
 * - Statistical misrepresentation
 */
export class ReportAuditor implements Mitigation {
  id = 'report-auditor';
  name = 'Report Auditor';
  description = 'Detects manipulation patterns in generated reports targeting human reviewers';
  targetTraps = ['human-in-the-loop'];

  private readonly CHERRY_PICK_INDICATORS = [
    /(?:selected|chosen|highlighted|key)\s+(?:results?|findings?|examples?|data\s+points?)/gi,
    /(?:best|top|highest|most\s+impressive)\s+(?:performing|results?|scores?|metrics?)/gi,
    /(?:notably|significantly|remarkably),?\s+(?:the|our|these)/gi,
  ];

  private readonly ANCHORING_PATTERNS = [
    /(?:compared\s+to\s+(?:the\s+)?(?:baseline|previous|original|standard))/gi,
    /(?:(?:\d+)%?\s+(?:better|worse|faster|slower|higher|lower)\s+than)/gi,
    /(?:starting\s+(?:from|at|with)\s+(?:a\s+)?(?:baseline|reference))/gi,
  ];

  private readonly STATISTICAL_MISREP_PATTERNS = [
    /(?:up\s+to\s+\d+%|as\s+(?:much|high)\s+as\s+\d+)/gi, // "up to" without average
    /(?:significant(?:ly)?)\s+(?!.*p\s*[<>=])/gi, // "significant" without p-value
    /(?:\d+x\s+(?:faster|better|more))\s+(?!.*(?:±|std|ci|confidence))/gi, // Claims without uncertainty
  ];

  private approvalHistory: Array<{ timestamp: number; isTrivial: boolean }> = [];

  async preProcess(input: MitigationInput): Promise<MitigationOutput> {
    const startTime = Date.now();
    const threats: ThreatDetection[] = [];

    if (input.contentType !== 'report') {
      return {
        content: input.rawContent,
        threatsDetected: [],
        action: 'allow',
        confidence: 1.0,
        processingMs: Date.now() - startTime,
      };
    }

    // Cherry-picking detection
    let cherryPickCount = 0;
    for (const pattern of this.CHERRY_PICK_INDICATORS) {
      cherryPickCount += (input.rawContent.match(pattern) ?? []).length;
    }
    if (cherryPickCount > 3) {
      threats.push({
        type: 'cherry-picking',
        severity: 'medium',
        description: `Report contains ${cherryPickCount} selective-presentation indicators`,
        evidence: `${cherryPickCount} cherry-pick patterns detected`,
        mitigationApplied: 'flagged',
      });
    }

    // Anchoring detection
    let anchoringCount = 0;
    for (const pattern of this.ANCHORING_PATTERNS) {
      anchoringCount += (input.rawContent.match(pattern) ?? []).length;
    }
    if (anchoringCount > 2) {
      threats.push({
        type: 'anchoring-exploitation',
        severity: 'medium',
        description: `Report contains ${anchoringCount} anchoring/comparison patterns without balanced context`,
        evidence: `${anchoringCount} anchoring patterns`,
        mitigationApplied: 'flagged',
      });
    }

    // Statistical misrepresentation
    for (const pattern of this.STATISTICAL_MISREP_PATTERNS) {
      const matches = input.rawContent.match(pattern) ?? [];
      for (const match of matches) {
        threats.push({
          type: 'statistical-misrepresentation',
          severity: 'high',
          description: 'Statistical claim without proper uncertainty quantification',
          evidence: match,
          mitigationApplied: 'flagged',
        });
      }
    }

    // Decision fatigue detection
    const isTrivial = (input.metadata.approvalWeight as string) === 'trivial';
    this.approvalHistory.push({ timestamp: Date.now(), isTrivial });
    // Keep last 10 minutes
    this.approvalHistory = this.approvalHistory.filter(a => Date.now() - a.timestamp < 600_000);

    const recentTrivials = this.approvalHistory.filter(a => a.isTrivial).length;
    const totalRecent = this.approvalHistory.length;
    if (totalRecent > 5 && recentTrivials / totalRecent > 0.8 && !isTrivial) {
      threats.push({
        type: 'decision-fatigue-exploit',
        severity: 'high',
        description: `Non-trivial approval request after ${recentTrivials} trivial approvals — possible decision fatigue exploitation`,
        evidence: `${recentTrivials}/${totalRecent} recent approvals were trivial`,
        mitigationApplied: 'flagged',
      });
    }

    const hasHigh = threats.some(t => t.severity === 'high');

    return {
      content: input.rawContent,
      threatsDetected: threats,
      action: hasHigh ? 'warn' : 'allow',
      confidence: threats.length > 0 ? 0.72 : 0.88,
      processingMs: Date.now() - startTime,
    };
  }

  async postProcess(output: MitigationOutput): Promise<MitigationOutput> {
    return output;
  }

  estimateOverhead() {
    return { latencyMs: 7, tokenCost: 0 };
  }
}
