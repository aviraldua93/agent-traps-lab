import { describe, expect, it } from 'bun:test';
import {
  computeSummary,
  cohensD,
  effectSizeLabel,
  wilcoxonSignedRank,
  bonferroniSignificant,
} from '../../src/harness/metrics.js';

describe('Statistical Metrics', () => {
  describe('computeSummary', () => {
    it('computes mean correctly', () => {
      const s = computeSummary([1, 2, 3, 4, 5]);
      expect(s.mean).toBe(3);
    });

    it('computes std correctly', () => {
      const s = computeSummary([2, 4, 4, 4, 5, 5, 7, 9]);
      expect(s.std).toBeCloseTo(2.0, 0);
    });

    it('computes median correctly for odd length', () => {
      const s = computeSummary([1, 3, 5, 7, 9]);
      expect(s.median).toBe(5);
    });

    it('computes median correctly for even length', () => {
      const s = computeSummary([1, 3, 5, 7]);
      expect(s.median).toBe(4);
    });

    it('computes min and max', () => {
      const s = computeSummary([5, 1, 9, 3, 7]);
      expect(s.min).toBe(1);
      expect(s.max).toBe(9);
    });

    it('computes 95% CI', () => {
      const values = [10, 12, 11, 13, 10, 11, 12, 14, 11, 12];
      const s = computeSummary(values);
      expect(s.ci95Lower).toBeLessThan(s.mean);
      expect(s.ci95Upper).toBeGreaterThan(s.mean);
    });

    it('handles empty array', () => {
      const s = computeSummary([]);
      expect(s.mean).toBe(0);
      expect(s.std).toBe(0);
    });

    it('handles single value', () => {
      const s = computeSummary([42]);
      expect(s.mean).toBe(42);
      expect(s.median).toBe(42);
    });
  });

  describe('cohensD', () => {
    it('returns 0 for identical groups', () => {
      const d = cohensD([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);
      expect(d).toBeCloseTo(0, 1);
    });

    it('returns large d for very different groups', () => {
      const d = cohensD([1, 1, 1, 1, 1], [10, 10, 10, 10, 10]);
      expect(Math.abs(d)).toBeGreaterThan(2);
    });

    it('returns medium d for moderately different groups', () => {
      const d = cohensD([1, 2, 3, 4, 5], [3, 4, 5, 6, 7]);
      expect(Math.abs(d)).toBeGreaterThan(0.5);
      expect(Math.abs(d)).toBeLessThan(2);
    });
  });

  describe('effectSizeLabel', () => {
    it('labels negligible effects', () => {
      expect(effectSizeLabel(0.1)).toBe('negligible');
    });

    it('labels small effects', () => {
      expect(effectSizeLabel(0.3)).toBe('small');
    });

    it('labels medium effects', () => {
      expect(effectSizeLabel(0.6)).toBe('medium');
    });

    it('labels large effects', () => {
      expect(effectSizeLabel(1.0)).toBe('large');
    });
  });

  describe('wilcoxonSignedRank', () => {
    it('returns p ≈ 1 for identical groups', () => {
      const p = wilcoxonSignedRank([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      expect(p).toBe(1.0);
    });

    it('returns small p for very different groups', () => {
      const p = wilcoxonSignedRank(
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
      );
      expect(p).toBeLessThan(0.05);
    });

    it('requires equal-length arrays', () => {
      expect(() => wilcoxonSignedRank([1, 2, 3], [1, 2])).toThrow();
    });
  });

  describe('bonferroniSignificant', () => {
    it('rejects when p < corrected alpha', () => {
      expect(bonferroniSignificant(0.001, 0.05, 22)).toBe(true);
    });

    it('does not reject when p > corrected alpha', () => {
      expect(bonferroniSignificant(0.01, 0.05, 22)).toBe(false); // 0.05/22 = 0.00227
    });

    it('uses correct Bonferroni correction', () => {
      const alpha = 0.05;
      const comparisons = 22;
      const corrected = alpha / comparisons;
      expect(bonferroniSignificant(corrected - 0.0001, alpha, comparisons)).toBe(true);
      expect(bonferroniSignificant(corrected + 0.0001, alpha, comparisons)).toBe(false);
    });
  });
});
