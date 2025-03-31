
import { 
  AgentResult, 
  AgentStreamEvent, 
  AgentType, 
  RunnerCallbacks, 
  RunnerContext, 
  SDKAgentDefinition, 
  SDKAgentOptions, 
  SDKHandoffDefinition, 
  SDKRunner, 
  SDKTool 
} from "../runner/types";
import { v4 as uuidv4 } from "uuid";
import { ToolConverter } from "./ToolConverter";
import { canvasDataTool } from "../tools/canvas-data-tool";
import { sdkCanvasDataTool } from "./tools/SdkCanvasDataTool";

export class SDKAgentRunner implements SDKRunner {
  private agentDefinitions: Map<AgentType, SDKAgentDefinition> = new Map();
  private currentAgentType: AgentType = "main";
  private traceId: string;
  private callbacks: RunnerCallbacks = {};
  private streamEvents: AgentStreamEvent[] = [];

  constructor(private options: SDKAgentOptions = {}) {
    this.traceId = uuidv4();
  }

  /**
   * Initialize the SDK Agent Runner with default agents and tools
   */
  async initialize(): Promise<void> {
    // Register the data agent
    this.registerAgent("data", {
      name: "Data Agent",
      instructions: "You are a Data Agent specialized in data analysis and processing. You excel at understanding, transforming, and visualizing data. You can help with data cleaning, statistical analysis, chart creation, and data interpretation.",
      tools: [sdkCanvasDataTool],
      handoffs: [
        {
          targetAgent: "main",
          description: "Transfer to the main assistant for general help",
          when: ["The user needs general assistance outside of data analysis"]
        },
        {
          targetAgent: "script",
          description: "Transfer to the script writer for creating content",
          when: ["The user wants to create or edit scripts"]
        }
      ]
    });

    // Register the main agent (placeholder)
    this.registerAgent("main", {
      name: "Main Assistant",
      instructions: "You are the main assistant, able to help with general questions and coordinate with specialized agents.",
      handoffs: [
        {
          targetAgent: "data",
          description: "Transfer to the data agent for data analysis",
          when: ["The user has questions about data analysis", "The user needs to visualize data"]
        }
      ]
    });

    console.log("SDK Agent Runner initialized with default agents");
  }

  /**
   * Register an agent definition
   */
  registerAgent(type: AgentType, definition: SDKAgentDefinition): void {
    this.agentDefinitions.set(type, {
      ...definition,
      model: definition.model || this.options.model || "gpt-4o-mini"
    });
    console.log(`Registered agent type: ${type}`);
  }

  /**
   * Set callbacks for the runner
   */
  setCallbacks(callbacks: RunnerCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Process user input and return agent result
   */
  async processInput(input: string, context: RunnerContext = { history: [] }): Promise<AgentResult> {
    try {
      const currentAgent = this.agentDefinitions.get(this.currentAgentType);
      
      if (!currentAgent) {
        throw new Error(`Agent type ${this.currentAgentType} not registered`);
      }

      // Add thinking event to stream
      this.addStreamEvent({
        type: 'thinking',
        agentType: this.currentAgentType,
        timestamp: Date.now(),
      });

      // Mock API call for now - in Phase 2 we'll implement the actual OpenAI Agents SDK call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // For now, we'll simulate a direct response for data agent
      if (this.currentAgentType === "data") {
        const response: AgentResult = {
          output: `[SDK ${currentAgent.name}] I'm analyzing your request about "${input.substring(0, 30)}...". Let me help with that.`
        };

        // Add message event to stream
        this.addStreamEvent({
          type: 'message',
          content: response.output,
          agentType: this.currentAgentType,
          timestamp: Date.now(),
        });

        return response;
      }

      // For other agents, we'll simulate a handoff to the data agent
      if (input.toLowerCase().includes("data") && this.currentAgentType !== "data") {
        const handoffReason = "Your question seems to be about data analysis. Let me transfer you to our Data Specialist.";
        
        // Add handoff event to stream
        this.addStreamEvent({
          type: 'handoff',
          content: handoffReason,
          agentType: this.currentAgentType,
          handoffTarget: "data",
          handoffReason,
          timestamp: Date.now(),
        });

        // Notify about handoff
        if (this.callbacks.onHandoff) {
          this.callbacks.onHandoff(this.currentAgentType, "data", handoffReason);
        }

        // Update current agent
        this.currentAgentType = "data";

        // Process with new agent
        return this.processInput(input, context);
      }

      // Default response
      const response: AgentResult = {
        output: `[SDK ${currentAgent.name}] I can help with "${input.substring(0, 30)}...". What specific information do you need?`
      };

      // Add message event to stream
      this.addStreamEvent({
        type: 'message',
        content: response.output,
        agentType: this.currentAgentType,
        timestamp: Date.now(),
      });

      // Complete event
      this.addStreamEvent({
        type: 'complete',
        timestamp: Date.now(),
      });

      return response;
    } catch (error) {
      console.error("Error in SDK Agent Runner:", error);
      
      // Add error event to stream
      this.addStreamEvent({
        type: 'error',
        content: error instanceof Error ? error.message : "Unknown error occurred",
        timestamp: Date.now(),
      });
      
      return {
        output: "I encountered an error processing your request. Please try again later."
      };
    }
  }

  /**
   * Get current agent type
   */
  getCurrentAgent(): AgentType {
    return this.currentAgentType;
  }

  /**
   * Get trace ID
   */
  getTraceId(): string {
    return this.traceId;
  }

  /**
   * Get stream events and clear the buffer
   */
  getStreamEvents(): AgentStreamEvent[] {
    const events = [...this.streamEvents];
    this.streamEvents = [];
    return events;
  }

  /**
   * Add an event to the stream
   */
  private addStreamEvent(event: AgentStreamEvent): void {
    this.streamEvents.push(event);
  }

  /**
   * Convert standard tools to SDK tools
   */
  private convertToolsToSDK(tools: any[]): SDKTool[] {
    return tools.map(tool => {
      if ('execute' in tool && 'parameters' in tool) {
        return ToolConverter.convertToSDKTool(tool);
      }
      return tool as SDKTool;
    });
  }
}
