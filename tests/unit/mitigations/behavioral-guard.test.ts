import { beforeEach, describe, expect, it } from 'bun:test';
import { BehavioralGuard } from '../../../src/mitigations/behavioral-guard.js';
import type { MitigationInput } from '../../../src/mitigations/types.js';

describe('BehavioralGuard', () => {
  let guard: BehavioralGuard;

  beforeEach(() => {
    guard = new BehavioralGuard();
  });

  const createInput = (
    content: string,
    contentType: MitigationInput['contentType'] = 'html',
    metadata: Record<string, unknown> = {},
  ): MitigationInput => ({
    rawContent: content,
    contentType,
    source: 'https://example.com',
    metadata,
  });

  // ── Benign content passthrough ──────────────────────────────────

  describe('benign content passthrough', () => {
    it('allows normal HTML form content', async () => {
      const input = createInput(
        '<form action="/submit"><input type="text" name="username"><button type="submit">Submit</button></form>',
      );
      const result = await guard.preProcess(input);
      expect(result.action).toBe('allow');
      expect(result.threatsDetected).toHaveLength(0);
    });

    it('allows regular button labels', async () => {
      const input = createInput(
        '<button>Save</button><button>Cancel</button><button>Delete</button>',
      );
      const result = await guard.preProcess(input);
      expect(result.action).toBe('allow');
    });

    it('preserves original content unmodified', async () => {
      const raw = '<form><input type="text" name="query"><button>Search</button></form>';
      const input = createInput(raw);
      const result = await guard.preProcess(input);
      expect(result.content).toBe(raw);
    });

    it('allows non-html/form content types without analysis', async () => {
      // Text content type should not trigger any form-related checks
      const input = createInput('Click ok to cancel your subscription', 'text');
      const result = await guard.preProcess(input);
      expect(result.action).toBe('allow');
    });
  });

  // ── Deceptive dialog detection ──────────────────────────────────

  describe('deceptive dialog detection', () => {
    it('detects "ok to cancel" inverted semantics', async () => {
      const input = createInput(
        '<dialog><p>Are you sure?</p><button>Ok to cancel your account</button></dialog>',
      );
      const result = await guard.preProcess(input);
      expect(result.threatsDetected.some(t => t.type === 'deceptive-dialog')).toBe(true);
      expect(result.action).toBe('block');
    });

    it('detects "yes to cancel" inverted semantics', async () => {
      const input = createInput(
        '<div>Confirm to cancel all your data permanently</div>',
        'form',
      );
      const result = await guard.preProcess(input);
      expect(result.threatsDetected.some(t => t.type === 'deceptive-dialog')).toBe(true);
    });

    it('detects "cancel to proceed" inverted semantics', async () => {
      const input = createInput(
        '<button>Cancel to proceed with the update</button>',
        'form',
      );
      const result = await guard.preProcess(input);
      expect(result.threatsDetected.some(t => t.type === 'deceptive-dialog')).toBe(true);
    });

    it('detects "click here to opt-out" pattern', async () => {
      const input = createInput(
        '<a href="/trap">Click here to opt-out of data sharing</a>',
      );
      const result = await guard.preProcess(input);
      expect(result.threatsDetected.some(t => t.type === 'deceptive-dialog')).toBe(true);
    });

    it('assigns critical severity to deceptive dialogs', async () => {
      const input = createInput(
        '<button>Accept to delete your account</button>',
        'form',
      );
      const result = await guard.preProcess(input);
      const deceptive = result.threatsDetected.filter(t => t.type === 'deceptive-dialog');
      for (const t of deceptive) {
        expect(t.severity).toBe('critical');
      }
    });

    it('blocks on deceptive dialog detection', async () => {
      const input = createInput(
        '<div>Agree to reject the new terms of service</div>',
        'form',
      );
      const result = await guard.preProcess(input);
      if (result.threatsDetected.some(t => t.type === 'deceptive-dialog')) {
        expect(result.action).toBe('block');
      }
    });
  });

  // ── Infinite loop detection ─────────────────────────────────────

  describe('infinite loop detection', () => {
    it('detects when same action URL visited more than MAX_LOOP_COUNT times', async () => {
      const actionUrl = 'https://example.com/submit-form';
      let result;
      // Visit the same URL 11 times (threshold is 10)
      for (let i = 0; i < 11; i++) {
        const input = createInput('<form>Loop form</form>', 'html', { actionUrl });
        result = await guard.preProcess(input);
      }
      expect(result!.threatsDetected.some(t => t.type === 'infinite-loop')).toBe(true);
    });

    it('assigns high severity to infinite loop threats', async () => {
      const actionUrl = 'https://example.com/loop-action';
      let result;
      for (let i = 0; i < 11; i++) {
        const input = createInput('<form>Form</form>', 'html', { actionUrl });
        result = await guard.preProcess(input);
      }
      const loopThreats = result!.threatsDetected.filter(t => t.type === 'infinite-loop');
      expect(loopThreats.length).toBeGreaterThan(0);
      expect(loopThreats[0].severity).toBe('high');
    });

    it('does not flag normal repeated visits below threshold', async () => {
      const actionUrl = 'https://example.com/normal-form';
      let result;
      for (let i = 0; i < 5; i++) {
        const input = createInput('<form>Normal</form>', 'html', { actionUrl });
        result = await guard.preProcess(input);
      }
      expect(result!.threatsDetected.some(t => t.type === 'infinite-loop')).toBe(false);
    });

    it('tracks different URLs independently', async () => {
      const url1 = 'https://example.com/form-a';
      const url2 = 'https://example.com/form-b';
      // Visit url1 9 times and url2 9 times — neither exceeds threshold
      for (let i = 0; i < 9; i++) {
        await guard.preProcess(createInput('<form>A</form>', 'html', { actionUrl: url1 }));
        await guard.preProcess(createInput('<form>B</form>', 'html', { actionUrl: url2 }));
      }
      const resultA = await guard.preProcess(createInput('<form>A</form>', 'html', { actionUrl: url1 }));
      expect(resultA.threatsDetected.some(t => t.type === 'infinite-loop')).toBe(false);
    });
  });

  // ── Pagination loop detection ───────────────────────────────────

  describe('pagination loop detection', () => {
    it('detects page number exceeding 2x max pages', async () => {
      const input = createInput(
        '<div>Page content</div>',
        'html',
        { pageNumber: 21, maxPages: 10 },
      );
      const result = await guard.preProcess(input);
      expect(result.threatsDetected.some(t => t.type === 'pagination-loop')).toBe(true);
    });

    it('assigns high severity to pagination loop', async () => {
      const input = createInput(
        '<div>Content</div>',
        'html',
        { pageNumber: 100, maxPages: 5 },
      );
      const result = await guard.preProcess(input);
      const pagThreats = result.threatsDetected.filter(t => t.type === 'pagination-loop');
      expect(pagThreats.length).toBeGreaterThan(0);
      expect(pagThreats[0].severity).toBe('high');
    });

    it('allows normal pagination within bounds', async () => {
      const input = createInput(
        '<div>Page 3</div>',
        'html',
        { pageNumber: 3, maxPages: 10 },
      );
      const result = await guard.preProcess(input);
      expect(result.threatsDetected.some(t => t.type === 'pagination-loop')).toBe(false);
    });

    it('allows pagination at exactly 2x max (boundary)', async () => {
      const input = createInput(
        '<div>Boundary page</div>',
        'html',
        { pageNumber: 20, maxPages: 10 },
      );
      const result = await guard.preProcess(input);
      // pageNumber > maxPages * 2 → 20 > 20 is false
      expect(result.threatsDetected.some(t => t.type === 'pagination-loop')).toBe(false);
    });

    it('does not check pagination when metadata is absent', async () => {
      const input = createInput('<div>No pagination metadata</div>', 'html');
      const result = await guard.preProcess(input);
      expect(result.threatsDetected.some(t => t.type === 'pagination-loop')).toBe(false);
    });
  });

  // ── Edge cases ──────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles empty input', async () => {
      const input = createInput('');
      const result = await guard.preProcess(input);
      expect(result.action).toBe('allow');
    });

    it('handles form content type', async () => {
      const input = createInput(
        '<form><input type="text" name="q"><button>Search</button></form>',
        'form',
      );
      const result = await guard.preProcess(input);
      expect(result.action).toBe('allow');
    });

    it('skips checks for non-html/form content types', async () => {
      const input = createInput('Click ok to cancel subscription', 'json');
      const result = await guard.preProcess(input);
      // json type is not checked for behavioral traps
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
        confidence: 0.95,
        processingMs: 1,
      };
      const result = await guard.postProcess(output);
      expect(result).toEqual(output);
    });
  });

  // ── estimateOverhead ────────────────────────────────────────────

  describe('estimateOverhead', () => {
    it('returns expected latency and token cost', () => {
      const overhead = guard.estimateOverhead();
      expect(overhead.latencyMs).toBe(4);
      expect(overhead.tokenCost).toBe(0);
    });

    it('returns numeric values', () => {
      const overhead = guard.estimateOverhead();
      expect(typeof overhead.latencyMs).toBe('number');
      expect(typeof overhead.tokenCost).toBe('number');
    });
  });

  // ── Metadata and identity ───────────────────────────────────────

  describe('mitigation identity', () => {
    it('has correct id', () => {
      expect(guard.id).toBe('behavioral-guard');
    });

    it('targets behavioural-control traps', () => {
      expect(guard.targetTraps).toContain('behavioural-control');
    });
  });
});
