
import { v4 as uuidv4 } from "uuid";
import { AgentType, RunnerCallbacks, RunnerContext, AgentResult, BaseAgent, BaseAgentImpl } from "./types";
import { SDKRunner } from "../sdk/types";

interface AgentRunnerOptions {
  callbacks?: RunnerCallbacks;
  useSDK?: boolean;
  enableTracing?: boolean;
}

export class AgentRunner {
  private traceId: string = uuidv4();
  private agentHistory: AgentType[] = [];
  private currentAgentType: AgentType = "main";
  private currentInput: string = "";
  private callbacks: RunnerCallbacks = {};
  private useSDK: boolean = false;
  private sdkRunner: SDKRunner | null = null;
  private enableTracing: boolean = false;

  constructor(options: AgentRunnerOptions = {}) {
    if (options.callbacks) {
      this.callbacks = options.callbacks;
    }
    
    this.useSDK = options.useSDK || false;
    this.enableTracing = options.enableTracing || false;
    
    if (this.useSDK) {
      this.initializeSDKRunner();
    }
  }

  private async initializeSDKRunner(): Promise<void> {
    try {
      // Dynamically import to avoid circular dependencies
      const { SDKAgentRunner } = await import("../sdk/SDKAgentRunner");
      this.sdkRunner = new SDKAgentRunner([], {});
      
      if (this.callbacks) {
        this.sdkRunner.setCallbacks(this.callbacks);
      }
      
      await this.sdkRunner.initialize();
      console.log("SDK Runner initialized");
    } catch (error) {
      console.error("Failed to initialize SDK runner:", error);
    }
  }

  public async processInput(input: string, context: RunnerContext): Promise<AgentResult> {
    this.currentInput = input;

    if (this.useSDK && this.sdkRunner) {
      // Use SDK runner if enabled
      try {
        return await this.sdkRunner.processInput(input, context);
      } catch (error) {
        console.error("Error in SDK runner, falling back to standard agents:", error);
        // Fall back to standard agents if SDK fails
      }
    }

    // Use standard agents
    return this.processWithAgent(this.currentAgentType, input, context);
  }

  private getAgent(agentType: AgentType, context: RunnerContext): BaseAgentImpl {
    // Implement a factory method that creates the appropriate agent
    // This is a placeholder - in a real implementation, you would create
    // actual instances of your agent classes
    return new MockAgent({ context, traceId: this.traceId });
  }

  private async processWithAgent(agentType: AgentType, input: string, context: RunnerContext): Promise<AgentResult> {
    const agent = this.getAgent(agentType, context);
    const enrichedContext: RunnerContext = {
      ...context,
      tracingDisabled: !this.enableTracing,
      addMessage: this.enableTracing ? 
        (message: string, type: string) => this.addTraceMessage(message, type) : 
        undefined
    };

    try {
      // Track agent start in history
      if (!this.agentHistory.includes(agentType)) {
        this.agentHistory.push(agentType);
      }

      // Process with the selected agent
      const result = await agent.process(input, enrichedContext);

      // Handle potential handoff
      if (result.nextAgent) {
        const targetAgent = result.nextAgent;
        const reason = result.handoffReason || "Handoff requested";
        
        if (targetAgent && targetAgent !== agentType) {
          // Notify about handoff if callback exists
          if (this.callbacks.onHandoff) {
            this.callbacks.onHandoff(agentType, targetAgent, reason);
          }
          
          if (this.callbacks.onHandoffStart) {
            this.callbacks.onHandoffStart(agentType, targetAgent, reason);
          }

          // Update current agent and process with the new agent
          this.currentAgentType = targetAgent;
          const handoffResult = await this.processWithAgent(
            targetAgent, 
            input, 
            {
              ...enrichedContext,
              metadata: {
                ...enrichedContext.metadata,
                handoffReason: reason,
                previousAgent: agentType,
                additionalContext: result.additionalContext
              }
            }
          );

          if (this.callbacks.onHandoffEnd) {
            this.callbacks.onHandoffEnd(agentType, targetAgent, handoffResult);
          }

          return handoffResult;
        }
      }

      return result;
    } catch (error) {
      console.error(`Error processing with ${agentType} agent:`, error);
      
      // Notify about error if callback exists
      if (this.callbacks.onError) {
        this.callbacks.onError(error as Error);
      }
      
      return {
        output: `The ${this.getAgentName(agentType)} encountered an error. Please try again or ask a different question.`
      };
    }
  }

  private getAgentName(agentType: AgentType): string {
    switch (agentType) {
      case "main": return "Assistant";
      case "script": return "Script Writer";
      case "image": return "Image Generator";
      case "tool": return "Tool Specialist";
      case "scene": return "Scene Creator";
      case "data": return "Data Analyst";
      default: return "Agent";
    }
  }

  public getCurrentAgentType(): AgentType {
    if (this.useSDK && this.sdkRunner) {
      return this.sdkRunner.getCurrentAgent();
    }
    return this.currentAgentType;
  }

  public getAgentHistory(): AgentType[] {
    return [...this.agentHistory];
  }

  public getTraceId(): string {
    if (this.useSDK && this.sdkRunner) {
      return this.sdkRunner.getTraceId();
    }
    return this.traceId;
  }

  public setUseSDK(useSDK: boolean): void {
    if (useSDK !== this.useSDK) {
      this.useSDK = useSDK;
      if (useSDK && !this.sdkRunner) {
        this.initializeSDKRunner();
      }
    }
  }

  public setCallbacks(callbacks: RunnerCallbacks): void {
    this.callbacks = callbacks;
    if (this.sdkRunner) {
      this.sdkRunner.setCallbacks(callbacks);
    }
  }

  public setEnableTracing(enable: boolean): void {
    this.enableTracing = enable;
  }

  private addTraceMessage(message: string, type: string): void {
    console.log(`[TRACE:${this.traceId}] [${type}]`, message);
  }
}

// Temporary mock agent for compilation
class MockAgent extends BaseAgentImpl {
  async process(input: string, context: RunnerContext): Promise<AgentResult> {
    return {
      output: "This is a mock response while all agents are being implemented."
    };
  }
}
