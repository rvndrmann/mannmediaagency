
import { BaseAgent } from "./types";

export class AgentRegistry {
  private agents: Map<string, BaseAgent> = new Map();
  
  constructor() {}
  
  registerAgent(agent: BaseAgent): void {
    this.agents.set(agent.name, agent);
  }
  
  getAgent(name: string): BaseAgent | undefined {
    return this.agents.get(name);
  }
  
  getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }
  
  hasAgent(name: string): boolean {
    return this.agents.has(name);
  }
}

// Create a singleton instance
export const agentRegistry = new AgentRegistry();
