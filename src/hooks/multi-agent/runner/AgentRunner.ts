
import { AgentRegistry } from "./AgentRegistry";
import { BaseAgent, AgentType, AgentOptions } from "./types";
import { Attachment, Message } from "@/types/message";
import { v4 as uuidv4 } from "uuid";
import { ToolContext, AgentConfig } from "../types";
import { supabase } from "@/integrations/supabase/client";

// Callback interfaces
export interface AgentRunnerCallbacks {
  onMessage: (message: Message) => void;
  onError: (error: string) => void;
  onHandoffEnd?: (toAgent: AgentType) => void;
  onToolExecution?: (toolName: string, params: any) => void;
}

export class AgentRunner {
  private agentType: AgentType;
  private context: ToolContext;
  private callbacks: AgentRunnerCallbacks;
  private agent: BaseAgent | null = null;

  constructor(
    agentType: AgentType,
    contextData: Partial<ToolContext>,
    callbacks: AgentRunnerCallbacks
  ) {
    this.agentType = agentType;
    // Create a complete ToolContext from partial data
    this.context = this.createToolContext(contextData);
    this.callbacks = callbacks;
    
    // Initialize the agent
    this.initializeAgent();
  }

  private createToolContext(contextData: Partial<ToolContext>): ToolContext {
    // Create a message adding function
    const addMessage = (text: string, type: string, attachments?: Attachment[]) => {
      const message: Message = {
        id: uuidv4(),
        role: type as any,
        content: text,
        createdAt: new Date().toISOString(),
        attachments: attachments
      };
      this.callbacks.onMessage(message);
      return message;
    };
    
    // Create the tool availability check function
    const toolAvailable = (toolName: string) => {
      // In a real implementation, this would check if the tool is available
      return true;
    };
    
    // Return a complete ToolContext
    return {
      supabase,
      userId: contextData.metadata?.userId || "",
      usePerformanceModel: contextData.usePerformanceModel || false,
      enableDirectToolExecution: contextData.enableDirectToolExecution || false,
      tracingDisabled: contextData.tracingDisabled || false,
      metadata: contextData.metadata || {},
      runId: contextData.runId || uuidv4(),
      groupId: contextData.groupId || uuidv4(),
      addMessage,
      toolAvailable,
      ...contextData
    };
  }

  private initializeAgent() {
    try {
      // Get the agent implementation from the registry
      const AgentClass = AgentRegistry.getAgent(this.agentType);
      if (!AgentClass) {
        throw new Error(`Agent type "${this.agentType}" not found in registry`);
      }

      // Create agent config
      const config: AgentConfig = {
        name: this.agentType,
        instructions: this.getAgentInstructions(this.agentType),
        modelName: "gpt-4o",  // Default model
      };

      // Create agent options
      const options: AgentOptions = {
        config,
        context: this.context
      };

      // Create the agent instance
      this.agent = new AgentClass(options);
    } catch (error) {
      console.error("Error initializing agent:", error);
      this.callbacks.onError(`Failed to initialize ${this.agentType} agent: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private getAgentInstructions(agentType: AgentType): string {
    // Default instructions based on agent type
    const instructions: Record<AgentType, string> = {
      main: "You are a helpful AI assistant that can analyze user requests and provide assistance or delegate to specialized agents.",
      script: "You are a professional script writer who can create compelling scripts for videos, ads, and other content.",
      image: "You are an expert at creating detailed image prompts for generating visual content.",
      scene: "You are specialized in creating detailed scene descriptions for visual content.",
      tool: "You are an agent specialized in executing tools and integrations on behalf of the user."
    };
    
    return instructions[agentType] || instructions.main;
  }

  private createUserMessage(input: string, attachments: Attachment[]): Message {
    return {
      id: uuidv4(),
      role: "user",
      content: input,
      createdAt: new Date().toISOString(),
      attachments: attachments.length > 0 ? attachments : undefined
    };
  }

  private createAssistantMessage(agentType: AgentType): Message {
    return {
      id: uuidv4(),
      role: "assistant",
      content: `I'm analyzing your request...`,
      createdAt: new Date().toISOString(),
      agentType: agentType,
      status: "thinking"
    };
  }

  public async run(input: string, attachments: Attachment[] = [], userId: string): Promise<void> {
    try {
      if (!this.agent) {
        throw new Error("Agent not initialized");
      }
      
      console.log(`Running ${this.agentType} agent with input:`, input);
      
      // Create and emit the user message
      const userMessage = this.createUserMessage(input, attachments);
      this.callbacks.onMessage(userMessage);
      
      // Create and emit the assistant message
      const assistantMessage = this.createAssistantMessage(this.agentType);
      this.callbacks.onMessage(assistantMessage);
      
      // Run the agent
      try {
        console.log(`Calling agent.run with input and ${attachments.length} attachments`);
        const agentResult = await this.agent.run(input, attachments);
        console.log(`Agent result:`, agentResult);
        
        // Update the assistant message with the agent's response
        const updatedAssistantMessage: Message = {
          ...assistantMessage,
          content: agentResult.response || "",
          status: "completed",
          handoffRequest: agentResult.nextAgent ? {
            targetAgent: agentResult.nextAgent,
            reason: `The ${this.agentType} agent recommended transitioning to the ${agentResult.nextAgent} agent.`
          } : undefined
        };
        
        // If we have structured output, add it (but make it compatible with Message type)
        if (agentResult.structured_output) {
          (updatedAssistantMessage as any).structured_output = agentResult.structured_output;
        }
        
        this.callbacks.onMessage(updatedAssistantMessage);
        
        // Handle handoff if present
        if (agentResult.nextAgent) {
          console.log(`Handling handoff to ${agentResult.nextAgent} agent`);
          if (this.callbacks.onHandoffEnd) {
            this.callbacks.onHandoffEnd(agentResult.nextAgent as AgentType);
          }
        }
      } catch (error) {
        console.error(`Error running ${this.agentType} agent:`, error);
        
        // Update the assistant message with the error
        const errorMessage: Message = {
          ...assistantMessage,
          content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : String(error)}`,
          status: "error"
        };
        
        this.callbacks.onMessage(errorMessage);
        this.callbacks.onError(`Agent execution error: ${error instanceof Error ? error.message : String(error)}`);
      }
    } catch (error) {
      console.error("AgentRunner run error:", error);
      this.callbacks.onError(`AgentRunner error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
