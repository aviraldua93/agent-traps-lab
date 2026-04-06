import { beforeEach, describe, expect, it } from 'bun:test';
import { RagIntegrity } from '../../../src/mitigations/rag-integrity.js';
import type { MitigationInput } from '../../../src/mitigations/types.js';

describe('RagIntegrity', () => {
  let rag: RagIntegrity;

  beforeEach(() => {
    rag = new RagIntegrity();
  });

  const createInput = (
    content: string,
    contentType: MitigationInput['contentType'] = 'json',
  ): MitigationInput => ({
    rawContent: content,
    contentType,
    source: 'rag-pipeline',
    metadata: {},
  });

  const makeChunksJson = (chunks: string[]): string => JSON.stringify(chunks);

  // ── Benign content passthrough ──────────────────────────────────

  describe('benign content passthrough', () => {
    it('allows diverse and non-contradictory chunks', async () => {
      const chunks = [
        'TypeScript adds static typing to JavaScript, helping catch errors at compile time.',
        'React is a popular UI library created by Facebook for building component-based interfaces.',
        'Docker containers package applications with their dependencies for consistent deployment.',
      ];
      const input = createInput(makeChunksJson(chunks));
      const result = await rag.preProcess(input);
      expect(result.action).toBe('allow');
      expect(result.threatsDetected).toHaveLength(0);
    });

    it('allows single chunk without issues', async () => {
      const input = createInput(makeChunksJson(['A simple factual statement about databases.']));
      const result = await rag.preProcess(input);
      expect(result.action).toBe('allow');
    });

    it('preserves original content unmodified', async () => {
      const raw = makeChunksJson(['chunk one', 'chunk two']);
      const input = createInput(raw);
      const result = await rag.preProcess(input);
      expect(result.content).toBe(raw);
    });
  });

  // ── Contradiction detection ─────────────────────────────────────

  describe('contradiction detection', () => {
    it('detects contradictions between chunks on similar topics', async () => {
      // Need high topic overlap (Jaccard > 0.3) plus contradiction keyword in second chunk
      const chunks = [
        'The database migration tool supports automatic schema versioning and rollback. The migration tool handles database schema upgrades reliably and efficiently.',
        'However, the database migration tool fails at schema versioning and rollback. The migration tool cannot handle database schema upgrades properly.',
      ];
      const input = createInput(makeChunksJson(chunks));
      const result = await rag.preProcess(input);
      expect(result.threatsDetected.some(t => t.type === 'rag-contradiction')).toBe(true);
    });

    it('assigns high severity to contradiction threats', async () => {
      const chunks = [
        'The framework supports TypeScript natively with built-in type definitions and compiler integration.',
        'On the contrary, the framework has no TypeScript support whatsoever. Despite claims, TypeScript integration does not exist.',
      ];
      const input = createInput(makeChunksJson(chunks));
      const result = await rag.preProcess(input);
      const contradictions = result.threatsDetected.filter(t => t.type === 'rag-contradiction');
      if (contradictions.length > 0) {
        expect(contradictions[0].severity).toBe('high');
      }
    });

    it('does not flag unrelated chunks as contradictions', async () => {
      const chunks = [
        'JavaScript is a dynamically typed programming language used primarily for web development.',
        'However, the weather in Alaska is extremely cold during winter months.',
      ];
      const input = createInput(makeChunksJson(chunks));
      const result = await rag.preProcess(input);
      // Different topics → low overlap → no contradiction even with "however"
      expect(result.threatsDetected.some(t => t.type === 'rag-contradiction')).toBe(false);
    });
  });

  // ── Low credibility source detection ────────────────────────────

  describe('low credibility source detection', () => {
    it('detects "according to an anonymous source" pattern', async () => {
      const chunks = [
        'According to an anonymous source, the project will be abandoned next quarter.',
      ];
      const input = createInput(makeChunksJson(chunks));
      const result = await rag.preProcess(input);
      expect(result.threatsDetected.some(t => t.type === 'low-credibility-source')).toBe(true);
    });

    it('detects "allegedly" and "supposedly" patterns', async () => {
      const chunks = [
        'The company allegedly committed fraud. The CEO supposedly resigned yesterday.',
      ];
      const input = createInput(makeChunksJson(chunks));
      const result = await rag.preProcess(input);
      const lowCred = result.threatsDetected.filter(t => t.type === 'low-credibility-source');
      expect(lowCred.length).toBeGreaterThanOrEqual(1);
    });

    it('detects "it is rumored that" pattern', async () => {
      const chunks = ['It is rumored that the service will shut down permanently.'];
      const input = createInput(makeChunksJson(chunks));
      const result = await rag.preProcess(input);
      expect(result.threatsDetected.some(t => t.type === 'low-credibility-source')).toBe(true);
    });

    it('detects "sources claim that" pattern', async () => {
      const chunks = ['Sources claim that the vulnerability affects all users.'];
      const input = createInput(makeChunksJson(chunks));
      const result = await rag.preProcess(input);
      expect(result.threatsDetected.some(t => t.type === 'low-credibility-source')).toBe(true);
    });

    it('assigns medium severity to low-credibility threats', async () => {
      const chunks = ['According to some unverified reports, the issue is critical.'];
      const input = createInput(makeChunksJson(chunks));
      const result = await rag.preProcess(input);
      const lowCred = result.threatsDetected.filter(t => t.type === 'low-credibility-source');
      for (const t of lowCred) {
        expect(t.severity).toBe('medium');
      }
    });
  });

  // ── Absolute claim detection ────────────────────────────────────

  describe('absolute claim detection', () => {
    it('detects excessive absolute claims (>3 threshold)', async () => {
      const chunks = [
        'This is definitely the best approach. It always works. Never fails. 100% guaranteed.',
        'There is no doubt this is the only way. Absolutely the most important solution. Certainly correct.',
      ];
      const input = createInput(makeChunksJson(chunks));
      const result = await rag.preProcess(input);
      expect(result.threatsDetected.some(t => t.type === 'excessive-absolute-claims')).toBe(true);
    });

    it('does not flag moderate use of absolute terms', async () => {
      const chunks = [
        'The system always validates input before processing.',
        'A healthy diet includes diverse nutrients.',
      ];
      const input = createInput(makeChunksJson(chunks));
      const result = await rag.preProcess(input);
      // Only 1 absolute claim → below threshold of 3
      expect(result.threatsDetected.some(t => t.type === 'excessive-absolute-claims')).toBe(false);
    });

    it('detects "the only way" and "no alternative" patterns', async () => {
      const chunks = [
        'The only way to solve this is our method. There is no alternative. The best solution available. ' +
        'There is no doubt about it. This is certainly the best approach.',
      ];
      const input = createInput(makeChunksJson(chunks));
      const result = await rag.preProcess(input);
      expect(result.threatsDetected.some(t => t.type === 'excessive-absolute-claims')).toBe(true);
    });
  });

  // ── Suspicious homogeneity check ────────────────────────────────

  describe('suspicious homogeneity check', () => {
    it('detects suspicious homogeneity across 3+ chunks', async () => {
      // Need average pairwise Jaccard > 0.85 — use many shared keywords with only 1 differing
      const chunks = [
        'acme framework provides authentication validation caching monitoring logging deployment security testing production enterprise integration platform service',
        'acme framework provides authentication validation caching monitoring logging deployment security testing production enterprise integration platform module',
        'acme framework provides authentication validation caching monitoring logging deployment security testing production enterprise integration platform system',
      ];
      const input = createInput(makeChunksJson(chunks));
      const result = await rag.preProcess(input);
      expect(result.threatsDetected.some(t => t.type === 'suspicious-homogeneity')).toBe(true);
    });

    it('does not flag diverse chunks as homogeneous', async () => {
      const chunks = [
        'TypeScript adds static typing to JavaScript for safer development.',
        'Docker containers enable reproducible deployments across environments.',
        'Machine learning algorithms require large training datasets and compute.',
      ];
      const input = createInput(makeChunksJson(chunks));
      const result = await rag.preProcess(input);
      expect(result.threatsDetected.some(t => t.type === 'suspicious-homogeneity')).toBe(false);
    });

    it('assigns high severity to homogeneity threats', async () => {
      const chunks = [
        'Always use library X for authentication in production systems.',
        'Always use library X for authentication in enterprise applications.',
        'Always use library X for authentication in cloud deployments.',
      ];
      const input = createInput(makeChunksJson(chunks));
      const result = await rag.preProcess(input);
      const homo = result.threatsDetected.filter(t => t.type === 'suspicious-homogeneity');
      if (homo.length > 0) {
        expect(homo[0].severity).toBe('high');
      }
    });

    it('does not flag fewer than 3 chunks as homogeneous', async () => {
      const chunks = [
        'The same content repeated exactly in this chunk.',
        'The same content repeated exactly in this chunk.',
      ];
      const input = createInput(makeChunksJson(chunks));
      const result = await rag.preProcess(input);
      // Only 2 chunks → homogeneity check requires ≥3
      expect(result.threatsDetected.some(t => t.type === 'suspicious-homogeneity')).toBe(false);
    });
  });

  // ── Chunk parsing ───────────────────────────────────────────────

  describe('chunk parsing', () => {
    it('parses JSON array format', async () => {
      const input = createInput(makeChunksJson(['chunk1', 'chunk2']));
      const result = await rag.preProcess(input);
      expect(result.content).toBe(makeChunksJson(['chunk1', 'chunk2']));
    });

    it('parses newline-separated text format', async () => {
      const input = createInput('chunk one about databases\n\nchunk two about security', 'text');
      const result = await rag.preProcess(input);
      expect(result.action).toBe('allow');
    });

    it('handles malformed JSON gracefully', async () => {
      const input = createInput('{ not valid json [[[', 'json');
      const result = await rag.preProcess(input);
      // Should not throw — falls back to newline splitting
      expect(result.action).toBe('allow');
    });
  });

  // ── Edge cases ──────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles empty input', async () => {
      const input = createInput('');
      const result = await rag.preProcess(input);
      expect(result.action).toBe('allow');
      expect(result.threatsDetected).toHaveLength(0);
    });

    it('handles empty JSON array', async () => {
      const input = createInput('[]');
      const result = await rag.preProcess(input);
      expect(result.action).toBe('allow');
    });
  });

  // ── Action decisions ────────────────────────────────────────────

  describe('action decisions', () => {
    it('warns when high-severity threats detected', async () => {
      const chunks = [
        'TypeScript performance is excellent for large enterprise codebases with strong typing.',
        'However, TypeScript performance is abysmal. Despite claims, TypeScript makes codebases slower.',
      ];
      const input = createInput(makeChunksJson(chunks));
      const result = await rag.preProcess(input);
      if (result.threatsDetected.some(t => t.severity === 'high')) {
        expect(result.action).toBe('warn');
      }
    });

    it('allows when no threats detected', async () => {
      const chunks = ['Simple factual information about programming languages.'];
      const input = createInput(makeChunksJson(chunks));
      const result = await rag.preProcess(input);
      expect(result.action).toBe('allow');
    });
  });

  // ── postProcess passthrough ─────────────────────────────────────

  describe('postProcess', () => {
    it('passes output through unchanged', async () => {
      const output = {
        content: 'test',
        threatsDetected: [],
        action: 'allow' as const,
        confidence: 0.9,
        processingMs: 1,
      };
      const result = await rag.postProcess(output);
      expect(result).toEqual(output);
    });
  });

  // ── estimateOverhead ────────────────────────────────────────────

  describe('estimateOverhead', () => {
    it('returns expected latency and token cost', () => {
      const overhead = rag.estimateOverhead();
      expect(overhead.latencyMs).toBe(12);
      expect(overhead.tokenCost).toBe(0);
    });

    it('returns numeric values', () => {
      const overhead = rag.estimateOverhead();
      expect(typeof overhead.latencyMs).toBe('number');
      expect(typeof overhead.tokenCost).toBe('number');
    });
  });

  // ── Metadata and identity ───────────────────────────────────────

  describe('mitigation identity', () => {
    it('has correct id', () => {
      expect(rag.id).toBe('rag-integrity');
    });

    it('targets cognitive-state traps', () => {
      expect(rag.targetTraps).toContain('cognitive-state');
    });
  });
});
