
import { BaseAgentImpl } from "../BaseAgentImpl";
import { AgentResult, AgentType } from "../types";
import { Attachment } from "@/types/message";
import { supabase } from "@/integrations/supabase/client";

export class DataAgent extends BaseAgentImpl {
  getType(): AgentType {
    return "data";
  }

  async run(input: string, attachments: Attachment[] = []): Promise<AgentResult> {
    this.recordTraceEvent("agent_run_start", {
      input_length: input.length,
      has_attachments: attachments.length > 0
    });
    
    try {
      // Apply input guardrails
      await this.applyInputGuardrails(input);
      
      // Prepare the conversation history
      const conversationHistory = this.context.metadata?.conversationHistory || [];
      
      // Get agent instructions
      const instructions = await this.getInstructions(this.context);
      
      // Get project data if available
      const projectId = this.context.metadata?.projectId;
      let projectData = null;
      
      if (projectId) {
        try {
          const { data: projectDetails, error: projectError } = await supabase
            .from('canvas_projects')
            .select('*')
            .eq('id', projectId)
            .single();
            
          if (!projectError && projectDetails) {
            projectData = projectDetails;
          }
        } catch (err) {
          console.error("Error fetching project data:", err);
        }
      }
      
      // Call the Supabase edge function
      const { data, error } = await supabase.functions.invoke('multi-agent-chat', {
        body: {
          agentType: this.getType(),
          input,
          userId: this.context.userId,
          runId: this.context.runId,
          groupId: this.context.groupId,
          attachments,
          contextData: {
            ...this.context.metadata,
            projectData,
            instructions: {
              [this.getType()]: instructions
            }
          },
          conversationHistory,
          usePerformanceModel: this.context.usePerformanceModel,
          enableDirectToolExecution: this.context.enableDirectToolExecution
        }
      });
      
      if (error) {
        this.recordTraceEvent("agent_run_error", {
          error: error.message
        });
        throw error;
      }
      
      if (!data) {
        throw new Error("No data returned from edge function");
      }
      
      const { responseText, handoff, structuredOutput } = data;
      
      // Apply output guardrails
      await this.applyOutputGuardrails(responseText);
      
      this.recordTraceEvent("agent_run_complete", {
        responseLength: responseText.length,
        hasHandoff: !!handoff,
        hasStructuredOutput: !!structuredOutput
      });
      
      // Return the agent result
      return {
        response: responseText,
        nextAgent: handoff?.targetAgent,
        handoffReason: handoff?.reason,
        additionalContext: handoff?.additionalContext,
        structured_output: structuredOutput
      };
    } catch (error) {
      this.recordTraceEvent("agent_run_error", {
        error: error.message || "Unknown error"
      });
      
      console.error(`${this.getType()} agent error:`, error);
      throw error;
    }
  }
}
