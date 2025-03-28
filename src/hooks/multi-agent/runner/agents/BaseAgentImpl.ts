
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
}
