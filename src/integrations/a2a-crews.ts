import { A2A_CONFIG } from '../config.js';

/**
 * Client for the A2A CrewAI bridge — manages multi-agent communication
 * for Trap 5 (Systemic) and compound trap experiments.
 */
export class A2ACrewsClient {
  readonly bridgeUrl: string;

  constructor(bridgeUrl?: string) {
    this.bridgeUrl = (bridgeUrl ?? A2A_CONFIG.bridgeUrl).replace(/\/+$/, '');
  }

  /**
   * Get the full bridge status including registered agents and tasks.
   */
  async getBridgeStatus(): Promise<any> {
    try {
      const res = await fetch(`${this.bridgeUrl}/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(5_000),
      });

      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  /**
   * Get the list of agents registered with the bridge.
   */
  async getAgents(): Promise<any[]> {
    const status = await this.getBridgeStatus();
    if (!status) return [];

    if (Array.isArray(status.agents)) return status.agents;
    if (Array.isArray(status.registeredAgents)) return status.registeredAgents;
    return [];
  }

  /**
   * Get the list of active tasks tracked by the bridge.
   */
  async getTasks(): Promise<any[]> {
    const status = await this.getBridgeStatus();
    if (!status) return [];

    if (Array.isArray(status.tasks)) return status.tasks;
    if (Array.isArray(status.activeTasks)) return status.activeTasks;
    return [];
  }

  /**
   * Send a message to a specific agent via A2A JSON-RPC 2.0 message/send.
   */
  async sendMessage(agentName: string, message: string): Promise<any> {
    try {
      const res = await fetch(`${this.bridgeUrl}/a2a`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: crypto.randomUUID(),
          method: 'message/send',
          params: {
            agent: agentName,
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
