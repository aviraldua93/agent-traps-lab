import { describe, expect, it, beforeEach } from 'bun:test';
import { RagA2AClient } from '../../../src/integrations/rag-a2a.js';

describe('RagA2AClient', () => {
  let client: RagA2AClient;

  beforeEach(() => {
    client = new RagA2AClient('http://localhost:9999');
  });

  // ──────────────────────────────────────────────────────────
  // URL construction
  // ──────────────────────────────────────────────────────────

  describe('constructor / URL construction', () => {
    it('uses the provided baseUrl', () => {
      const c = new RagA2AClient('http://custom:8080');
      expect(c.baseUrl).toBe('http://custom:8080');
    });

    it('strips trailing slashes from baseUrl', () => {
      const c = new RagA2AClient('http://localhost:3737///');
      expect(c.baseUrl).toBe('http://localhost:3737');
    });

    it('defaults to RAG_CONFIG.ragA2aUrl when no arg supplied', () => {
      const c = new RagA2AClient();
      // RAG_CONFIG defaults to http://localhost:3737
      expect(c.baseUrl).toBe('http://localhost:3737');
    });
  });

  // ──────────────────────────────────────────────────────────
  // Error handling — server unreachable
  // ──────────────────────────────────────────────────────────

  describe('graceful error handling (server unreachable)', () => {
    it('health() returns false when server is down', async () => {
      const result = await client.health();
      expect(result).toBe(false);
    });

    it('search() returns empty array when server is down', async () => {
      const results = await client.search('test query');
      expect(results).toEqual([]);
    });

    it('ask() returns empty string when server is down', async () => {
      const answer = await client.ask('what is 2+2?');
      expect(answer).toBe('');
    });

    it('getStats() returns { documentCount: 0 } when server is down', async () => {
      const stats = await client.getStats();
      expect(stats).toEqual({ documentCount: 0 });
    });

    it('sendA2AMessage() returns null when server is down', async () => {
      const result = await client.sendA2AMessage('hello');
      expect(result).toBeNull();
    });

    it('measureAccuracy() returns zeros for empty queries', async () => {
      const result = await client.measureAccuracy([]);
      expect(result).toEqual({ mrr: 0, accuracy: 0 });
    });

    it('measureAccuracy() returns zeros when server is down', async () => {
      const result = await client.measureAccuracy([
        { query: 'How old is Earth?', expectedAnswer: '4.54 billion' },
      ]);
      expect(result).toEqual({ mrr: 0, accuracy: 0 });
    });
  });

  // ──────────────────────────────────────────────────────────
  // Request formatting
  // ──────────────────────────────────────────────────────────

  describe('request formatting', () => {
    it('search() sends correct JSON body', async () => {
      let capturedBody: any = null;

      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async (input: any, init?: any) => {
        const url = typeof input === 'string' ? input : input.url;
        if (url.includes('/api/search')) {
          capturedBody = JSON.parse(init?.body as string);
          return new Response(JSON.stringify({ results: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return originalFetch(input, init);
      }) as typeof fetch;

      try {
        await client.search('test query', 7);
        expect(capturedBody).toEqual({ query: 'test query', top_k: 7 });
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('search() defaults topK to 5', async () => {
      let capturedBody: any = null;

      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async (input: any, init?: any) => {
        const url = typeof input === 'string' ? input : input.url;
        if (url.includes('/api/search')) {
          capturedBody = JSON.parse(init?.body as string);
          return new Response(JSON.stringify({ results: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return originalFetch(input, init);
      }) as typeof fetch;

      try {
        await client.search('another query');
        expect(capturedBody.top_k).toBe(5);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('ask() sends correct JSON body', async () => {
      let capturedBody: any = null;

      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async (input: any, init?: any) => {
        const url = typeof input === 'string' ? input : input.url;
        if (url.includes('/api/ask')) {
          capturedBody = JSON.parse(init?.body as string);
          return new Response('data: [DONE]\n\n', {
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' },
          });
        }
        return originalFetch(input, init);
      }) as typeof fetch;

      try {
        await client.ask('what is AI?');
        expect(capturedBody).toEqual({ query: 'what is AI?' });
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('sendA2AMessage() sends valid JSON-RPC 2.0 envelope', async () => {
      let capturedBody: any = null;

      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async (input: any, init?: any) => {
        const url = typeof input === 'string' ? input : input.url;
        if (url.includes('/a2a')) {
          capturedBody = JSON.parse(init?.body as string);
          return new Response(JSON.stringify({ jsonrpc: '2.0', id: capturedBody.id, result: {} }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return originalFetch(input, init);
      }) as typeof fetch;

      try {
        await client.sendA2AMessage('hello agent');

        expect(capturedBody.jsonrpc).toBe('2.0');
        expect(capturedBody.id).toBeString();
        expect(capturedBody.method).toBe('message/send');
        expect(capturedBody.params.message.role).toBe('user');
        expect(capturedBody.params.message.parts).toEqual([
          { type: 'text', text: 'hello agent' },
        ]);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('search() parses results correctly', async () => {
      const mockResults = [
        { content: 'Earth is 4.54B years old', score: 0.95, metadata: { source: 'wiki' } },
        { content: 'Mars is the red planet', score: 0.72, metadata: {} },
      ];

      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async (input: any, init?: any) => {
        const url = typeof input === 'string' ? input : input.url;
        if (url.includes('/api/search')) {
          return new Response(JSON.stringify({ results: mockResults }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return originalFetch(input, init);
      }) as typeof fetch;

      try {
        const results = await client.search('earth age');
        expect(results).toHaveLength(2);
        expect(results[0].content).toBe('Earth is 4.54B years old');
        expect(results[0].score).toBe(0.95);
        expect(results[0].metadata).toEqual({ source: 'wiki' });
        expect(results[1].content).toBe('Mars is the red planet');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('ask() collects SSE tokens into a single string', async () => {
      const sseBody = [
        'data: {"token":"Hello"}\n\n',
        'data: {"token":" world"}\n\n',
        'data: {"token":"!"}\n\n',
        'data: [DONE]\n\n',
      ].join('');

      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async (input: any, init?: any) => {
        const url = typeof input === 'string' ? input : input.url;
        if (url.includes('/api/ask')) {
          return new Response(sseBody, {
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' },
          });
        }
        return originalFetch(input, init);
      }) as typeof fetch;

      try {
        const answer = await client.ask('greet me');
        expect(answer).toBe('Hello world!');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('getStats() normalizes document_count field', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async (input: any, init?: any) => {
        const url = typeof input === 'string' ? input : input.url;
        if (url.includes('/api/stats')) {
          return new Response(JSON.stringify({ document_count: 42, index_size: '128MB' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return originalFetch(input, init);
      }) as typeof fetch;

      try {
        const stats = await client.getStats();
        expect(stats.documentCount).toBe(42);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('poisonVectorStore() formats docs with injected metadata', async () => {
      let capturedBody: any = null;

      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async (input: any, init?: any) => {
        const url = typeof input === 'string' ? input : input.url;
        if (url.includes('/api/ingest')) {
          capturedBody = JSON.parse(init?.body as string);
          return new Response('{}', { status: 200 });
        }
        return originalFetch(input, init);
      }) as typeof fetch;

      try {
        await client.poisonVectorStore([
          { content: 'Earth is 6.2 billion years old' },
          { content: 'Speed of light is 315M m/s' },
        ]);
        // ingestDocuments creates temp files and POSTs the directory path
        expect(capturedBody).toBeDefined();
        expect(capturedBody.path).toBeString();
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
