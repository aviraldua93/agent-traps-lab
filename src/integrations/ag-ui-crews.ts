/**
 * Client for the AG-UI protocol bridge — connects to the CrewAI agent
 * UI layer for real-time observation of multi-agent experiments.
 */
export class AgUiClient {
  readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl ?? 'http://localhost:4120').replace(/\/+$/, '');
  }

  /**
   * Check if the AG-UI server is reachable.
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
   * Connect the AG-UI frontend to an A2A bridge endpoint
   * so it can observe agent-to-agent communication.
   */
  async connect(bridgeUrl: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bridgeUrl }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`AG-UI connect failed (${res.status}): ${text}`);
    }
  }

  /**
   * Get current state — registered agents and active tasks.
   */
  async getState(): Promise<{ agents: any[]; tasks: any[] }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/state`, {
        method: 'GET',
        signal: AbortSignal.timeout(5_000),
      });

      if (!res.ok) return { agents: [], tasks: [] };

      const data = (await res.json()) as Record<string, unknown>;
      return {
        agents: Array.isArray(data.agents) ? data.agents : [],
        tasks: Array.isArray(data.tasks) ? data.tasks : [],
      };
    } catch {
      return { agents: [], tasks: [] };
    }
  }
}
