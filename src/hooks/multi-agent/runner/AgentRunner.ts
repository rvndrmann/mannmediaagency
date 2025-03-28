
import { AgentRegistry } from "./AgentRegistry";
import { BaseAgent, AgentType, AgentOptions } from "./types";
import { Attachment, Message } from "@/types/message";
import { v4 as uuidv4 } from "uuid";
import { ToolContext, AgentConfig } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { HandoffInputData } from "../handoff/types";

// Callback interfaces
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
      this.conversationHistory.push(message);
      this.callbacks.onMessage(message);
      return message;
    };
    
    // Create the tool availability check function
    const toolAvailable = (toolName: string) => {
      // In a real implementation, this would check if the tool is available
      return true;
    };
    
    // Create a tool execution function
    const executeTool = async (toolName: string, params: any) => {
      console.log(`Executing tool: ${toolName} with params:`, params);
      if (this.callbacks.onToolExecution) {
        this.callbacks.onToolExecution(toolName, params);
      }
      
      // Here we'd implement actual tool execution
      // For now, just return a success message
      return {
        success: true,
        message: `Tool ${toolName} executed successfully`,
        data: { result: "Tool execution result would go here" }
      };
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
      executeTool,
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
        modelName: this.context.usePerformanceModel ? "gpt-4o-mini" : "gpt-4o",
        handoffs: this.getAgentHandoffs(this.agentType)
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
    // Don't add handoffs to an agent type to itself
    const allAgentTypes: AgentType[] = ['main', 'script', 'image', 'tool', 'scene'];
    const availableHandoffs = allAgentTypes.filter(type => type !== agentType);
    
    // Create handoff configurations for each available agent type
    return availableHandoffs.map(targetAgent => ({
      targetAgent,
      reason: `The ${agentType} agent recommended transitioning to the ${targetAgent} agent.`,
      toolName: `transfer_to_${targetAgent}_agent`,
      toolDescription: `Transfer the conversation to the ${targetAgent} agent when the user's request requires specialized handling in that domain.`,
      preserveContext: true
    }));
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
  
  // Handle handoff between agents
  public async handleHandoff(fromAgent: AgentType, toAgent: AgentType, reason: string, context?: Record<string, any>): Promise<void> {
    console.log(`Handling handoff from ${fromAgent} to ${toAgent}: ${reason}`);
    
    if (this.callbacks.onHandoffStart) {
      this.callbacks.onHandoffStart(fromAgent, toAgent, reason);
    }
    
    // Preserve conversation history for the new agent
    const inputData: HandoffInputData = {
      inputHistory: this.conversationHistory.map(msg => msg.content),
      preHandoffItems: this.conversationHistory.slice(0, -2), // All but the last two messages
      newItems: this.conversationHistory.slice(-2), // Last two messages - user request and agent response
      get allItems() {
        return [...this.preHandoffItems, ...this.newItems];
      }
    };
    
    // Filter input data if needed (not implemented yet)
    // const filteredData = inputFilter ? inputFilter(inputData) : inputData;
    
    // Update agent type
    this.agentType = toAgent;
    
    // Update metadata to track handoff
    this.context.metadata = {
      ...this.context.metadata,
      previousAgentType: fromAgent,
      handoffReason: reason,
      isHandoffContinuation: true
    };
    
    // Reinitialize with the new agent type
    this.initializeAgent();
    
    // Notify about handoff completion
    if (this.callbacks.onHandoffEnd) {
      this.callbacks.onHandoffEnd(toAgent);
    }
  }

  public async run(input: string, attachments: Attachment[] = [], userId: string): Promise<void> {
    try {
      if (!this.agent) {
        throw new Error("Agent not initialized");
      }
      
      console.log(`Running ${this.agentType} agent with input:`, input);
      
      // Create and emit the user message
      const userMessage = this.createUserMessage(input, attachments);
      this.conversationHistory.push(userMessage);
      this.callbacks.onMessage(userMessage);
      
      // Create and emit the assistant message
      const assistantMessage = this.createAssistantMessage(this.agentType);
      this.conversationHistory.push(assistantMessage);
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
        
        // Update conversation history with updated message
        this.conversationHistory = this.conversationHistory.map(msg => 
          msg.id === assistantMessage.id ? updatedAssistantMessage : msg
        );
        
        this.callbacks.onMessage(updatedAssistantMessage);
        
        // Handle handoff if present
        if (agentResult.nextAgent) {
          console.log(`Handling handoff to ${agentResult.nextAgent} agent`);
          await this.handleHandoff(
            this.agentType,
            agentResult.nextAgent as AgentType,
            `The ${this.agentType} agent recommended transitioning to the ${agentResult.nextAgent} agent.`
          );
        }
      } catch (error) {
        console.error(`Error running ${this.agentType} agent:`, error);
        
        // Update the assistant message with the error
        const errorMessage: Message = {
          ...assistantMessage,
          content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : String(error)}`,
          status: "error"
        };
        
        // Update conversation history with error message
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
