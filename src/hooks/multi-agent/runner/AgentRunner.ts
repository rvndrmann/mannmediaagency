
import { AgentRegistry } from "./AgentRegistry";
import { BaseAgent, AgentType, AgentOptions } from "./types";
import { Attachment, Message } from "@/types/message";
import { v4 as uuidv4 } from "uuid";
import { ToolContext, AgentConfig } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { HandoffInputData } from "../handoff/types";
import { createHandoffInputData, handoffFilters } from "../handoff/handoff";

export interface AgentRunnerCallbacks {
  onMessage: (message: Message) => void;
  onError: (error: string) => void;
  onHandoffStart?: (fromAgent: AgentType, toAgent: AgentType, reason: string) => void;
  onHandoffEnd?: (toAgent: AgentType) => void;
  onToolExecution?: (toolName: string, params: any) => void;
}

export class AgentRunner {
  private agentType: AgentType;
  private context: ToolContext;
  private callbacks: AgentRunnerCallbacks;
  private agent: BaseAgent | null = null;
  private conversationHistory: Message[] = [];
  private maxTurns: number = 5; // Prevent infinite loops
  private currentTurn: number = 0;

  constructor(
    agentType: AgentType,
    contextData: Partial<ToolContext>,
    callbacks: AgentRunnerCallbacks
  ) {
    this.agentType = agentType;
    this.context = this.createToolContext(contextData);
    this.callbacks = callbacks;
    this.initializeAgent();
    
    // If contextData has conversation history, initialize it
    if (contextData.metadata?.conversationHistory) {
      this.conversationHistory = [...contextData.metadata.conversationHistory];
      console.log(`AgentRunner initialized with ${this.conversationHistory.length} historical messages`);
    }
  }

  private createToolContext(contextData: Partial<ToolContext>): ToolContext {
    const addMessage = (text: string, type: string, attachments?: Attachment[]) => {
      const message: Message = {
        id: uuidv4(),
        role: type as any,
        content: text,
        createdAt: new Date().toISOString(),
        attachments: attachments
      };
      this.conversationHistory.push(message);
      this.callbacks.onMessage(message);
      return message;
    };

    const toolAvailable = (toolName: string) => {
      return true;
    };

    const executeTool = async (toolName: string, params: any) => {
      console.log(`Executing tool: ${toolName} with params:`, params);
      if (this.callbacks.onToolExecution) {
        this.callbacks.onToolExecution(toolName, params);
      }
      return {
        success: true,
        message: `Tool ${toolName} executed successfully`,
        data: { result: "Tool execution result would go here" }
      };
    };

    return {
      supabase,
      userId: contextData.metadata?.userId || "",
      usePerformanceModel: contextData.usePerformanceModel || false,
      enableDirectToolExecution: contextData.enableDirectToolExecution || false,
      tracingDisabled: contextData.tracingDisabled || false,
      metadata: {
        ...(contextData.metadata || {}),
        conversationHistory: this.conversationHistory
      },
      runId: contextData.runId || uuidv4(),
      groupId: contextData.groupId || uuidv4(),
      addMessage,
      toolAvailable,
      executeTool,
      ...contextData
    };
  }

