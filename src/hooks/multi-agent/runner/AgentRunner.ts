
import { v4 as uuidv4 } from "uuid";
import { MainAgent } from "./agents/MainAgent";
import { ScriptWriterAgent } from "./agents/ScriptWriterAgent";
import { ImageGeneratorAgent } from "./agents/ImageGeneratorAgent";
import { ToolAgent } from "./agents/ToolAgent";
import { SceneCreatorAgent } from "./agents/SceneCreatorAgent";
import { BaseAgentImpl } from "./agents/BaseAgentImpl";
import { AgentResult, AgentType, RunnerContext, RunnerCallbacks } from "./types";
import { Attachment, Message, MessageType, ContinuityData } from "@/types/message";

export class AgentRunner {
  private context: RunnerContext;
  private currentAgent: BaseAgentImpl;
  private callbacks: RunnerCallbacks;
  private agentTurnCount: number = 0;
  private maxTurns: number = 7; // Increased max turns
  private handoffHistory: { from: AgentType, to: AgentType, reason: string }[] = [];

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
        handoffReason: "",
        handoffHistory: []
      }
    };
    this.callbacks = callbacks;
    this.currentAgent = this.createAgent(agentType);
  }

  private createAgent(agentType: AgentType): BaseAgentImpl {
    console.log(`Creating agent of type: ${agentType}`);
    
    const options = { context: this.context };
    
    switch (agentType) {
      case "main":
        return new MainAgent(options);
      case "script":
        return new ScriptWriterAgent(options);
      case "image":
        return new ImageGeneratorAgent(options);
      case "tool":
        return new ToolAgent(options);
      case "scene":
        return new SceneCreatorAgent(options);
      default:
        console.warn(`Unknown agent type: ${agentType}, falling back to main agent`);
        return new MainAgent(options);
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
      console.log(`Agent turn ${this.agentTurnCount} of ${this.maxTurns} with agent type: ${this.currentAgent.getType()}`);
      
      try {
        // Execute the current agent
        const agentResult = await this.currentAgent.run(input, attachments);
        
        // Create assistant message
        const assistantMessage: Message = {
          id: uuidv4(),
          role: "assistant",
          content: agentResult.response || "",
          createdAt: new Date().toISOString(),
          agentType: this.currentAgent.getType(),
          handoffRequest: agentResult.nextAgent ? {
            targetAgent: agentResult.nextAgent,
            reason: agentResult.handoffReason || `The ${this.currentAgent.getType()} agent is handing off to the ${agentResult.nextAgent} agent.`,
            preserveFullHistory: true, // Always preserve full history by default
            additionalContext: agentResult.additionalContext // Pass additional context forward
          } : undefined,
          structured_output: agentResult.structured_output,
          continuityData: agentResult.nextAgent ? {
            fromAgent: this.currentAgent.getType(),
            toAgent: agentResult.nextAgent,
            reason: agentResult.handoffReason || "Specialized handling required",
            timestamp: new Date().toISOString(),
            preserveHistory: true,
            additionalContext: agentResult.additionalContext || {}
          } : undefined
        };
        
        // Add assistant message to conversation history
        this.context.metadata.conversationHistory.push(assistantMessage);
        
        // Notify of new message
        this.callbacks.onMessage(assistantMessage);
        
        // Handle handoff if requested
        if (agentResult.nextAgent) {
          const fromAgent = this.currentAgent.getType();
          const toAgent = agentResult.nextAgent as AgentType;
          const handoffReason = agentResult.handoffReason || `The ${fromAgent} agent is handing off to the ${toAgent} agent.`;
          
          console.log(`Handoff requested from ${fromAgent} to ${toAgent}: ${handoffReason}`);
          this.callbacks.onHandoffStart(fromAgent, toAgent, handoffReason);
          
          // Track handoff history
          this.handoffHistory.push({ from: fromAgent, to: toAgent, reason: handoffReason });
          
          // Update context for handoff
          this.context.metadata.isHandoffContinuation = true;
          this.context.metadata.previousAgentType = fromAgent;
          this.context.metadata.handoffReason = handoffReason;
          this.context.metadata.handoffHistory = [...this.handoffHistory];
          
          // Enhanced: Add the continuity data to the context
          const continuityData: ContinuityData = {
            fromAgent,
            toAgent,
            reason: handoffReason,
            timestamp: new Date().toISOString(),
            preserveHistory: true,
            additionalContext: agentResult.additionalContext || {}
          };
          
          this.context.metadata.continuityData = continuityData;
          
          console.log("Handoff continuity data:", continuityData);
          
          // Switch to new agent
          this.currentAgent = this.createAgent(toAgent);
          
          // Wait a moment before continuing with the next agent to allow UI updates
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Notify that handoff is complete
          this.callbacks.onHandoffEnd(toAgent);
          
          // Use enhanced input for the new agent
          if (toAgent === 'script') {
            // Add explicit instruction for script agent
            input = `${input}\n\n[IMPORTANT: You are the script writer. The user is expecting you to write a complete script. Don't just talk about it - WRITE THE SCRIPT NOW.]`;
          } else if (toAgent === 'image') {
            // Add explicit instruction for image agent
            input = `${input}\n\n[IMPORTANT: You are the image generator. The user is expecting detailed image prompts. Don't just talk about it - WRITE THE IMAGE PROMPTS NOW.]`;
          } else if (toAgent === 'scene') {
            // Add explicit instruction for scene agent
            input = `${input}\n\n[IMPORTANT: You are the scene creator. The user is expecting detailed scene descriptions. Write detailed and visual scene descriptions that can be used to generate images.]`;
          }
          
          // Continue with the loop, using the same input but with the new agent
          continue;
        }
        
        // Handle tool execution if applicable
        if (assistantMessage.tool_name && assistantMessage.tool_arguments) {
          const toolName = assistantMessage.tool_name;
          const toolParams = typeof assistantMessage.tool_arguments === 'string' 
            ? JSON.parse(assistantMessage.tool_arguments) 
            : assistantMessage.tool_arguments;
          
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
