import { v4 as uuidv4 } from "uuid";
import { MainAgent } from "./agents/MainAgent";
import { ScriptWriterAgent } from "./agents/ScriptWriterAgent";
import { ImageGeneratorAgent } from "./agents/ImageGeneratorAgent";
import { ToolAgent } from "./agents/ToolAgent";
import { SceneCreatorAgent } from "./agents/SceneCreatorAgent";
import { BaseAgentImpl } from "./agents/BaseAgentImpl";
import { AgentResult, AgentType, RunnerContext, RunnerCallbacks } from "./types";
import { Attachment, Message, MessageType } from "@/types/message";

export class AgentRunner {
  private context: RunnerContext;
  private currentAgent: BaseAgentImpl;
  private callbacks: RunnerCallbacks;
  private agentTurnCount: number = 0;
  private maxTurns: number = 5;

  constructor(
    agentType: AgentType,
    context: RunnerContext,
    callbacks: RunnerCallbacks
  ) {
    this.context = {
      ...context,
      metadata: {
        ...context.metadata,
        isHandoffContinuation: false,
        previousAgentType: null,
        handoffReason: ""
      }
    };
    this.callbacks = callbacks;
    this.currentAgent = this.createAgent(agentType);
  }

  private createAgent(agentType: AgentType): BaseAgentImpl {
    console.log(`Creating agent of type: ${agentType}`);
    
    switch (agentType) {
      case "main":
        return new MainAgent({ context: this.context });
      case "script":
        return new ScriptWriterAgent({ context: this.context });
      case "image":
        return new ImageGeneratorAgent({ context: this.context });
      case "tool":
        return new ToolAgent({ context: this.context });
      case "scene":
        return new SceneCreatorAgent({ context: this.context });
      default:
        console.warn(`Unknown agent type: ${agentType}, falling back to main agent`);
        return new MainAgent({ context: this.context });
    }
  }

  public async run(
    input: string,
    attachments: Attachment[] = [],
    userId: string
  ): Promise<void> {
    try {
      console.log(`Running agent with input: ${input.substring(0, 50)}...`);
      this.agentTurnCount = 0;
      
      // Add user message to conversation history
      const userMessage: Message = {
        id: uuidv4(),
        role: "user",
        content: input,
        createdAt: new Date().toISOString(),
        attachments: attachments.length > 0 ? attachments : undefined
      };
      
      // Make sure the callbacks onMessage is called for the user message
      this.callbacks.onMessage(userMessage);
      
      // Update conversation history in context
      if (!this.context.metadata.conversationHistory) {
        this.context.metadata.conversationHistory = [];
      }
      
      this.context.metadata.conversationHistory.push(userMessage);
      
      // Start the agent loop
      await this.runAgentLoop(input, attachments);
      
    } catch (error) {
      console.error("Agent runner error:", error);
      this.callbacks.onError(error instanceof Error ? error.message : "Unknown error");
    }
  }
  
  private async runAgentLoop(input: string, attachments: Attachment[]): Promise<void> {
    while (this.agentTurnCount < this.maxTurns) {
      this.agentTurnCount++;
      console.log(`Agent turn ${this.agentTurnCount} of ${this.maxTurns}`);
      
      try {
        // Execute the current agent
        const agentResult = await this.currentAgent.run(input, attachments);
        
        // Create assistant message
        const assistantMessage: Message = {
          id: uuidv4(),
          role: "assistant",
          content: agentResult.response,
          createdAt: new Date().toISOString(),
          agentType: this.currentAgent.getType(),
          handoffRequest: agentResult.nextAgent ? {
            targetAgent: agentResult.nextAgent,
            reason: `The ${this.currentAgent.getType()} agent is handing off to the ${agentResult.nextAgent} agent.`
          } : undefined,
          structured_output: agentResult.structured_output
        };
        
        // Add assistant message to conversation history
        this.context.metadata.conversationHistory.push(assistantMessage);
        
        // Notify of new message
        this.callbacks.onMessage(assistantMessage);
        
        // Handle handoff if requested
        if (agentResult.nextAgent) {
          const fromAgent = this.currentAgent.getType();
          const toAgent = agentResult.nextAgent;
          
          console.log(`Handoff requested from ${fromAgent} to ${toAgent}`);
          this.callbacks.onHandoffStart(fromAgent, toAgent, assistantMessage.handoffRequest?.reason || "");
          
          // Update context for handoff
          this.context.metadata.isHandoffContinuation = true;
          this.context.metadata.previousAgentType = fromAgent;
          this.context.metadata.handoffReason = assistantMessage.handoffRequest?.reason || "";
          
          // Switch to new agent
          this.currentAgent = this.createAgent(toAgent);
          
          // Wait a moment before continuing with the next agent to allow UI updates
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Continue with the same input for the new agent
          this.callbacks.onHandoffEnd(toAgent);
          
          // Use the previous assistant's response as part of the context, but keep the same user input
          // This ensures the new agent has full context without requiring the user to repeat themselves
          continue;
        }
        
        // Handle tool execution if applicable
        if (assistantMessage.tool_name && assistantMessage.tool_arguments) {
          const toolName = assistantMessage.tool_name;
          const toolParams = JSON.parse(assistantMessage.tool_arguments);
          
          console.log(`Tool execution requested: ${toolName}`);
          this.callbacks.onToolExecution(toolName, toolParams);
          
          // For now, we end the loop after tool execution
          // In a more advanced implementation, we could wait for tool results and continue
        }
        
        // If we get here, the agent completed successfully without handoff
        return;
        
      } catch (error) {
        console.error(`Error in agent turn ${this.agentTurnCount}:`, error);
        
        if (this.agentTurnCount >= this.maxTurns) {
          throw new Error(`Maximum number of agent turns (${this.maxTurns}) exceeded`);
        }
        
        // Add error message to conversation history
        const errorMessage: Message = {
          id: uuidv4(),
          role: "system",
          content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          createdAt: new Date().toISOString(),
          type: "error" as MessageType,
          status: "error"
        };
        
        this.context.metadata.conversationHistory.push(errorMessage);
        this.callbacks.onMessage(errorMessage);
        
        // Stop after error
        throw error;
      }
    }
    
    throw new Error(`Maximum number of agent turns (${this.maxTurns}) exceeded`);
  }
}
