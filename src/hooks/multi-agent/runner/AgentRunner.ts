
import { v4 as uuidv4 } from "uuid";
import { MainAgent } from "./agents/MainAgent";
import { ScriptWriterAgent } from "./agents/ScriptWriterAgent";
import { ImageGeneratorAgent } from "./agents/ImageGeneratorAgent";
import { ToolAgent } from "./agents/ToolAgent";
import { SceneCreatorAgent } from "./agents/SceneCreatorAgent";
import { BaseAgentImpl } from "./agents/BaseAgentImpl";
import { AgentResult, AgentType, RunnerContext, RunnerCallbacks } from "./types";
import { Attachment, Message, MessageType, ContinuityData } from "@/types/message";
import { supabase } from "@/integrations/supabase/client";

export class AgentRunner {
  private context: RunnerContext;
  private currentAgent: BaseAgentImpl;
  private callbacks: RunnerCallbacks;
  private agentTurnCount: number = 0;
  private maxTurns: number = 7; // Increased max turns
  private handoffHistory: { from: AgentType, to: AgentType, reason: string }[] = [];
  private isProcessing: boolean = false; // Add flag to prevent duplicate requests
  private traceStartTime: number = 0;
  private processedMessageIds: Set<string> = new Set(); // Track processed message IDs
  private traceId: string;

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
    this.traceStartTime = Date.now();
    this.traceId = uuidv4();
    
