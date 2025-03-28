
import { Attachment } from "@/types/message";
import { AgentConfig, ToolContext } from "../../types";
import { AgentResult, AgentOptions, AgentType, RunnerContext, BaseAgent } from "../types";

export class BaseAgentImpl implements BaseAgent {
  protected context: RunnerContext;
  private type: AgentType = 'main';
  public name: string;
  public config: AgentConfig;

  constructor(options: AgentOptions) {
    this.context = options.context;
    this.type = this.determineType();
    this.name = this.constructor.name;
    this.config = options.config || {
      name: this.constructor.name,
      instructions: "",
      modelName: "gpt-4o"
    };
  }

  private determineType(): AgentType {
    // Determine agent type from class name
    const className = this.constructor.name;
    if (className.includes('Main') || className.includes('Assistant')) return 'main';
    if (className.includes('Script')) return 'script';
    if (className.includes('Image')) return 'image';
    if (className.includes('Tool')) return 'tool';
    if (className.includes('Scene')) return 'scene';
    return 'main'; // Default to main
  }

  async run(input: string, attachments: Attachment[]): Promise<AgentResult> {
    // This is a base implementation that should be overridden by specific agent types
    throw new Error("Method not implemented in base class. Must be implemented by derived classes.");
  }

  getType(): AgentType {
    return this.type;
  }

  clone(configOverrides: Partial<AgentConfig>): BaseAgent {
    const newConfig = {
      ...this.config,
      ...configOverrides
    };
    
    const options: AgentOptions = {
      context: this.context,
      config: newConfig
    };
    
    // @ts-ignore - This is a bit of a hack but works for cloning
    return new (this.constructor as new (options: AgentOptions) => BaseAgent)(options);
  }

  protected async getInstructions(context: RunnerContext): Promise<string> {
    return this.config.instructions instanceof Function 
      ? await this.config.instructions(context)
      : this.config.instructions || "";
  }

  protected applyInputGuardrails(input: string): Promise<boolean> {
    // This would be implemented to run any input guardrails
    // For now, we'll just return true (passed)
    return Promise.resolve(true);
  }

  protected applyOutputGuardrails(output: any): Promise<boolean> {
    // This would be implemented to run any output guardrails
    // For now, we'll just return true (passed)
    return Promise.resolve(true);
  }

  protected async callLLM(input: string, instructions: string, tools: any[] = []): Promise<any> {
    // This is a placeholder for the actual LLM call
    console.log("BaseAgentImpl: LLM call would happen here with:", {
      input,
      instructions,
      tools: tools.length > 0 ? "Using tools" : "No tools"
    });
    
    // Return a placeholder result for now
    return {
      text: `This is a placeholder response for agent ${this.getType()}`,
      tool_calls: [],
    };
  }
}
