
import { BaseAgentImpl } from "./BaseAgentImpl";
import { AgentOptions, AgentResult, AgentType, RunnerContext } from "../types";
import { v4 as uuidv4 } from "uuid";

export class DataAgent extends BaseAgentImpl {
  constructor(options: AgentOptions) {
    super(options);
  }

  getType(): AgentType {
    return "data";
  }

  async run(input: string, context: RunnerContext): Promise<AgentResult> {
    return this.process(input, context);
  }

  async process(input: string, context: RunnerContext): Promise<AgentResult> {
    try {
      console.log(`Processing request with Data Agent: ${input.substring(0, 50)}...`);
      
      // Track processing in trace if enabled
      if (context.tracingEnabled && context.addMessage) {
        context.addMessage(`Processing with Data Agent: ${input.substring(0, 100)}`, "agent_start");
      }

      // Simple default response
      const response = `I'm the Data Agent, specialized in data analysis and processing. How can I help you today?`;

      // Track completion in trace if enabled
      if (context.tracingEnabled && context.addMessage) {
        context.addMessage(`Completed Data Agent processing: ${response.substring(0, 100)}`, "agent_end");
      }

      return {
        response,
        nextAgent: null
      };
    } catch (error) {
      console.error("Unexpected error in Data Agent:", error);
      return {
        response: "An unexpected error occurred. Please try again later.",
        nextAgent: null
      };
    }
  }
}
