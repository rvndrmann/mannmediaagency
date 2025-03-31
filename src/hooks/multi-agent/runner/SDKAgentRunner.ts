
import { AgentType, RunnerContext, RunnerCallbacks, AgentResult } from "./types";
import { v4 as uuidv4 } from "uuid";
import { initializeTrace, finalizeTrace } from "@/utils/openai-traces";

/**
 * SDKAgentRunner - A compatibility layer for integrating with OpenAI Agents SDK
 * This implementation will gradually evolve to support the full SDK features
 */
export class SDKAgentRunner {
  private context: RunnerContext;
  private callbacks: RunnerCallbacks;
  private agentTurnCount: number = 0;
  private maxTurns: number = 10;
  private handoffHistory: { from: AgentType, to: AgentType, reason: string }[] = [];
  private isProcessing: boolean = false;
  private traceStartTime: number = 0;
  private processedMessageIds: Set<string> = new Set();
  private traceId: string;
  private currentAgentType: AgentType;

  constructor(
    initialAgentType: AgentType,
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
    this.traceId = uuidv4();
    this.traceStartTime = Date.now();
    this.currentAgentType = initialAgentType;
    
    // Initialize the trace
    this.initializeTrace();
  }

  private async initializeTrace() {
    // If OpenAI tracing is enabled, set up the trace
    if (!this.context.tracingEnabled && typeof window !== 'undefined' && window.fetch) {
      try {
        const traceDetails = {
          trace_id: this.traceId,
          project_id: this.context.metadata?.projectId || 'default_project',
          user_id: this.context.userId || 'anonymous',
          metadata: {
            agent_type: this.currentAgentType,
            application: 'multi-agent-chat',
            sdk_version: '1.0.0' // Placeholder for SDK version
          }
        };
        
        // Log trace initialization
        console.log("Initializing trace with SDK Agent Runner:", traceDetails);
        
        // Send an initial trace event to OpenAI
        const success = await initializeTrace(this.traceId, {
          user_id: this.context.userId,
          conversation_id: this.context.groupId,
          initial_agent: this.currentAgentType,
          application: 'multi-agent-chat',
          project_id: this.context.metadata?.projectId || null,
          sdk: true
        });
        
        if (success) {
          console.log(`Successfully initialized SDK trace with ID: ${this.traceId}`);
        } else {
          console.warn(`Failed to initialize SDK trace with ID: ${this.traceId}`);
        }
      } catch (error) {
        console.error("Error initializing trace:", error);
      }
    }
  }

