/**
 * Mitigation — a defense module that can be applied to an agent.
 * Each mitigation maps to one or more trap categories.
 */
export interface Mitigation {
  id: string;
  name: string;
  description: string;

  /** Which trap categories this mitigation defends against */
  targetTraps: string[];

  /**
   * Pre-process: runs BEFORE the agent sees any content.
   * Can sanitize, flag, or transform input.
   */
  preProcess(input: MitigationInput): Promise<MitigationOutput>;

  /**
   * Post-process: runs AFTER the agent produces output.
   * Can validate, block, or modify actions.
   */
  postProcess(output: MitigationOutput): Promise<MitigationOutput>;

  /**
   * Runtime cost estimation for ablation analysis.
   */
  estimateOverhead(): { latencyMs: number; tokenCost: number };
}

export interface MitigationInput {
  /** The raw content the agent is about to process */
  rawContent: string;
  /** Content type */
  contentType: 'html' | 'text' | 'json' | 'a2a-message' | 'form' | 'report';
  /** Source URL/origin */
  source: string;
  /** Metadata about the content */
  metadata: Record<string, unknown>;
}

export interface MitigationOutput {
  /** Sanitized/validated content */
  content: string;
  /** Were any threats detected? */
  threatsDetected: ThreatDetection[];
  /** Should the agent proceed? */
  action: 'allow' | 'warn' | 'block';
  /** Confidence in the assessment */
  confidence: number;
  /** Processing time */
  processingMs: number;
}

export interface ThreatDetection {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: string;
  mitigationApplied: string;
}

export interface MitigationRegistry {
  register(mitigation: Mitigation): void;
  get(id: string): Mitigation;
  getAll(): Mitigation[];
  getForTrap(trapCategory: string): Mitigation[];
  getAllExcept(excludeId: string): Mitigation[];
}
