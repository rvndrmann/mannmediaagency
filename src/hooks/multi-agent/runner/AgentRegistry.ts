
import { AgentType, RunnerContext, AgentResult } from "./types";

// Define a simplified base agent interface that matches what AgentRegistry needs
interface BaseAgent {
  run(input: string, context: RunnerContext): Promise<AgentResult>;
  getType(): AgentType;
}

// Define AgentOptions interface to match how it's used
interface AgentOptions {
  context: RunnerContext;
  traceId?: string;
}

// Import the agent implementations
// These will be implemented in their respective files
class AssistantAgent implements BaseAgent {
  constructor(options: AgentOptions) {}
  async run(input: string, context: RunnerContext): Promise<AgentResult> {
    return { response: "Assistant response", nextAgent: null };
  }
  getType(): AgentType { return "main"; }
}

class ScriptWriterAgent implements BaseAgent {
  constructor(options: AgentOptions) {}
  async run(input: string, context: RunnerContext): Promise<AgentResult> {
    return { response: "Script writer response", nextAgent: null };
  }
  getType(): AgentType { return "script"; }
}

class ImageGeneratorAgent implements BaseAgent {
  constructor(options: AgentOptions) {}
  async run(input: string, context: RunnerContext): Promise<AgentResult> {
    return { response: "Image generator response", nextAgent: null };
  }
  getType(): AgentType { return "image"; }
}

class SceneGeneratorAgent implements BaseAgent {
  constructor(options: AgentOptions) {}
  async run(input: string, context: RunnerContext): Promise<AgentResult> {
    return { response: "Scene generator response", nextAgent: null };
  }
  getType(): AgentType { return "scene"; }
}

class ToolAgent implements BaseAgent {
  constructor(options: AgentOptions) {}
  async run(input: string, context: RunnerContext): Promise<AgentResult> {
    return { response: "Tool agent response", nextAgent: null };
  }
  getType(): AgentType { return "tool"; }
}

class DataAgent implements BaseAgent {
  constructor(options: AgentOptions) {}
  async run(input: string, context: RunnerContext): Promise<AgentResult> {
    return { response: "Data agent response", nextAgent: null };
  }
  getType(): AgentType { return "data"; }
}

class AgentRegistryImpl {
  private static instance: AgentRegistryImpl;
  private agentClasses: Map<string, new (options: AgentOptions) => BaseAgent> = new Map();
  
  private constructor() {
    // Register default agent classes
    this.registerAgentClass('main', AssistantAgent);
    this.registerAgentClass('script', ScriptWriterAgent);
    this.registerAgentClass('image', ImageGeneratorAgent);
    this.registerAgentClass('scene', SceneGeneratorAgent);
    this.registerAgentClass('tool', ToolAgent);
    this.registerAgentClass('data', DataAgent);
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