  /**
   * Process a user input with the current agent
   * @param input The user input to process
   * @returns The agent result
   */
  async processInput(input: string): Promise<AgentResult> {
    if (this.isProcessing) {
      console.warn("Already processing a request, ignoring new input");
      return {
        response: "I'm still processing your previous request, please wait a moment.",
        nextAgent: null
      };
    }

    this.isProcessing = true;
    this.agentTurnCount++;

    try {
      console.log(`[SDK Agent Runner] Processing input with ${this.currentAgentType} agent: ${input.substring(0, 50)}...`);

      // In the future, this will use the OpenAI Agents SDK
      // For now, we're simulating by directly calling the edge function
      const response = await this.callAgentAPI(input);
      
      // Handle handoffs
      if (response.handoff) {
        const { targetAgent, reason } = response.handoff;
        
        // Add to handoff history
        this.handoffHistory.push({
          from: this.currentAgentType,
          to: targetAgent,
          reason
        });
        
        // Notify about handoff
        if (this.callbacks.onHandoff) {
          this.callbacks.onHandoff(this.currentAgentType, targetAgent, reason);
        }
        
        // Update current agent
        this.currentAgentType = targetAgent;
        
        // Update context with handoff info
        this.context.metadata = {
          ...this.context.metadata,
          isHandoffContinuation: true,
          previousAgentType: response.handoff.targetAgent,
          handoffReason: response.handoff.reason,
          handoffHistory: [...this.handoffHistory]
        };
      }

      return response;
    } catch (error) {
      console.error("Error in SDKAgentRunner.processInput:", error);
      return {
        response: "I encountered an error while processing your request. Please try again.",
        nextAgent: null
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Call the agent API (edge function) for a response
   * This will be replaced with SDK calls in the future
   */
  private async callAgentAPI(input: string): Promise<AgentResult> {
    try {
      // For now, use a direct call to the edge function
      // In future phases, this will be replaced with SDK calls
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY || ""}`
          },
          body: JSON.stringify({
            model: this.context.usePerformanceModel ? "gpt-4o-mini" : "gpt-4o",
            messages: [
              {
                role: "system",
                content: this.getSystemPromptForAgent(this.currentAgentType)
              },
              { role: "user", content: input }
            ],
            tools: this.getToolsForAgent(),
            tool_choice: "auto"
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API call failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Parse response
      let result: AgentResult;
      
      // Check for tool calls
      if (data.choices[0]?.message?.tool_calls?.length > 0) {
        const toolCall = data.choices[0].message.tool_calls[0];
        
        // Check if it's a handoff
        if (toolCall.function.name.startsWith("transfer_to_")) {
          const targetAgent = toolCall.function.name.replace("transfer_to_", "").replace("_agent", "") as AgentType;
          const args = JSON.parse(toolCall.function.arguments || "{}");
          
          result = {
            response: `I'll transfer you to our ${this.getAgentName(targetAgent)} who can better assist with this. ${args.reason || ""}`,
            handoff: {
              targetAgent,
              reason: args.reason || `Transferring to ${targetAgent} agent for specialized assistance`,
              additionalContext: args.additionalContext || {}
            },
            // Add compatibility fields
            handoffReason: args.reason,
            nextAgent: targetAgent,
            additionalContext: args.additionalContext || {}
          };
        } else {
          // Handle other tool calls in the future
          result = {
            response: data.choices[0].message.content || "I need to use a tool to help with your request.",
            nextAgent: null
          };
        }
      } else {
        // Regular text response
        result = {
          response: data.choices[0].message.content || "I'm not sure how to respond to that.",
          nextAgent: null
        };
      }
      
      return result;
    } catch (error) {
      console.error("Error in callAgentAPI:", error);
      return {
        response: "I encountered an error while processing your request. Please try again.",
        nextAgent: null
      };
    }
  }

  /**
   * Get appropriate system prompt for each agent type
   */
  private getSystemPromptForAgent(agentType: AgentType): string {
    switch (agentType) {
      case "main":
        return "You are a helpful AI assistant focused on general tasks.";
      case "script":
        return "You specialize in writing scripts and creative content.";
      case "image":
        return "You specialize in creating detailed image prompts.";
      case "tool":
        return "You specialize in executing tools and technical tasks.";
      case "scene":
        return "You specialize in creating detailed visual scene descriptions.";
      case "data":
        return "You specialize in data analysis and processing.";
      default:
        return "You are a helpful AI assistant.";
    }
  }

  /**
   * Get tools appropriate for the current agent type
   */
  private getToolsForAgent(): any[] {
    // Common handoff tools
    return [
      {
        type: "function",
        function: {
          name: "transfer_to_main_agent",
          description: "Transfer the conversation to the main assistant agent for general help",
          parameters: {
            type: "object",
            properties: {
              reason: {
                type: "string",
                description: "The reason for transferring to the main assistant"
              }
            },
            required: ["reason"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "transfer_to_script_agent",
          description: "Transfer to the script writer agent for creating or editing scripts",
          parameters: {
            type: "object",
            properties: {
              reason: {
                type: "string",
                description: "The reason for transferring to the script writer"
              },
              additionalContext: {
                type: "object",
                description: "Additional context to provide to the script writer",
                properties: {
                  scriptType: {
                    type: "string",
                    description: "The type of script to create (e.g., video, advertisement, etc.)"
                  }
                }
              }
            },
            required: ["reason"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "transfer_to_image_agent",
          description: "Transfer to the image generator agent for creating visual content",
          parameters: {
            type: "object",
            properties: {
              reason: {
                type: "string",
                description: "The reason for transferring to the image generator"
              }
            },
            required: ["reason"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "transfer_to_tool_agent",
          description: "Transfer to the tool agent for using specialized tools",
          parameters: {
            type: "object",
            properties: {
              reason: {
                type: "string",
                description: "The reason for transferring to the tool agent"
              },
              toolName: {
                type: "string",
                description: "The specific tool to use"
              }
            },
            required: ["reason"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "transfer_to_scene_agent",
          description: "Transfer to the scene creator agent for planning and creating visual scenes",
          parameters: {
            type: "object",
            properties: {
              reason: {
                type: "string",
                description: "The reason for transferring to the scene creator agent"
              }
            },
            required: ["reason"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "transfer_to_data_agent",
          description: "Transfer to the data agent for data analysis and processing",
          parameters: {
            type: "object",
            properties: {
              reason: {
                type: "string",
                description: "The reason for transferring to the data agent"
              }
            },
            required: ["reason"]
          }
        }
      }
    ];
  }

  /**
   * Get human-readable agent name
   */
  private getAgentName(agentType: AgentType): string {
    switch (agentType) {
      case "main": return "Assistant";
      case "script": return "Script Writer";
      case "image": return "Image Generator";
      case "tool": return "Tool Specialist";
      case "scene": return "Scene Creator";
      case "data": return "Data Agent";
      default: return "Specialist";
    }
  }
  
  /**
   * Get the current agent type
   */
  getCurrentAgent(): AgentType {
    return this.currentAgentType;
  }
  
  /**
   * Get the trace ID
   */
  getTraceId(): string {
    return this.traceId;
  }
  
  /**
   * Set callbacks for the runner
   */
  setCallbacks(callbacks: RunnerCallbacks): void {
    this.callbacks = callbacks;
  }
}
