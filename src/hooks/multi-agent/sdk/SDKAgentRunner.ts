import { BaseAgentImpl } from "../runner/agents/BaseAgentImpl";
import { AgentConfig, AgentOptions, AgentResult, AgentStreamEvent, AgentType, RunnerCallbacks, RunnerContext, SDKAgentDefinition, SDKAgentOptions, SDKRunner, SDKTool } from "../runner/types";
import { AssistantAgent } from "../runner/agents/AssistantAgent";
import { DataAgent } from "../runner/agents/DataAgent";
import { ImageGeneratorAgent } from "../runner/agents/ImageGeneratorAgent";
import { MainAgent } from "../runner/agents/MainAgent";
import { SceneCreatorAgent } from "../runner/agents/SceneCreatorAgent";
import { SceneGeneratorAgent } from "../runner/agents/SceneGeneratorAgent";
import { ScriptWriterAgent } from "../runner/agents/ScriptWriterAgent";
import { ToolAgent } from "../runner/agents/ToolAgent";
import { ToolConverter } from "./ToolConverter";
import { SDKToolExecutor } from "./SDKToolExecutor";

export class SDKAgentRunner implements SDKRunner {
  private agentDefinitions: SDKAgentDefinition[];
  private agentOptions: SDKAgentOptions;
  private currentAgent: BaseAgentImpl | null = null;
  private context: RunnerContext;
  private callbacks: RunnerCallbacks | null = null;
  private traceId: string;
  
  constructor(agentDefinitions: SDKAgentDefinition[], options: SDKAgentOptions = {}) {
    this.agentDefinitions = agentDefinitions;
    this.agentOptions = options;
    this.traceId = this.generateTraceId();
  }
  
  async initialize(): Promise<void> {
    // Initialization logic here
  }
  
  setCallbacks(callbacks: RunnerCallbacks): void {
    this.callbacks = callbacks;
  }
  
  getTraceId(): string {
    return this.traceId;
  }
  
  getCurrentAgent(): AgentType {
    return this.currentAgent?.getType() || "main";
  }
  
  private generateTraceId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  
  private createAgent(agentDefinition: SDKAgentDefinition, context: RunnerContext): BaseAgentImpl {
    const agentType = agentDefinition.name.toLowerCase();
    const agentOptions: AgentOptions = {
      config: {
        name: agentDefinition.name,
        instructions: agentDefinition.instructions,
        model: agentDefinition.model || this.agentOptions.model || "gpt-3.5-turbo"
      },
      model: agentDefinition.model || this.agentOptions.model || "gpt-3.5-turbo",
      context: context,
      traceId: this.traceId
    };
    
    switch (agentType) {
      case "assistant":
        return new AssistantAgent(agentOptions);
      case "data":
        return new DataAgent(agentOptions);
      case "imagegenerator":
        return new ImageGeneratorAgent(agentOptions);
      case "main":
        return new MainAgent(agentOptions);
      case "scenecreator":
        return new SceneCreatorAgent(agentOptions);
      case "scenegenerator":
        return new SceneGeneratorAgent(agentOptions);
      case "scriptwriter":
        return new ScriptWriterAgent(agentOptions);
      case "tool":
        return new ToolAgent(agentOptions);
      default:
        return new MainAgent(agentOptions);
    }
  }
  
  async processInput(input: string, context?: RunnerContext): Promise<AgentResult> {
    if (!context) {
      throw new Error("Context is required to process input");
    }
    
    this.context = context;
    
    // Find the main agent definition
    const mainAgentDefinition = this.agentDefinitions.find(agent => agent.name.toLowerCase() === "main");
    if (!mainAgentDefinition) {
      throw new Error("Main agent definition not found");
    }
    
    // Create main agent
    this.currentAgent = this.createAgent(mainAgentDefinition, context);
    
    // Process input
    return this.processWithAgent(this.currentAgent, input, context);
  }
  
  private async processWithAgent(agent: BaseAgentImpl, input: string, context: RunnerContext): Promise<AgentResult> {
    const agentType = agent.getType();
    
    // Add message to trace
    if (context.addMessage) {
      context.addMessage(`Processing with ${agentType} agent`, "agent_start");
    }
    
    // Process with agent
    let result: AgentResult;
    try {
      result = await agent.process(input, context);
      
      // Add message to trace
      if (context.addMessage) {
        context.addMessage(`Agent ${agentType} completed with output: ${result.output}`, "agent_complete");
      }
    } catch (error: any) {
      console.error(`Error processing with agent ${agentType}:`, error);
      
      // Add message to trace
      if (context.addMessage) {
        context.addMessage(`Error processing with agent ${agentType}: ${error.message}`, "agent_error");
      }
      
      return {
        output: `Error processing with agent ${agentType}: ${error.message}`
      };
    }
    
    // Handle handoff
    if (result.handoff) {
      if (this.callbacks?.onHandoffStart) {
        this.callbacks.onHandoffStart(agentType, result.handoff.targetAgent, result.handoff.reason);
      }
      
      // Find the target agent definition
      const targetAgentDefinition = this.agentDefinitions.find(agent => agent.name.toLowerCase() === result.handoff?.targetAgent);
      if (!targetAgentDefinition) {
        throw new Error(`Target agent definition ${result.handoff.targetAgent} not found`);
      }
      
      // Create target agent
      this.currentAgent = this.createAgent(targetAgentDefinition, context);
      
      if (this.callbacks?.onHandoffEnd) {
        this.callbacks.onHandoffEnd(agentType, result.handoff.targetAgent, result);
      }
      
      // Process with target agent
      return this.processWithAgent(this.currentAgent, input, context);
    }
    
    return result;
  }
}
