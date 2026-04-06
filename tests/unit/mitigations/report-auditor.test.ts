import { beforeEach, describe, expect, it } from 'bun:test';
import { ReportAuditor } from '../../../src/mitigations/report-auditor.js';
import type { MitigationInput } from '../../../src/mitigations/types.js';

describe('ReportAuditor', () => {
  let auditor: ReportAuditor;

  beforeEach(() => {
    auditor = new ReportAuditor();
  });

  const createReportInput = (
    content: string,
    metadata: Record<string, unknown> = {},
  ): MitigationInput => ({
    rawContent: content,
    contentType: 'report',
    source: 'report-generator',
    metadata,
  });

  const createNonReportInput = (
    content: string,
    contentType: MitigationInput['contentType'] = 'text',
  ): MitigationInput => ({
    rawContent: content,
    contentType,
    source: 'https://example.com',
    metadata: {},
  });

  // ── Non-report content bypass ───────────────────────────────────

  describe('non-report content bypass', () => {
    it('allows non-report content immediately', async () => {
      const input = createNonReportInput('Some normal text with selected results and best performing scores');
      const result = await auditor.preProcess(input);
      expect(result.action).toBe('allow');
      expect(result.threatsDetected).toHaveLength(0);
      expect(result.confidence).toBe(1.0);
    });

    it('skips all checks for html content type', async () => {
      const input = createNonReportInput(
        '<div>Best performing results: 99% better than baseline</div>',
        'html',
      );
      const result = await auditor.preProcess(input);
      expect(result.action).toBe('allow');
    });
  });

  // ── Benign report passthrough ───────────────────────────────────

  describe('benign report passthrough', () => {
    it('allows clean report with balanced language', async () => {
      const input = createReportInput(
        'This report summarizes our quarterly performance. We observed improvements in some areas ' +
        'while other metrics remained stable. User engagement increased modestly compared to the ' +
        'previous quarter. We recommend continued investment in customer support infrastructure.',
      );
      const result = await auditor.preProcess(input);
      expect(result.action).toBe('allow');
      expect(result.threatsDetected).toHaveLength(0);
    });

    it('preserves original content unmodified', async () => {
      const raw = 'Simple quarterly performance summary.';
      const input = createReportInput(raw);
      const result = await auditor.preProcess(input);
      expect(result.content).toBe(raw);
    });
  });

  // ── Cherry-pick indicator detection ─────────────────────────────

  describe('cherry-pick indicator detection', () => {
    it('detects excessive cherry-picking language (>3 patterns)', async () => {
      const input = createReportInput(
        'Our selected results demonstrate exceptional quality. The best performing metrics ' +
        'show remarkable improvement. The top scores reveal our strength. ' +
        'Notably, the highlighted findings exceed all expectations. ' +
        'The most impressive results come from our key data points.',
      );
      const result = await auditor.preProcess(input);
      expect(result.threatsDetected.some(t => t.type === 'cherry-picking')).toBe(true);
    });

    it('assigns medium severity to cherry-picking', async () => {
      const input = createReportInput(
        'Selected results are promising. The best performing models exceed expectations. ' +
        'Top scores in our chosen examples are remarkable. ' +
        'Notably, the key findings show highest metrics.',
      );
      const result = await auditor.preProcess(input);
      const cherryPick = result.threatsDetected.filter(t => t.type === 'cherry-picking');
      for (const t of cherryPick) {
        expect(t.severity).toBe('medium');
      }
    });

    it('does not flag moderate selective language (≤3 patterns)', async () => {
      const input = createReportInput(
        'The selected results from our experiment show improvement in two areas. ' +
        'We analyzed all available data points in our study.',
      );
      const result = await auditor.preProcess(input);
      expect(result.threatsDetected.some(t => t.type === 'cherry-picking')).toBe(false);
    });
  });

  // ── Anchoring pattern detection ─────────────────────────────────

  describe('anchoring pattern detection', () => {
    it('detects excessive anchoring/comparison patterns (>2)', async () => {
      const input = createReportInput(
        'Our approach is 50% better than the baseline. Performance is 3x faster than the standard. ' +
        'Starting from a baseline, we achieved 200% improvement. ' +
        'Compared to the previous version, throughput is 10x higher than before.',
      );
      const result = await auditor.preProcess(input);
      expect(result.threatsDetected.some(t => t.type === 'anchoring-exploitation')).toBe(true);
    });

    it('assigns medium severity to anchoring', async () => {
      const input = createReportInput(
        'Results are 50% better than the original baseline. Compared to the standard, ' +
        'we see 2x improvement. Starting from a reference, gains are 30% higher than previous.',
      );
      const result = await auditor.preProcess(input);
      const anchoring = result.threatsDetected.filter(t => t.type === 'anchoring-exploitation');
      for (const t of anchoring) {
        expect(t.severity).toBe('medium');
      }
    });

    it('does not flag moderate comparison language (≤2 patterns)', async () => {
      const input = createReportInput(
        'Performance improved compared to the baseline. We see positive trends overall.',
      );
      const result = await auditor.preProcess(input);
      expect(result.threatsDetected.some(t => t.type === 'anchoring-exploitation')).toBe(false);
    });
  });

  // ── Statistical misrepresentation detection ─────────────────────

  describe('statistical misrepresentation detection', () => {
    it('detects "up to X%" claims without proper context', async () => {
      const input = createReportInput(
        'Our system achieves up to 95% accuracy improvement on benchmark tasks.',
      );
      const result = await auditor.preProcess(input);
      expect(result.threatsDetected.some(t => t.type === 'statistical-misrepresentation')).toBe(true);
    });

    it('detects "significant" without p-value', async () => {
      const input = createReportInput(
        'We observed a significantly improved outcome in our treatment group.',
      );
      const result = await auditor.preProcess(input);
      expect(result.threatsDetected.some(t => t.type === 'statistical-misrepresentation')).toBe(true);
    });

    it('detects multiplier claims without uncertainty', async () => {
      const input = createReportInput(
        'Our approach is 10x faster on real-world data than the previous method.',
      );
      const result = await auditor.preProcess(input);
      expect(result.threatsDetected.some(t => t.type === 'statistical-misrepresentation')).toBe(true);
    });

    it('assigns high severity to statistical misrepresentation', async () => {
      const input = createReportInput(
        'Results show up to 99% reduction in error rate.',
      );
      const result = await auditor.preProcess(input);
      const statThreats = result.threatsDetected.filter(t => t.type === 'statistical-misrepresentation');
      for (const t of statThreats) {
        expect(t.severity).toBe('high');
      }
    });

    it('warns when statistical misrepresentation is detected', async () => {
      const input = createReportInput(
        'Performance is up to 80% better. The improvement is significantly large.',
      );
      const result = await auditor.preProcess(input);
      if (result.threatsDetected.some(t => t.severity === 'high')) {
        expect(result.action).toBe('warn');
      }
    });
  });

  // ── Decision fatigue exploitation detection ─────────────────────

  describe('decision fatigue exploitation', () => {
    it('detects non-trivial request after many trivial approvals', async () => {
      // Send 6+ trivial approvals, then one non-trivial
      for (let i = 0; i < 7; i++) {
        await auditor.preProcess(
          createReportInput(`Trivial update ${i}: minor formatting change.`, {
            approvalWeight: 'trivial',
          }),
        );
      }
      const nonTrivialInput = createReportInput(
        'Major strategic change: redirect all resources to new initiative.',
        { approvalWeight: 'significant' },
      );
      const result = await auditor.preProcess(nonTrivialInput);
      expect(result.threatsDetected.some(t => t.type === 'decision-fatigue-exploit')).toBe(true);
    });

    it('assigns high severity to decision fatigue exploitation', async () => {
      for (let i = 0; i < 8; i++) {
        await auditor.preProcess(
          createReportInput(`Trivial ${i}`, { approvalWeight: 'trivial' }),
        );
      }
      const result = await auditor.preProcess(
        createReportInput('Critical decision needed.', { approvalWeight: 'critical' }),
      );
      const fatigue = result.threatsDetected.filter(t => t.type === 'decision-fatigue-exploit');
      if (fatigue.length > 0) {
        expect(fatigue[0].severity).toBe('high');
      }
    });

    it('does not flag when trivial ratio is below 80%', async () => {
      // Mix of trivial and non-trivial
      for (let i = 0; i < 3; i++) {
        await auditor.preProcess(
          createReportInput(`Trivial ${i}`, { approvalWeight: 'trivial' }),
        );
        await auditor.preProcess(
          createReportInput(`Significant ${i}`, { approvalWeight: 'significant' }),
        );
      }
      const result = await auditor.preProcess(
        createReportInput('Another significant.', { approvalWeight: 'critical' }),
      );
      expect(result.threatsDetected.some(t => t.type === 'decision-fatigue-exploit')).toBe(false);
    });

    it('does not flag when fewer than 6 total approvals', async () => {
      for (let i = 0; i < 4; i++) {
        await auditor.preProcess(
          createReportInput(`Trivial ${i}`, { approvalWeight: 'trivial' }),
        );
      }
      const result = await auditor.preProcess(
        createReportInput('Important.', { approvalWeight: 'critical' }),
      );
      // totalRecent = 5, which is ≤ 5 → no decision fatigue check
      expect(result.threatsDetected.some(t => t.type === 'decision-fatigue-exploit')).toBe(false);
    });

    it('does not flag trivial after trivials', async () => {
      for (let i = 0; i < 8; i++) {
        await auditor.preProcess(
          createReportInput(`Trivial ${i}`, { approvalWeight: 'trivial' }),
        );
      }
      // Another trivial → isTrivial is true, so no fatigue exploit flagged
      const result = await auditor.preProcess(
        createReportInput('Another trivial.', { approvalWeight: 'trivial' }),
      );
      expect(result.threatsDetected.some(t => t.type === 'decision-fatigue-exploit')).toBe(false);
    });
  });

  // ── Edge cases ──────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles empty report input', async () => {
      const input = createReportInput('');
      const result = await auditor.preProcess(input);
      expect(result.action).toBe('allow');
    });

    it('handles report with only numbers', async () => {
      const input = createReportInput('123 456 789 0.95 0.87 0.42 3.14');
      const result = await auditor.preProcess(input);
      expect(result.action).toBe('allow');
    });

    it('handles very long report', async () => {
      const longReport = 'This is a balanced analysis with diverse perspectives and data. '.repeat(500);
      const input = createReportInput(longReport);
      const result = await auditor.preProcess(input);
      expect(result.action).toBe('allow');
    });
  });

  // ── Combined threat scenarios ───────────────────────────────────

  describe('combined threat scenarios', () => {
    it('detects multiple manipulation patterns in one report', async () => {
      const input = createReportInput(
        'Our selected results are remarkable. The best performing metrics show our top scores. ' +
        'The highlighted findings and key examples demonstrate excellence. Most impressive data points. ' +
        'This is significantly better. Performance is up to 95% improvement. ' +
        'Compared to the baseline, we are 5x better than the standard. ' +
        'Starting from a reference, gains are 50% higher than original.',
      );
      const result = await auditor.preProcess(input);
      expect(result.threatsDetected.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ── postProcess passthrough ─────────────────────────────────────

  describe('postProcess', () => {
    it('passes output through unchanged', async () => {
      const output = {
        content: 'test',
        threatsDetected: [],
        action: 'allow' as const,
        confidence: 0.88,
        processingMs: 1,
      };
      const result = await auditor.postProcess(output);
      expect(result).toEqual(output);
    });
  });

  // ── estimateOverhead ────────────────────────────────────────────

  describe('estimateOverhead', () => {
    it('returns expected latency and token cost', () => {
      const overhead = auditor.estimateOverhead();
      expect(overhead.latencyMs).toBe(7);
      expect(overhead.tokenCost).toBe(0);
    });

    it('returns numeric values', () => {
      const overhead = auditor.estimateOverhead();
      expect(typeof overhead.latencyMs).toBe('number');
      expect(typeof overhead.tokenCost).toBe('number');
    });
  });

  // ── Metadata and identity ───────────────────────────────────────

  describe('mitigation identity', () => {
    it('has correct id', () => {
      expect(auditor.id).toBe('report-auditor');
    });

    it('targets human-in-the-loop traps', () => {
      expect(auditor.targetTraps).toContain('human-in-the-loop');
    });
  });
});
