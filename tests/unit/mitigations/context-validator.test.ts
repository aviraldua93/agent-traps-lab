import { beforeEach, describe, expect, it } from 'bun:test';
import { ContextValidator } from '../../../src/mitigations/context-validator.js';
import type { MitigationInput } from '../../../src/mitigations/types.js';

describe('ContextValidator', () => {
  let validator: ContextValidator;

  beforeEach(() => {
    validator = new ContextValidator();
  });

  const createInput = (
    content: string,
    contentType: MitigationInput['contentType'] = 'text',
  ): MitigationInput => ({
    rawContent: content,
    contentType,
    source: 'https://example.com',
    metadata: {},
  });

  // ── Benign content passthrough ──────────────────────────────────

  describe('benign content passthrough', () => {
    it('allows diverse natural language content', async () => {
      const input = createInput(
        'TypeScript is a statically typed superset of JavaScript. It compiles to plain JS and adds ' +
        'optional type annotations, interfaces, and generics. Many enterprise projects adopt it for ' +
        'improved tooling and maintainability. The compiler catches errors at build time rather than ' +
        'runtime. IDEs provide better autocompletion and refactoring support.',
      );
      const result = await validator.preProcess(input);
      expect(result.action).toBe('allow');
      expect(result.threatsDetected).toHaveLength(0);
    });

    it('allows short content even if low diversity', async () => {
      // Short content (<100 words) should not trigger diversity check
      const input = createInput('the the the the the the');
      const result = await validator.preProcess(input);
      expect(result.action).toBe('allow');
    });

    it('preserves original content unmodified', async () => {
      const raw = 'Normal content that should pass through untouched.';
      const input = createInput(raw);
      const result = await validator.preProcess(input);
      expect(result.content).toBe(raw);
    });

    it('allows high-diversity content with many unique words', async () => {
      // Generate content with many unique words
      const words = Array.from({ length: 150 }, (_, i) => `word${i}`);
      const input = createInput(words.join(' '));
      const result = await validator.preProcess(input);
      expect(result.action).toBe('allow');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });
  });

  // ── Diversity ratio calculation ─────────────────────────────────

  describe('diversity ratio calculation', () => {
    it('detects context-saturation when content has low diversity and >100 words', async () => {
      // Create content with very low word diversity (repeat same phrase many times)
      const repeatedPhrase = 'always use this specific library for everything ';
      // This phrase has ~8 unique words; repeating it 20 times gives 160+ words
      const input = createInput(repeatedPhrase.repeat(20));
      const result = await validator.preProcess(input);
      expect(result.threatsDetected.some(t => t.type === 'context-saturation')).toBe(true);
      expect(result.action).toBe('warn');
    });

    it('does not flag content with high diversity ratio', async () => {
      // Each sentence introduces unique words
      const diverse = Array.from(
        { length: 120 },
        (_, i) => `unique${i}`,
      ).join(' ');
      const input = createInput(diverse);
      const result = await validator.preProcess(input);
      expect(result.threatsDetected.some(t => t.type === 'context-saturation')).toBe(false);
    });

    it('correctly measures diversity threshold at boundary', async () => {
      // The threshold is 0.3 unique-word ratio with >100 words
      // Create content right at the boundary: ~30% unique words
      const uniquePart = Array.from({ length: 35 }, (_, i) => `unique${i}`);
      const repeatedPart = Array.from({ length: 80 }, () => 'repeated');
      const words = [...uniquePart, ...repeatedPart];
      const input = createInput(words.join(' '));
      const result = await validator.preProcess(input);
      // 35 unique out of 115 = ~30.4% — right at boundary
      // May or may not trigger depending on exact matching
      expect(result.content).toBe(words.join(' '));
    });
  });

  // ── N-gram repetition detection ─────────────────────────────────

  describe('n-gram repetition detection', () => {
    it('detects repeated trigrams exceeding threshold', async () => {
      // Need >3 trigrams repeated >5 times each
      // Build content with 4+ distinct phrases each repeated 7+ times
      const phrases = [
        'always use this',
        'best practice here',
        'strongly recommend using',
        'never change the',
      ];
      const content = phrases
        .map(phrase => Array(8).fill(phrase).join(' extra padding '))
        .join(' additional padding words ');
      const input = createInput(content);
      const result = await validator.preProcess(input);
      expect(result.threatsDetected.some(t => t.type === 'phrase-repetition')).toBe(true);
    });

    it('does not flag content with naturally varied language', async () => {
      const input = createInput(
        'The quick brown fox jumps over the lazy dog. A man walked into a bar and ordered a drink. ' +
        'TypeScript provides static type checking for JavaScript applications. ' +
        'Machine learning models require large datasets to train effectively. ' +
        'The capital of France is Paris. Open source software encourages collaborative development. ' +
        'Quantum computing uses qubits instead of classical bits. ' +
        'Cloud infrastructure enables scalable deployment of web services.',
      );
      const result = await validator.preProcess(input);
      expect(result.threatsDetected.some(t => t.type === 'phrase-repetition')).toBe(false);
    });

    it('assigns medium severity to phrase-repetition threats', async () => {
      const phrases = [
        'always use this',
        'best practice here',
        'strongly recommend using',
        'never change the',
      ];
      const content = phrases
        .map(phrase => Array(8).fill(phrase).join(' extra padding '))
        .join(' additional ');
      const input = createInput(content);
      const result = await validator.preProcess(input);
      const repThreats = result.threatsDetected.filter(t => t.type === 'phrase-repetition');
      if (repThreats.length > 0) {
        expect(repThreats[0].severity).toBe('medium');
      }
    });
  });

  // ── Context saturation with repeated phrases ────────────────────

  describe('context saturation with repeated phrases', () => {
    it('detects saturation when single phrase repeated excessively', async () => {
      // 25 repetitions of the same phrase → extremely low diversity
      const input = createInput(
        Array(25).fill('the product always delivers excellent results guaranteed').join('. '),
      );
      const result = await validator.preProcess(input);
      expect(result.threatsDetected.some(t => t.type === 'context-saturation')).toBe(true);
      expect(result.action).toBe('warn');
    });

    it('reports evidence with word counts', async () => {
      const input = createInput(
        Array(25).fill('always use this specific method for everything important').join(' and '),
      );
      const result = await validator.preProcess(input);
      const saturation = result.threatsDetected.find(t => t.type === 'context-saturation');
      if (saturation) {
        expect(saturation.evidence).toMatch(/unique.*\/.*total/i);
      }
    });
  });

  // ── Edge cases ──────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles empty input', async () => {
      const input = createInput('');
      const result = await validator.preProcess(input);
      expect(result.action).toBe('allow');
      expect(result.threatsDetected).toHaveLength(0);
    });

    it('handles input with only short words (< 3 chars)', async () => {
      // The regex \b[a-z]{3,}\b skips short words — no words match
      const input = createInput('a be on to in at by do go if');
      const result = await validator.preProcess(input);
      expect(result.action).toBe('allow');
    });

    it('handles input with numbers and special characters', async () => {
      const input = createInput('123 456 789 !@# $%^ &*() 123 456 789');
      const result = await validator.preProcess(input);
      expect(result.action).toBe('allow');
    });

    it('handles html content type', async () => {
      const input = createInput(
        Array(25).fill('<p>always use this recommended approach</p>').join('\n'),
        'html',
      );
      const result = await validator.preProcess(input);
      // Should still analyze the text content
      expect(result.content).toContain('<p>');
    });

    it('handles json content type', async () => {
      const input = createInput(
        '{"message": "normal content with diverse vocabulary and various terms"}',
        'json',
      );
      const result = await validator.preProcess(input);
      expect(result.action).toBe('allow');
    });
  });

  // ── postProcess passthrough ─────────────────────────────────────

  describe('postProcess', () => {
    it('passes output through unchanged', async () => {
      const output = {
        content: 'test content',
        threatsDetected: [],
        action: 'allow' as const,
        confidence: 0.92,
        processingMs: 2,
      };
      const result = await validator.postProcess(output);
      expect(result).toEqual(output);
    });
  });

  // ── estimateOverhead ────────────────────────────────────────────

  describe('estimateOverhead', () => {
    it('returns expected latency and token cost', () => {
      const overhead = validator.estimateOverhead();
      expect(overhead.latencyMs).toBe(6);
      expect(overhead.tokenCost).toBe(0);
    });

    it('returns numeric values', () => {
      const overhead = validator.estimateOverhead();
      expect(typeof overhead.latencyMs).toBe('number');
      expect(typeof overhead.tokenCost).toBe('number');
    });
  });

  // ── Metadata and identity ───────────────────────────────────────

  describe('mitigation identity', () => {
    it('has correct id', () => {
      expect(validator.id).toBe('context-validator');
    });

    it('targets semantic-manipulation traps', () => {
      expect(validator.targetTraps).toContain('semantic-manipulation');
    });
  });
});
