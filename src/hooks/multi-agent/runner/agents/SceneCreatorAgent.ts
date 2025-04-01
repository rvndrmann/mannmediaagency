
import { BaseAgentImpl } from "./BaseAgentImpl";
import { AgentOptions, AgentResult, AgentType, RunnerContext } from "../types";
import { Attachment } from "@/types/message";
import { v4 as uuidv4 } from "uuid";

export class SceneCreatorAgent extends BaseAgentImpl {
  constructor(options: AgentOptions) {
    super({
      name: options.name || "Scene Creator Agent",
      instructions: options.instructions || "You are an AI agent specialized in creating visual scenes.",
      context: options.context,
      traceId: options.traceId,
      ...options
    });
  }

  getType(): AgentType {
    return "scene";
  }

  async process(input: string, context: RunnerContext): Promise<AgentResult> {
    try {
      console.log("Processing request with SceneCreatorAgent", input.substring(0, 50));
      
      // Extract attachments from context metadata if available
      const attachments = context.metadata?.attachments || [];
      
      // Record trace event for scene creator agent start
      this.recordTraceEvent("scene_creator_agent_start", {
        input_length: input.length,
        has_attachments: attachments && attachments.length > 0
      });
      
      // Get dynamic instructions
      const instructions = this.getInstructions();
      
      // Create context data for the Supabase function
      const contextData = {
        hasAttachments: attachments && attachments.length > 0,
        attachmentTypes: attachments.map((att: any) => 
          att.type && att.type.startsWith('image') ? 'image' : 'file'
        )
      };
      
      if (context.metadata?.projectId) {
        // Add project ID to context data using spread operator properly
        Object.assign(contextData, { projectId: context.metadata.projectId });
      }
      
      // Get the current user
      const { data: { user } } = await context.supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Call the Supabase function for the scene creator agent
      const { data, error } = await context.supabase.functions.invoke('multi-agent-chat', {
        body: {
          input,
          attachments,
          agentType: "scene",
          userId: user.id,
          usePerformanceModel: context.usePerformanceModel,
          enableDirectToolExecution: context.enableDirectToolExecution,
          contextData,
          runId: context.runId,
          groupId: context.groupId
        }
      });
      
      if (error) {
        console.error("Scene creator agent error:", error);
        this.recordTraceEvent("scene_creator_agent_error", {
          error: error.message || "Unknown error"
        });
        throw new Error(`Scene creator agent error: ${error.message}`);
      }
      
      // Extract handoff information if present
      let nextAgent = null;
      let handoffReason = null;
      let additionalContext = null;
      
      if (data?.handoff) {
        nextAgent = data.handoff.targetAgent;
        handoffReason = data.handoff.reason;
        additionalContext = data.handoff.additionalContext;
        
        this.recordTraceEvent("scene_creator_handoff", {
          target_agent: nextAgent,
          reason: handoffReason
        });
      }
      
      // Extract structured output if present
      const structuredOutput = data?.structured_output || null;
      
      // Record completion event
      this.recordTraceEvent("scene_creator_agent_complete", {
        response_length: data?.completion?.length || 0,
        has_handoff: !!nextAgent,
        has_structured_output: !!structuredOutput
      });
      
      // Build the result
      return {
        response: data?.completion || "I've analyzed your request but couldn't generate a proper response.",
        output: data?.completion || "I've analyzed your request but couldn't generate a proper response.",
        nextAgent,
        handoffReason,
        structured_output: structuredOutput,
        additionalContext
      };
    } catch (error) {
      console.error("Error in SceneCreatorAgent.process:", error);
      this.recordTraceEvent("scene_creator_agent_error", {
        error: error instanceof Error ? error.message : "Unknown error"
      });
      return {
        response: "An error occurred while processing your request. Please try again.",
        output: "An error occurred while processing your request. Please try again.",
        nextAgent: null,
        handoffReason: null
      };
    }
  }
}
