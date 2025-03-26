
import { Attachment } from "@/types/message";
import { ToolContext } from "../../types";
import { BaseAgent, AgentResult } from "../types";

export class SceneGeneratorAgent implements BaseAgent {
  private context: ToolContext;

  constructor(context: ToolContext) {
    this.context = context;
  }

  async run(input: string, attachments: Attachment[]): Promise<AgentResult> {
    try {
      // Call the Supabase function for the scene generator agent
      const { data, error } = await this.callMultiAgentFunction("scene", input, attachments);
      
      if (error) {
        throw new Error(`Scene generator agent error: ${error.message}`);
      }
      
      return {
        response: data?.response || "I processed your scene generation request but couldn't generate a response.",
        nextAgent: data?.nextAgent || null
      };
    } catch (error) {
      console.error("SceneGeneratorAgent run error:", error);
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