    // Initialize the trace
    this.initializeTrace();
  }

  private initializeTrace() {
    // If OpenAI tracing is enabled, set up the trace here
    if (!this.context.tracingDisabled && typeof window !== 'undefined' && window.fetch) {
      try {
        const traceDetails = {
          trace_id: this.traceId,
          project_id: this.context.projectId || 'default_project',
          user_id: this.context.userId || 'anonymous',
          metadata: {
            agent_type: this.currentAgent.getType(),
            application: 'multi-agent-chat'
          }
        };
        
        // Log trace initialization
        console.log("Initializing trace:", traceDetails);
        
        // You could send an initial trace event to OpenAI here
        // This would require your OpenAI API key with tracing permissions
      } catch (error) {
        console.error("Error initializing trace:", error);
      }
    }
  }

  private createAgent(agentType: AgentType): BaseAgentImpl {
    console.log(`Creating agent of type: ${agentType}`);
    
    const options = { 
      context: this.context,
      traceId: this.traceId // Pass the traceId to agents
    };
    
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
    // Prevent duplicate requests while one is still processing
    if (this.isProcessing) {
      console.log("Already processing a request, ignoring duplicate");
      return;
    }
    
    try {
      this.isProcessing = true;
      console.log(`Running agent with input: ${input.substring(0, 50)}...`);
      this.agentTurnCount = 0;
      this.traceStartTime = Date.now();
      this.processedMessageIds.clear(); // Reset processed message IDs
      
      // Add user message to conversation history
      const userMessage: Message = {
        id: uuidv4(),
        role: "user",
        content: input,
        createdAt: new Date().toISOString(),
        attachments: attachments.length > 0 ? attachments : undefined
      };
      
      // Make sure we don't process this message twice
      this.processedMessageIds.add(userMessage.id);
      
      // Make sure the callbacks onMessage is called for the user message
      this.callbacks.onMessage(userMessage);
      
      // Update conversation history in context
      if (!this.context.metadata.conversationHistory) {
        this.context.metadata.conversationHistory = [];
      }
      
      this.context.metadata.conversationHistory.push(userMessage);
      
      // Record trace event for user input
      this.recordTraceEvent('user_input', {
        message_id: userMessage.id,
        content_length: input.length,
        has_attachments: attachments.length > 0
      });
      
      // Start the agent loop
      await this.runAgentLoop(input, attachments, userId);
      
    } catch (error) {
      console.error("Agent runner error:", error);
      this.callbacks.onError(error instanceof Error ? error.message : "Unknown error");
      
      // Record error in trace
      this.recordTraceEvent('error', {
        error_message: error instanceof Error ? error.message : "Unknown error",
        agent_type: this.currentAgent.getType()
      });
      
      // Log the error in the trace data
      await this.saveTraceData(
        "error", 
        "Error during agent execution", 
        this.context.groupId || uuidv4(),
        {
          error: error instanceof Error ? error.message : "Unknown error",
          agent_type: this.currentAgent.getType(),
          success: false
        }
      );
    } finally {
      this.isProcessing = false;
    }
  }
  
  private recordTraceEvent(eventType: string, eventData: any) {
    if (!this.context.tracingDisabled) {
      try {
        const event = {
          trace_id: this.traceId,
          event_type: eventType,
          timestamp: new Date().toISOString(),
          data: eventData
        };
        
        console.log(`Recording trace event: ${eventType}`, event);
        
        // Here you would send the event to OpenAI's trace endpoint
        // This requires your OpenAI API key with tracing permissions
        // Example endpoint: https://api.openai.com/v1/traces/{traceId}/events
      } catch (error) {
        console.error("Error recording trace event:", error);
      }
    }
  }
  
  private async saveTraceData(
    agent_type: string, 
    user_message: string, 
    runId: string,
    traceMetadata: any
  ): Promise<void> {
    if (!this.context.tracingDisabled && this.context.supabase) {
      try {
        // Calculate total duration
        const duration = Date.now() - this.traceStartTime;
        
        // Create trace summary
        const traceSummary = {
          runId,
          traceId: this.traceId,
          duration,
          agentType: agent_type,
          timestamp: new Date().toISOString(),
          handoffs: this.handoffHistory.length,
          toolCalls: 0, // This would be updated if we tracked tool calls
          messageCount: this.context.metadata.conversationHistory?.length || 0,
          modelUsed: this.context.usePerformanceModel ? "gpt-3.5-turbo" : "gpt-4o",
          success: traceMetadata.error ? false : true
        };
        
        // Save to database if user is authenticated
        if (this.context.supabase && this.context.userId) {
          await this.context.supabase.from('agent_interactions').insert({
            user_id: this.context.userId,
            agent_type,
            user_message,
            assistant_response: traceMetadata.response || "",
            has_attachments: !!traceMetadata.attachments,
            metadata: {
              trace: {
                runId,
                traceId: this.traceId,
                duration,
                timestamp: new Date().toISOString(),
                summary: {
                  handoffs: this.handoffHistory.length,
                  toolCalls: 0,
                  messageCount: this.context.metadata.conversationHistory?.length || 0,
                  modelUsed: this.context.usePerformanceModel ? "gpt-3.5-turbo" : "gpt-4o",
                  success: traceMetadata.error ? false : true
                },
                events: traceMetadata.events || []
              }
            }
          });
        }
      } catch (error) {
        console.error("Error saving trace data:", error);
      }
    }
  }
  
  private async runAgentLoop(input: string, attachments: Attachment[], userId: string): Promise<void> {
    while (this.agentTurnCount < this.maxTurns) {
      this.agentTurnCount++;
      console.log(`Agent turn ${this.agentTurnCount} of ${this.maxTurns} with agent type: ${this.currentAgent.getType()}`);
      
      try {
        // Record trace event for agent start
        this.recordTraceEvent('agent_turn_start', {
          turn: this.agentTurnCount,
          agent_type: this.currentAgent.getType(),
          max_turns: this.maxTurns
        });
        
        // Execute the current agent
        const agentResult = await this.currentAgent.run(input, attachments);
        
        // Record trace event for agent completion
        this.recordTraceEvent('agent_turn_complete', {
          turn: this.agentTurnCount,
          agent_type: this.currentAgent.getType(),
          has_response: !!agentResult.response,
          has_handoff: !!agentResult.nextAgent
        });
        
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
        
        // Check we haven't already processed this message by ID
        if (this.processedMessageIds.has(assistantMessage.id)) {
          console.log("Skipping already processed assistant message with ID:", assistantMessage.id);
          continue;
        }
        
        // Add the message ID to our tracking set
        this.processedMessageIds.add(assistantMessage.id);
        
        // Add assistant message to conversation history
        this.context.metadata.conversationHistory.push(assistantMessage);
        
        // Notify of new message
        this.callbacks.onMessage(assistantMessage);
        
        // Save trace data for this turn
        await this.saveTraceData(
          this.currentAgent.getType(),
          input,
          this.context.groupId || this.context.runId || uuidv4(),
          {
            response: agentResult.response,
            attachments: attachments?.length > 0,
            events: [
              {
                eventType: 'agent_response',
                timestamp: new Date().toISOString(),
                data: {
                  agentType: this.currentAgent.getType(),
                  hasHandoff: !!agentResult.nextAgent,
                  targetAgent: agentResult.nextAgent,
                  handoffReason: agentResult.handoffReason
                }
              }
            ]
          }
        );
        
        // Handle handoff if requested
        if (agentResult.nextAgent) {
          const fromAgent = this.currentAgent.getType();
          const toAgent = agentResult.nextAgent as AgentType;
          const handoffReason = agentResult.handoffReason || `The ${fromAgent} agent is handing off to the ${toAgent} agent.`;
          
          console.log(`Handoff requested from ${fromAgent} to ${toAgent}: ${handoffReason}`);
          this.callbacks.onHandoffStart(fromAgent, toAgent, handoffReason);
          
          // Track handoff history
          this.handoffHistory.push({ from: fromAgent, to: toAgent, reason: handoffReason });
          
          // Record trace event for handoff
          this.recordTraceEvent('handoff', {
            from: fromAgent,
            to: toAgent,
            reason: handoffReason,
            turn: this.agentTurnCount
          });
          
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
          
          // Record trace event for tool execution
          this.recordTraceEvent('tool_execution', {
            tool_name: toolName,
            agent_type: this.currentAgent.getType(),
            turn: this.agentTurnCount
          });
        }
        
        // If we get here, the agent completed successfully without handoff
        return;
        
      } catch (error) {
        console.error(`Error in agent turn ${this.agentTurnCount}:`, error);
        
        // Record trace event for error
        this.recordTraceEvent('agent_turn_error', {
          turn: this.agentTurnCount,
          agent_type: this.currentAgent.getType(),
          error: error instanceof Error ? error.message : "Unknown error"
        });
        
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
        
        // Add to processed messages to avoid duplicates
        this.processedMessageIds.add(errorMessage.id);
        
        this.context.metadata.conversationHistory.push(errorMessage);
        this.callbacks.onMessage(errorMessage);
        
        // Stop after error
        throw error;
      }
    }
    
    throw new Error(`Maximum number of agent turns (${this.maxTurns}) exceeded`);
  }
}
