
import { BaseAgent, AgentType, AgentOptions } from "./types";
import { AssistantAgent } from "./agents/AssistantAgent";
import { ScriptWriterAgent } from "./agents/ScriptWriterAgent";
import { ImageGeneratorAgent } from "./agents/ImageGeneratorAgent";
import { SceneCreatorAgent } from "./agents/SceneCreatorAgent";
import { ToolAgent } from "./agents/ToolAgent";
import { DataAgent } from "./agents/DataAgent";

class AgentRegistryImpl {
  private static instance: AgentRegistryImpl;
  private agentClasses: Map<string, new (options: AgentOptions) => BaseAgent> = new Map();
  
  private constructor() {
    // Register default agent classes
    this.registerAgentClass('main', AssistantAgent as unknown as new (options: AgentOptions) => BaseAgent);
    this.registerAgentClass('script', ScriptWriterAgent as unknown as new (options: AgentOptions) => BaseAgent);
    this.registerAgentClass('image', ImageGeneratorAgent as unknown as new (options: AgentOptions) => BaseAgent);
    this.registerAgentClass('scene', SceneCreatorAgent as unknown as new (options: AgentOptions) => BaseAgent);
    this.registerAgentClass('tool', ToolAgent as unknown as new (options: AgentOptions) => BaseAgent);
    this.registerAgentClass('data', DataAgent as unknown as new (options: AgentOptions) => BaseAgent);
  }
  
  public static getInstance(): AgentRegistryImpl {
    if (!AgentRegistryImpl.instance) {
      AgentRegistryImpl.instance = new AgentRegistryImpl();
    }
    return AgentRegistryImpl.instance;
  }
  
  public registerAgentClass(agentType: string, AgentClass: new (options: AgentOptions) => BaseAgent): void {
    this.agentClasses.set(agentType, AgentClass);
  }
  
  public getAgentClass(agentType: string): (new (options: AgentOptions) => BaseAgent) | undefined {
    return this.agentClasses.get(agentType);
  }
  
  public getAllAgentTypes(): string[] {
    return Array.from(this.agentClasses.keys());
  }
}

// Expose a singleton instance
export const AgentRegistry = AgentRegistryImpl.getInstance();
