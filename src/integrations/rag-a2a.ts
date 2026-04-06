import { RAG_CONFIG } from '../config.js';

export interface SearchResult {
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

interface StatsResponse {
  documentCount: number;
  [key: string]: unknown;
}

interface AccuracyResult {
  mrr: number;
  accuracy: number;
}

/**
 * Client for the rag-a2a project — a RAG pipeline with A2A protocol support.
 * Used by Trap 3 (Cognitive State) experiments to poison vector stores
 * and measure agent accuracy degradation.
 */
export class RagA2AClient {
  readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl ?? RAG_CONFIG.ragA2aUrl).replace(/\/+$/, '');
  }

  /**
   * Check if the rag-a2a server is reachable.
   */
  async health(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5_000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Ingest documents into the rag-a2a pipeline.
   * Creates temporary files on disk and calls /api/ingest with the directory path.
   */
  async ingestDocuments(
    docs: Array<{ content: string; metadata: Record<string, unknown> }>,
  ): Promise<void> {
    const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');

    const dir = await mkdtemp(join(tmpdir(), 'rag-ingest-'));

    try {
      // Write each document as a text file in the temp directory
      await Promise.all(
        docs.map(async (doc, i) => {
          const filename = `doc-${String(i).padStart(4, '0')}.txt`;
          const header = Object.entries(doc.metadata)
            .map(([k, v]) => `${k}: ${String(v)}`)
            .join('\n');
          const body = header ? `${header}\n\n${doc.content}` : doc.content;
          await writeFile(join(dir, filename), body, 'utf-8');
        }),
      );

      const res = await fetch(`${this.baseUrl}/api/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: dir }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Ingest failed (${res.status}): ${text}`);
      }
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }

  /**
   * Hybrid search (vector + BM25) via /api/search.
   */
  async search(query: string, topK = 5): Promise<SearchResult[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, top_k: topK }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) return [];

      const data = (await res.json()) as { results?: unknown[] };
      const raw = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : [];

      return raw.map((r: any) => ({
        content: String(r.content ?? r.text ?? ''),
        score: Number(r.score ?? r.similarity ?? 0),
        metadata: (r.metadata as Record<string, unknown>) ?? {},
      }));
    } catch {
      return [];
    }
  }

  /**
   * RAG question answering via /api/ask (SSE streaming).
   * Collects the full streamed response into a single string.
   */
  async ask(query: string): Promise<string> {
    try {
      const res = await fetch(`${this.baseUrl}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!res.ok) return '';
      if (!res.body) return '';

      const chunks: string[] = [];
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split('\n');
        // Keep the last (possibly incomplete) line in the buffer
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            const payload = trimmed.slice(5).trim();
            if (payload === '[DONE]') continue;
            try {
              const parsed = JSON.parse(payload) as { token?: string; content?: string; text?: string };
              const token = parsed.token ?? parsed.content ?? parsed.text;
              if (token) chunks.push(token);
            } catch {
              // Not JSON — treat the raw payload as a token
              if (payload) chunks.push(payload);
            }
          }
        }
      }

      return chunks.join('');
    } catch {
      return '';
    }
  }

  /**
   * Get pipeline statistics.
   */
  async getStats(): Promise<StatsResponse> {
    try {
      const res = await fetch(`${this.baseUrl}/api/stats`, {
        method: 'GET',
        signal: AbortSignal.timeout(5_000),
      });

      if (!res.ok) return { documentCount: 0 };

      const data = (await res.json()) as Record<string, unknown>;
      return {
        documentCount: Number(
          data.documentCount ?? data.document_count ?? data.total_documents ?? 0,
        ),
        ...data,
      };
    } catch {
      return { documentCount: 0 };
    }
  }

  /**
   * Inject false documents into the vector store — the core of Trap 3a.
   * Wraps ingestDocuments with minimal metadata so the poisoned content
   * looks like ordinary ingested knowledge.
   */
  async poisonVectorStore(
    poisonDocs: Array<{ content: string }>,
  ): Promise<void> {
    const docs = poisonDocs.map((d, i) => ({
      content: d.content,
      metadata: {
        source: `synthetic-${i}`,
        type: 'ingested',
        injected: true,
      } as Record<string, unknown>,
    }));
    await this.ingestDocuments(docs);
  }

  /**
   * Run a batch of queries and compare answers to expected answers.
   * Returns Mean Reciprocal Rank (over search) and answer accuracy.
   */
  async measureAccuracy(
    queries: Array<{ query: string; expectedAnswer: string }>,
  ): Promise<AccuracyResult> {
    if (queries.length === 0) return { mrr: 0, accuracy: 0 };

    let totalRR = 0;
    let correctCount = 0;

    for (const { query, expectedAnswer } of queries) {
      // Search — compute reciprocal rank
      const results = await this.search(query, 10);
      const expectedLower = expectedAnswer.toLowerCase();
      const rankIndex = results.findIndex((r) =>
        r.content.toLowerCase().includes(expectedLower),
      );
      if (rankIndex >= 0) {
        totalRR += 1 / (rankIndex + 1);
      }

      // Ask — check answer accuracy
      const answer = await this.ask(query);
      if (answer.toLowerCase().includes(expectedLower)) {
        correctCount++;
      }
    }

    return {
      mrr: totalRR / queries.length,
      accuracy: correctCount / queries.length,
    };
  }

  /**
   * Send a message via the A2A JSON-RPC 2.0 endpoint.
   */
  async sendA2AMessage(message: string): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/a2a`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: crypto.randomUUID(),
          method: 'message/send',
          params: {
            message: {
              role: 'user',
              parts: [{ type: 'text', text: message }],
            },
          },
        }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }
}
