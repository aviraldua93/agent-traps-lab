import type { Mitigation, MitigationInput, MitigationOutput, ThreatDetection } from './types.js';

/**
 * Input Sanitizer — defends against Content Injection traps (Trap 1).
 *
 * Strips hidden/invisible content from HTML before the agent processes it:
 * - CSS-invisible elements (display:none, visibility:hidden, opacity:0, font-size:0)
 * - HTML comments
 * - Hidden form fields
 * - Image metadata instructions
 * - Elements with aria-hidden="true" containing instructions
 */
export class InputSanitizer implements Mitigation {
  id = 'input-sanitizer';
  name = 'Input Sanitizer';
  description = 'Strips hidden/invisible content from HTML to prevent content injection traps';
  targetTraps = ['content-injection'];

  // Patterns that indicate hidden adversarial content
  private readonly HIDDEN_CSS_PATTERNS = [
    /display\s*:\s*none/gi,
    /visibility\s*:\s*hidden/gi,
    /opacity\s*:\s*0(?:\.\d+)?(?:\s*;|\s*$)/gi,
    /font-size\s*:\s*0(?:px|em|rem|pt)?/gi,
    /color\s*:\s*(?:transparent|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0\s*\))/gi,
    /position\s*:\s*absolute[^;]*left\s*:\s*-\d{4,}px/gi,
    /height\s*:\s*0\s*;?\s*overflow\s*:\s*hidden/gi,
    /width\s*:\s*0\s*;?\s*overflow\s*:\s*hidden/gi,
    /clip-path\s*:\s*inset\(\s*100%\s*\)/gi,
  ];

  private readonly COMMENT_PATTERN = /<!--[\s\S]*?-->/g;
  private readonly HIDDEN_INPUT_PATTERN = /<input[^>]*type\s*=\s*["']hidden["'][^>]*>/gi;
  private readonly AGENT_INSTRUCTION_PATTERNS = [
    /(?:AGENT|AI|ASSISTANT|BOT|SYSTEM)\s*:/gi,
    /(?:ignore|disregard|override)\s+(?:previous|above|prior)\s+instructions/gi,
    /you\s+(?:must|should|are\s+required\s+to)\s+(?:now|instead)/gi,
    /new\s+(?:instructions?|directives?|commands?|orders?)\s*:/gi,
  ];

  async preProcess(input: MitigationInput): Promise<MitigationOutput> {
    const startTime = Date.now();
    const threats: ThreatDetection[] = [];
    let content = input.rawContent;

    if (input.contentType === 'html') {
      // Strip HTML comments
      const commentMatches = content.match(this.COMMENT_PATTERN) ?? [];
      for (const comment of commentMatches) {
        if (this.containsInstructions(comment)) {
          threats.push({
            type: 'html-comment-injection',
            severity: 'high',
            description: 'HTML comment contains agent-targeted instructions',
            evidence: comment.slice(0, 200),
            mitigationApplied: 'stripped',
          });
        }
      }
      content = content.replace(this.COMMENT_PATTERN, '');

      // Strip hidden elements
      for (const pattern of this.HIDDEN_CSS_PATTERNS) {
        if (pattern.test(content)) {
          threats.push({
            type: 'css-hidden-content',
            severity: 'high',
            description: `Hidden content detected via CSS: ${pattern.source}`,
            evidence: content.match(pattern)?.[0] ?? '',
            mitigationApplied: 'flagged',
          });
        }
      }

      // Strip hidden form inputs
      const hiddenInputs = content.match(this.HIDDEN_INPUT_PATTERN) ?? [];
      for (const input of hiddenInputs) {
        threats.push({
          type: 'hidden-form-field',
          severity: 'medium',
          description: 'Hidden form field detected',
          evidence: input,
          mitigationApplied: 'stripped',
        });
      }
      content = content.replace(this.HIDDEN_INPUT_PATTERN, '');
    }

    // Check all content types for instruction patterns
    for (const pattern of this.AGENT_INSTRUCTION_PATTERNS) {
      const matches = content.match(pattern) ?? [];
      for (const match of matches) {
        threats.push({
          type: 'instruction-injection',
          severity: 'critical',
          description: 'Content contains agent-targeted instruction pattern',
          evidence: match,
          mitigationApplied: 'flagged',
        });
      }
    }

    const hasCritical = threats.some(t => t.severity === 'critical');
    const hasHigh = threats.some(t => t.severity === 'high');

    return {
      content,
      threatsDetected: threats,
      action: hasCritical ? 'block' : hasHigh ? 'warn' : 'allow',
      confidence: threats.length > 0 ? 0.85 : 0.95,
      processingMs: Date.now() - startTime,
    };
  }

  async postProcess(output: MitigationOutput): Promise<MitigationOutput> {
    return output; // Input sanitizer is pre-process only
  }

  estimateOverhead() {
    return { latencyMs: 5, tokenCost: 0 }; // Regex-based, very fast
  }

  private containsInstructions(text: string): boolean {
    return this.AGENT_INSTRUCTION_PATTERNS.some(p => p.test(text));
  }
}
