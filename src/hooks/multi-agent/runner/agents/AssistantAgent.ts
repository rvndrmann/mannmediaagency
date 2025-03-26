
import { Attachment } from "@/types/message";
import { ToolContext } from "../../types";
import { BaseAgent, AgentResult } from "../types";

export class AssistantAgent implements BaseAgent {
  private context: ToolContext;

  constructor(context: ToolContext) {
    this.context = context;
  }

  async run(input: string, attachments: Attachment[]): Promise<AgentResult> {
    try {
      // Call the Supabase function for the assistant agent
      const { data, error } = await this.callMultiAgentFunction("main", input, attachments);
      
      if (error) {
        throw new Error(`Assistant agent error: ${error.message}`);
      }
      
      return {
        response: data?.response || "I processed your request but couldn't generate a response.",
        nextAgent: data?.nextAgent || null
      };
    } catch (error) {
      console.error("AssistantAgent run error:", error);
      throw error;
    }
  }

  private async callMultiAgentFunction(agentType: string, input: string, attachments: Attachment[]) {
    const { data: { user } } = await this.context.supabase.auth.getUser();
    
    return await this.context.supabase.functions.invoke('multi-agent-chat', {
      body: {
        input,
        attachments,
        agentType,
        userId: user?.id,
        usePerformanceModel: this.context.usePerformanceModel,
        enableDirectToolExecution: this.context.enableDirectToolExecution,
        tracingDisabled: this.context.tracingDisabled,
        metadata: this.context.metadata,
        runId: this.context.runId,
        groupId: this.context.groupId,
        isHandoffContinuation: false
      }
    });
  }
}
