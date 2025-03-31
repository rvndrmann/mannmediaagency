
import { Attachment } from "@/types/message";
import { AgentResult, AgentOptions, AgentType, RunnerContext } from "../types";
import { BaseAgentImpl } from "./BaseAgentImpl";
import { supabase } from "@/integrations/supabase/client";

export class SceneCreatorAgent extends BaseAgentImpl {
  constructor(options: AgentOptions) {
    super({
      name: options.name || "Scene Creator Agent",
      instructions: options.instructions || "You are an AI agent specialized in creating scenes for video content.",
      context: options.context,
      traceId: options.traceId || `scene-creator-${Date.now()}`
    });
  }

  getType(): AgentType {
    return "scene";
  }

  async process(input: string, context: RunnerContext): Promise<AgentResult> {
    try {
      console.log("Processing with SceneCreatorAgent");
      
      // Get the current user
      const { data: { user } } = await this.context.supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Extract project ID and other metadata from context
      const projectId = this.context.metadata?.projectId;
      const attachments = this.context.metadata?.attachments || [];
      
      this.recordTraceEvent("scene_creator_start", `Starting scene creation for project: ${projectId}`); 
      
      // If we have a project ID, add it to the context
      let contextData = {
        hasAttachments: attachments && attachments.length > 0,
        attachmentTypes: attachments.map((att: Attachment) => att.type.startsWith('image') ? 'image' : 'file')
      };
      
      if (projectId) {
        contextData = {
          ...contextData,
          projectId
        };
      }
      
      // Invoke the multi-agent chat function with the scene type
      const { data, error } = await this.context.supabase.functions.invoke('multi-agent-chat', {
        body: {
          input,
          agentType: "scene",
          userId: user.id,
          usePerformanceModel: this.context.usePerformanceModel,
          enableDirectToolExecution: true,
          contextData,
          tracingEnabled: !this.context.tracingEnabled,
          runId: this.context.runId,
          groupId: this.context.groupId,
          metadata: {
            projectId,
            conversationId: this.context.groupId
          }
        }
      });
      
      if (error) {
        this.recordTraceEvent("scene_creator_error", `Error: ${error.message}`);
        throw new Error(`Scene creator agent error: ${error.message}`);
      }
      
      // Process different response types
      if (data?.completion) {
        this.recordTraceEvent("scene_creator_completion", `Received completion of ${data.completion.length} chars`);
        
        return {
          response: data.completion,
          output: data.completion,
          nextAgent: null,
          handoffReason: null,
          structured_output: data?.structured_output,
          additionalContext: null
        };
      } else if (data?.error) {
        this.recordTraceEvent("scene_creator_error", `Agent returned error: ${data.error}`);
        throw new Error(`Scene creator agent returned error: ${data.error}`);
      }
      
      return {
        response: "I couldn't generate a scene response at this time.",
        output: "I couldn't generate a scene response at this time.",
        nextAgent: null,
        handoffReason: null,
        structured_output: null,
        additionalContext: null
      };
    } catch (error) {
      this.recordTraceEvent("scene_creator_exception", `Exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error("Error in SceneCreatorAgent:", error);
      throw error;
    }
  }
  
  private async generateScene(input: string, projectId: string): Promise<AgentResult> {
    try {
      this.recordTraceEvent("scene_generation_start", `Starting scene generation for project: ${projectId}`);
      
      // Get the current user
      const { data: { user } } = await this.context.supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Call the canvas_scene_generation function
      const { data, error } = await this.context.supabase.functions.invoke('canvas-scene-generation', {
        body: {
          projectId,
          input,
          userId: user.id
        }
      });
      
      if (error) {
        this.recordTraceEvent("scene_generation_error", `Error: ${error.message}`);
        throw new Error(`Scene generation error: ${error.message}`);
      }
      
      this.recordTraceEvent("scene_generation_complete", `Scene generation complete: ${data?.sceneId}`);
      
      return {
        response: `Created a new scene: ${data?.title}`,
        output: `Created a new scene: ${data?.title}`,
        nextAgent: null,
        handoffReason: null,
        structured_output: data,
        additionalContext: null
      };
    } catch (error) {
      this.recordTraceEvent("scene_generation_exception", `Exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error("Scene generation error:", error);
      throw error;
    }
  }
  
  private async updateSceneScript(sceneId: string, script: string): Promise<AgentResult> {
    try {
      // Call canvas service to update the scene script
      const { data, error } = await this.context.supabase.functions.invoke('canvas-update-scene', {
        body: {
          sceneId,
          updateType: 'script',
          content: script
        }
      });
      
      if (error) {
        throw new Error(`Failed to update scene script: ${error.message}`);
      }
      
      return {
        response: `Updated script for scene ${sceneId}`,
        output: `Updated script for scene ${sceneId}`,
        nextAgent: null,
        handoffReason: null,
        structured_output: data,
        additionalContext: null
      };
    } catch (error) {
      console.error("Error updating scene script:", error);
      throw error;
    }
  }
}
