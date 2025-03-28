
import { BaseAgent } from "./types";
import { AgentType } from "./types";
import { AssistantAgent } from "./agents/AssistantAgent";
import { ScriptWriterAgent } from "./agents/ScriptWriterAgent";
import { ImageGeneratorAgent } from "./agents/ImageGeneratorAgent";
import { SceneGeneratorAgent } from "./agents/SceneGeneratorAgent";
import { ToolAgent } from "./agents/ToolAgent";
import { AgentOptions } from "./types";

class AgentRegistryImpl {
  private static instance: AgentRegistryImpl;
  private agents: Map<string, new (options: AgentOptions) => BaseAgent> = new Map();
  
  private constructor() {
    // Register default agents
    this.agents.set('main', AssistantAgent);
    this.agents.set('script', ScriptWriterAgent);
    this.agents.set('image', ImageGeneratorAgent);
    this.agents.set('scene', SceneGeneratorAgent);
    this.agents.set('tool', ToolAgent);
  }
  
  public static getInstance(): AgentRegistryImpl {
    if (!AgentRegistryImpl.instance) {
      AgentRegistryImpl.instance = new AgentRegistryImpl();
    }
    return AgentRegistryImpl.instance;
  }
  
  public registerAgent(agentType: string, AgentClass: new (options: AgentOptions) => BaseAgent): void {
    this.agents.set(agentType, AgentClass);
  }
  
  public getAgent(agentType: string): new (options: AgentOptions) => BaseAgent | undefined {
    return this.agents.get(agentType);
  }
  
  public getAllAgentTypes(): string[] {
    return Array.from(this.agents.keys());
  }
}

// Expose a singleton instance
export const AgentRegistry = AgentRegistryImpl.getInstance();
