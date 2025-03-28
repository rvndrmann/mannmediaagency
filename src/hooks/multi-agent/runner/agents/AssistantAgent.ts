
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
      console.log("Running AssistantAgent with input:", input, "attachments:", attachments);
      
      // Get the current user
      const { data: { user } } = await this.context.supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Call the Supabase function for the assistant agent
      const { data, error } = await this.context.supabase.functions.invoke('multi-agent-chat', {
        body: {
          input,
          attachments,
          agentType: "main",
          userId: user.id,
          usePerformanceModel: this.context.usePerformanceModel,
          enableDirectToolExecution: this.context.enableDirectToolExecution,
          tracingDisabled: this.context.tracingDisabled,
          contextData: {
            hasAttachments: attachments && attachments.length > 0,
            attachmentTypes: attachments.map(att => att.type.startsWith('image') ? 'image' : 'file'),
            isHandoffContinuation: false
          },
          metadata: this.context.metadata,
          runId: this.context.runId,
          groupId: this.context.groupId
        }
      });
      
      if (error) {
        console.error("Assistant agent error:", error);
        throw new Error(`Assistant agent error: ${error.message}`);
      }
      
      console.log("Agent response:", data);
      
      // Handle handoff if present
      let nextAgent = null;
      if (data?.handoffRequest) {
        console.log("Handoff requested to:", data.handoffRequest.targetAgent);
        nextAgent = data.handoffRequest.targetAgent;
      }
      
      // Extract command suggestion if present
      const commandSuggestion = data?.commandSuggestion || null;
      
      return {
        response: data?.completion || "I processed your request but couldn't generate a response.",
        nextAgent: nextAgent,
        commandSuggestion: commandSuggestion
      };
    } catch (error) {
      console.error("AssistantAgent run error:", error);
      throw error;
    }
  }
}
