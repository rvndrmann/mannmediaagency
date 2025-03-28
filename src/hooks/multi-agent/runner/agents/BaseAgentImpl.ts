
import { BaseAgent, AgentResult, AgentOptions, AgentType } from "../types";
import { AgentConfig, ToolContext } from "../../types";

export class BaseAgentImpl implements BaseAgent {
  name: string;
  context: ToolContext;
  config: AgentConfig;
  
  constructor(options: AgentOptions) {
    this.context = options.context;
    this.config = options.config || {
      name: "Agent",
      instructions: "",
      modelName: "gpt-4o",
    };
    this.name = this.config.name;
  }
  
  async getInstructions(context: ToolContext): Promise<string> {
    if (typeof this.config.instructions === 'function') {
      return await this.config.instructions(context);
    }
    return this.config.instructions || '';
  }
  
  async run(input: string, attachments: any[] = []): Promise<AgentResult> {
    // Check if this is a continuation from a handoff
    const isContinuation = this.context.metadata?.isHandoffContinuation;
    const previousAgent = this.context.metadata?.previousAgentType;
    const handoffReason = this.context.metadata?.handoffReason;
    
    // For demonstration, apply some basic handoff context logic
    if (isContinuation && previousAgent && handoffReason) {
      console.log(`${this.getType()} agent continuing from ${previousAgent} handoff. Reason: ${handoffReason}`);
      
      // In a real implementation, this would use the LLM to generate a contextually aware response
      return {
        response: `I'm the ${this.getType()} agent. I understand you were working with the ${previousAgent} agent on: ${handoffReason}. I'll help you with this from my specialized perspective.`,
        nextAgent: null,
        structured_output: {
          handoffContext: {
            fromAgent: previousAgent,
            reason: handoffReason,
            continuationSuccess: true
          }
        }
      };
    }
    
    throw new Error("Method not implemented in base class.");
  }
  
  clone(configOverrides: Partial<AgentConfig>): BaseAgent {
    const newConfig = {
      ...this.config,
      ...configOverrides
    };
    
    return new BaseAgentImpl({
      context: this.context,
      config: newConfig
    });
  }
  
  getType(): AgentType {
    return "main";
  }
  
  // Added missing methods for guardrails
  async applyInputGuardrails(input: string): Promise<string> {
    // Default implementation just returns the input
    return input;
  }
  
  async applyOutputGuardrails(output: string): Promise<string> {
    // Default implementation just returns the output
    return output;
  }
  
  // New helper method for handoff decisions
  shouldHandoff(input: string): { handoff: boolean; targetAgent?: AgentType; reason?: string } {
    const inputLower = input.toLowerCase();
    const myType = this.getType();
    
    // Simple handoff logic - would use LLM in real implementation
    if (myType === "main") {
      if (inputLower.includes("image") || inputLower.includes("picture")) {
        return { 
          handoff: true, 
          targetAgent: "image", 
          reason: "User request involves image generation"
        };
      }
      if (inputLower.includes("script") || inputLower.includes("write")) {
        return { 
          handoff: true, 
          targetAgent: "script", 
          reason: "User request involves script writing"
        };
      }
    }
    
    return { handoff: false };
  }
  
  // New helper method to get conversation history
  getConversationHistory(): any[] {
    return this.context.metadata?.conversationHistory || [];
  }
  
  // New helper method to get appropriate tools for this agent
  getAvailableTools(): any[] {
    const agentType = this.getType();
    
    switch(agentType) {
      case "tool":
        return [{
          name: "browser_automation",
          description: "Automate browser tasks"
        }];
      case "image":
        return [{
          name: "generate_image",
          description: "Generate an image from a description"
        }];
      case "script":
        return [{
          name: "analyze_text",
          description: "Analyze text for sentiment and key points"
        }];
      case "scene":
        return [{
          name: "create_scene",
          description: "Create a visual scene from a description"
        }];
      default:
        return [];
    }
  }
}
