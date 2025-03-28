
import { Attachment } from "@/types/message";
import { ToolContext } from "../../types";
import { AgentResult, AgentOptions } from "../types";
import { getTool, getAvailableTools } from "../../tools";
import { BaseAgentImpl } from "./BaseAgentImpl";

export class ToolAgent extends BaseAgentImpl {
  constructor(options: AgentOptions) {
    super(options);
  }

  async run(input: string, attachments: Attachment[]): Promise<AgentResult> {
    try {
      // Get the current user
      const { data: { user } } = await this.context.supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Apply input guardrails if configured
      await this.applyInputGuardrails(input);
      
      // Get dynamic instructions if needed
      const instructions = await this.getInstructions(this.context);
      
      // Get available tools for context
      const availableTools = getAvailableTools().map(tool => ({
        name: tool.name,
        description: tool.description,
        requiredCredits: tool.requiredCredits
      }));
      
      // Call the Supabase function
      const { data, error } = await this.context.supabase.functions.invoke('multi-agent-chat', {
        body: {
          input,
          attachments,
          agentType: "tool",
          userId: user.id,
          usePerformanceModel: this.context.usePerformanceModel,
          enableDirectToolExecution: this.context.enableDirectToolExecution,
          tracingDisabled: this.context.tracingDisabled,
          contextData: {
            hasAttachments: attachments && attachments.length > 0,
            attachmentTypes: attachments.map(att => att.type.startsWith('image') ? 'image' : 'file'),
            availableTools: availableTools,
            isHandoffContinuation: false,
            instructions: instructions
          },
          metadata: {
            ...this.context.metadata,
            previousAgentType: 'tool'
          },
          runId: this.context.runId,
          groupId: this.context.groupId
        }
      });
      
      if (error) {
        throw new Error(`Tool agent error: ${error.message}`);
      }
      
      // Apply output guardrails if configured
      const output = data?.completion || "I processed your request but couldn't help with the tool.";
      await this.applyOutputGuardrails(output);
      
      // Handle handoff if present
      let nextAgent = null;
      if (data?.handoffRequest) {
        nextAgent = data.handoffRequest.targetAgent;
      }
      
      // Check if there's a command suggestion
      let commandSuggestion = null;
      if (data?.commandSuggestion) {
        commandSuggestion = data.commandSuggestion;
        
        // Attempt to validate the command
        const tool = getTool(commandSuggestion.name);
        if (!tool) {
          console.warn(`Tool agent suggested unknown tool: ${commandSuggestion.name}`);
          commandSuggestion = null;
        }
      }
      
      return {
        response: output,
        nextAgent: nextAgent,
        commandSuggestion: commandSuggestion,
        structured_output: data?.structured_output || null
      };
    } catch (error: any) {
      console.error("ToolAgent run error:", error);
      throw error;
    }
  }
}