  private initializeAgent() {
    try {
      const AgentClass = AgentRegistry.getAgent(this.agentType);
      if (!AgentClass) {
        throw new Error(`Agent type "${this.agentType}" not found in registry`);
      }

      const config: AgentConfig = {
        name: this.agentType,
        instructions: this.getAgentInstructions(this.agentType),
        modelName: this.context.usePerformanceModel ? "gpt-4o-mini" : "gpt-4o",
        handoffs: this.getAgentHandoffs(this.agentType)
      };

      const options: AgentOptions = {
        config,
        context: this.context
      };

      this.agent = new AgentClass(options);
      console.log(`Agent initialized: ${this.agentType}`);
    } catch (error) {
      console.error("Error initializing agent:", error);
      this.callbacks.onError(`Failed to initialize ${this.agentType} agent: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private getAgentInstructions(agentType: AgentType): string {
    const handoffInstructions = `
    You can transfer the conversation to a specialized agent when appropriate:
    - Script Writer agent: For writing scripts, creative content, or narratives
    - Image Prompt agent: For generating detailed image descriptions
    - Tool agent: For executing tools and performing technical tasks
    - Scene Creator agent: For creating detailed visual scene descriptions
    
    ONLY transfer to another agent when the user's request clearly matches their specialty.
    `;

    const baseInstructions: Record<AgentType, string> = {
      main: `You are a helpful AI assistant that can analyze user requests and provide assistance or delegate to specialized agents.
      
      ${handoffInstructions}
      
      Be professional, friendly, and helpful. Always consider the user's needs and provide the most helpful response possible.`,
      
      script: `You are a professional script writer who can create compelling narratives, ad scripts, and other written content.
      
      Focus on engaging dialogue, effective storytelling, and proper formatting for scripts. Consider the target audience, medium, and purpose of the script.
      
      ${handoffInstructions}
      
      Be creative, but also practical. Consider the feasibility of production for any scripts you create.`,
      
      image: `You are an expert at creating detailed image prompts for generating visual content.
      
      Focus on these key aspects when creating image prompts:
      - Visual details: describe colors, lighting, composition, perspective
      - Style: specify art style, medium, technique, or artistic influence
      - Mood and atmosphere: convey the feeling or emotion of the image
      - Subject focus: clearly describe the main subject and any background elements
      
      ${handoffInstructions}
      
      Help users refine their ideas into clear, specific prompts that will generate impressive images.`,
      
      tool: `You are a technical tool specialist. Guide users through using various tools and APIs. Provide clear instructions and help troubleshoot issues.
      
      When helping with tools:
      - Explain what the tool does and when to use it
      - Provide step-by-step instructions for using the tool
      - Suggest appropriate parameters or settings
      - Help interpret the tool's output or results
      
      ${handoffInstructions}
      
      Be technical but accessible. Use clear language and explain complex concepts in understandable terms.`,
      
      scene: `You are a scene creation expert. Help users visualize and describe detailed environments and settings for creative projects.
      
      When crafting scene descriptions, focus on:
      - Sensory details: what can be seen, heard, smelled, felt in the scene
      - Spatial relationships: layout, distances, positioning of elements
      - Atmosphere and mood: lighting, weather, time of day, emotional tone
      - Key elements: important objects, features, or characters in the scene
      
      ${handoffInstructions}
      
      Create vivid, immersive scenes that help bring the user's vision to life.`
    };

    return baseInstructions[agentType] || baseInstructions.main;
  }

  private getAgentHandoffs(agentType: AgentType): Array<any> {
    const allAgentTypes: AgentType[] = ['main', 'script', 'image', 'tool', 'scene'];
    const availableHandoffs = allAgentTypes.filter(type => type !== agentType);

    return availableHandoffs.map(targetAgent => ({
      targetAgent,
      reason: `The ${agentType} agent recommended transitioning to the ${targetAgent} agent.`,
      toolName: `transfer_to_${targetAgent}_agent`,
      toolDescription: `Transfer the conversation to the ${targetAgent} agent when the user's request requires specialized handling in that domain.`,
      preserveContext: true
    }));
  }

  private createUserMessage(input: string, attachments: Attachment[]): Message {
    const message: Message = {
      id: uuidv4(),
      role: "user",
      content: input,
      createdAt: new Date().toISOString(),
      attachments: attachments.length > 0 ? attachments : undefined
    };
    
    this.conversationHistory.push(message);
    return message;
  }

  private createAssistantMessage(agentType: AgentType): Message {
    const message: Message = {
      id: uuidv4(),
      role: "assistant",
      content: `I'm analyzing your request...`,
      createdAt: new Date().toISOString(),
      agentType: agentType,
      status: "thinking"
    };
    
    this.conversationHistory.push(message);
    return message;
  }

  /**
   * Process a handoff from one agent to another
   * Implements the agent loop pattern
   */
  public async handleHandoff(fromAgent: AgentType, toAgent: AgentType, reason: string, additionalContext?: Record<string, any>): Promise<void> {
    console.log(`Handling handoff from ${fromAgent} to ${toAgent}: ${reason}`);
    
    try {
      // Update turn counter
      this.currentTurn++;
      
      if (this.currentTurn >= this.maxTurns) {
        throw new Error("Maximum number of agent turns exceeded. Possible infinite handoff loop detected.");
      }
      
      if (this.callbacks.onHandoffStart) {
        this.callbacks.onHandoffStart(fromAgent, toAgent, reason);
      }
      
      // Create handoff input data with the full conversation history
      const historyContent = this.conversationHistory.map(msg => msg.content);
      const preHandoffItems = this.conversationHistory.slice(0, -2);
      const newItems = this.conversationHistory.slice(-2);
      
      // Create comprehensive input data for the handoff
      let inputData = createHandoffInputData(
        historyContent,
        preHandoffItems,
        newItems,
        {
          previousAgentType: fromAgent,
          handoffReason: reason,
          isHandoffContinuation: true,
          ...additionalContext
        }
      );
      
      // Apply default input filters
      inputData = handoffFilters.addContinuityContext(fromAgent)(inputData);
      
      // Update agent type and context
      this.agentType = toAgent;
      
      // Update context with handoff information
      this.context.metadata = {
        ...this.context.metadata,
        previousAgentType: fromAgent,
        handoffReason: reason,
        isHandoffContinuation: true,
        conversationId: this.context.groupId,
        conversationHistory: this.conversationHistory, // Pass full conversation history
        ...(additionalContext || {})
      };
      
      console.log(`Re-initializing with new agent type: ${toAgent}`);
      
      // Re-initialize with the new agent type
      this.initializeAgent();
      
      // Create a system message explaining the handoff
      const handoffSystemMessage: Message = {
        id: uuidv4(),
        role: "system",
        content: `Conversation transferred from ${fromAgent} agent to ${toAgent} agent: ${reason}`,
        createdAt: new Date().toISOString(),
        type: "handoff"
      };
      
      this.conversationHistory.push(handoffSystemMessage);
      this.callbacks.onMessage(handoffSystemMessage);
      
      // Extract the last user message to continue processing with the new agent
      const lastUserMessageIndex = this.conversationHistory
        .map((msg, i) => ({ msg, i }))
        .filter(item => item.msg.role === "user")
        .pop();
      
      if (lastUserMessageIndex) {
        const lastUserMessage = this.conversationHistory[lastUserMessageIndex.i];
        
        // Create a new assistant message for the target agent
        const assistantMessage = this.createAssistantMessage(toAgent);
        this.callbacks.onMessage(assistantMessage);
        
        try {
          console.log(`Running ${toAgent} agent with input: ${lastUserMessage.content.substring(0, 100)}...`);
          
          // Add handoff context to input
          let agentInput = lastUserMessage.content;
          const contextPrefix = `[Conversation continuation from ${fromAgent} agent: ${reason}]\n\n`;
          agentInput = contextPrefix + agentInput;
          
          // Run the new agent with the last user message
          if (!this.agent) {
            throw new Error("Agent not initialized after handoff");
          }
          
          const agentResult = await this.agent.run(agentInput, lastUserMessage.attachments || []);
          
          console.log(`${toAgent} agent result:`, agentResult);
          
          // Update the assistant message with the agent response
          const updatedAssistantMessage: Message = {
            ...assistantMessage,
            content: agentResult.response || "",
            status: "completed",
            handoffRequest: agentResult.nextAgent ? {
              targetAgent: agentResult.nextAgent,
              reason: `The ${toAgent} agent recommended transitioning to the ${agentResult.nextAgent} agent.`,
              preserveFullHistory: true
            } : undefined
          };
          
          // Update conversation history
          this.conversationHistory = this.conversationHistory.map(msg => 
            msg.id === assistantMessage.id ? updatedAssistantMessage : msg
          );
          
          this.callbacks.onMessage(updatedAssistantMessage);
          
          // Handle any further handoffs if needed (implements agent loop pattern)
          if (agentResult.nextAgent) {
            console.log(`Further handoff to ${agentResult.nextAgent} agent`);
            await this.handleHandoff(
              toAgent,
              agentResult.nextAgent as AgentType,
              `The ${toAgent} agent recommended transitioning to the ${agentResult.nextAgent} agent.`
            );
          }
        } catch (error) {
          console.error(`Error running ${toAgent} agent after handoff:`, error);
          
          const errorMessage: Message = {
            ...assistantMessage,
            content: `Sorry, I encountered an error after the handoff: ${error instanceof Error ? error.message : String(error)}`,
            status: "error"
          };
          
          this.conversationHistory = this.conversationHistory.map(msg => 
            msg.id === assistantMessage.id ? errorMessage : msg
          );
          
          this.callbacks.onMessage(errorMessage);
          this.callbacks.onError(`Agent execution error after handoff: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      if (this.callbacks.onHandoffEnd) {
        this.callbacks.onHandoffEnd(toAgent);
      }
    } catch (error) {
      console.error("Error in handleHandoff:", error);
      this.callbacks.onError(`Handoff error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      // Reset turn counter when handoff process is complete
      this.currentTurn = 0;
    }
  }

  /**
   * Main entry point to run the agent
   * Implements the agent loop pattern
   */
  public async run(input: string, attachments: Attachment[] = [], userId: string): Promise<void> {
    try {
      if (!this.agent) {
        throw new Error("Agent not initialized");
      }
      
      // Reset turn counter at the start of a new run
      this.currentTurn = 0;
      
      console.log(`Running ${this.agentType} agent with input:`, input);
      
      const userMessage = this.createUserMessage(input, attachments);
      this.callbacks.onMessage(userMessage);
      
      // Update context with latest conversation history
      this.context.metadata = {
        ...this.context.metadata,
        conversationHistory: this.conversationHistory
      };
      
      const assistantMessage = this.createAssistantMessage(this.agentType);
      this.callbacks.onMessage(assistantMessage);
      
      try {
        console.log(`Calling agent.run with input and ${attachments.length} attachments`);
        
        const isHandoffContinuation = this.context.metadata?.isHandoffContinuation === true;
        
        let agentInput = input;
        if (isHandoffContinuation && this.conversationHistory.length > 2) {
          const contextPrefix = `[Conversation continuation from ${this.context.metadata?.previousAgentType || 'previous'} agent: ${this.context.metadata?.handoffReason || 'Not specified'}]\n\n`;
          agentInput = contextPrefix + input;
          
          console.log("Including handoff context in agent input");
        }
        
        // Execute the agent
        const agentResult = await this.agent.run(agentInput, attachments);
        console.log(`Agent result:`, agentResult);
        
        const updatedAssistantMessage: Message = {
          ...assistantMessage,
          content: agentResult.response || "",
          status: "completed",
          handoffRequest: agentResult.nextAgent ? {
            targetAgent: agentResult.nextAgent,
            reason: `The ${this.agentType} agent recommended transitioning to the ${agentResult.nextAgent} agent.`,
            preserveFullHistory: true
          } : undefined
        };
        
        if (agentResult.structured_output) {
          (updatedAssistantMessage as any).structured_output = agentResult.structured_output;
        }
        
        this.conversationHistory = this.conversationHistory.map(msg => 
          msg.id === assistantMessage.id ? updatedAssistantMessage : msg
        );
        
        this.callbacks.onMessage(updatedAssistantMessage);
        
        // Implement agent loop pattern: if handoff is requested, continue execution flow
        if (agentResult.nextAgent) {
          console.log(`Handling handoff to ${agentResult.nextAgent} agent`);
          
          // Increase the turn counter
          this.currentTurn++;
          
          if (this.currentTurn < this.maxTurns) {
            await this.handleHandoff(
              this.agentType,
              agentResult.nextAgent as AgentType,
              `The ${this.agentType} agent recommended transitioning to the ${agentResult.nextAgent} agent.`
            );
          } else {
            console.warn("Maximum number of agent turns exceeded. Stopping handoff chain.");
            this.callbacks.onError("Maximum number of agent turns exceeded. Possible infinite handoff loop detected.");
          }
        }
      } catch (error) {
        console.error(`Error running ${this.agentType} agent:`, error);
        
        const errorMessage: Message = {
          ...assistantMessage,
          content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : String(error)}`,
          status: "error"
        };
        
        this.conversationHistory = this.conversationHistory.map(msg => 
          msg.id === assistantMessage.id ? errorMessage : msg
        );
        
        this.callbacks.onMessage(errorMessage);
        this.callbacks.onError(`Agent execution error: ${error instanceof Error ? error.message : String(error)}`);
      }
    } catch (error) {
      console.error("AgentRunner run error:", error);
      this.callbacks.onError(`AgentRunner error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
