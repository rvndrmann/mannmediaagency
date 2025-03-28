
import { Attachment } from "@/types/message";
import { AgentConfig, ToolContext } from "../../types";
import { AgentResult, AgentOptions } from "../types";
import { BaseAgentImpl } from "./BaseAgentImpl";

export class SceneCreatorAgent extends BaseAgentImpl {
  constructor(options: AgentOptions) {
    super(options);
  }

  async run(input: string, attachments: Attachment[]): Promise<AgentResult> {
    try {
      console.log("Running SceneCreatorAgent with input:", input.substring(0, 50), "attachments:", attachments.length);
      
      // Get the current user
      const { data: { user } } = await this.context.supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Get dynamic instructions if needed
      const instructions = await this.getInstructions(this.context);
      
      // Enhanced context handling: Get conversation history from context if available
      const conversationHistory = this.context.metadata?.conversationHistory || [];
      
      console.log(`SceneCreatorAgent processing with ${conversationHistory.length} historical messages`);
      
      // Enhanced handoff context tracking
      const isHandoffContinuation = this.context.metadata?.isHandoffContinuation || false;
      const previousAgentType = this.context.metadata?.previousAgentType || 'main';
      const handoffReason = this.context.metadata?.handoffReason || '';
      const handoffHistory = this.context.metadata?.handoffHistory || [];
      const continuityData = this.context.metadata?.continuityData || {};
      const projectId = this.context.metadata?.projectId || continuityData?.additionalContext?.projectId || null;
      const projectDetails = this.context.metadata?.projectDetails || null;
      
      console.log(`Handoff context: continuation=${isHandoffContinuation}, from=${previousAgentType}, reason=${handoffReason}`);
      console.log(`Handoff history:`, handoffHistory);
      console.log(`Continuity data:`, continuityData);
      console.log(`Canvas project context: projectId=${projectId}, hasDetails=${!!projectDetails}`);
      
      // Enhanced input for script writing task
      let enhancedInput = input;
      if (isHandoffContinuation && previousAgentType) {
        // More explicit instruction for scene creation
        enhancedInput = `[SCENE CREATION TASK FROM ${previousAgentType.toUpperCase()} AGENT]

${input}

Previous context: ${handoffReason}

IMPORTANT: YOU ARE THE SCENE CREATOR AGENT. YOUR PRIMARY TASK IS TO CREATE DETAILED SCENE DESCRIPTIONS AND IMAGE PROMPTS.

Focus on creating visual descriptions that will translate well to images and videos. Consider:
- Setting and environment details
- Lighting, mood, and atmosphere
- Character positions and actions
- Key visual elements to be highlighted

For each scene, provide BOTH a narrative description AND a detailed image prompt that can be used for image generation.
`;
        
        // Add Canvas project context if available
        if (projectId) {
          enhancedInput += `\n\nThis is for Canvas project ID: ${projectId}`;
          if (projectDetails) {
            enhancedInput += ` titled "${projectDetails.title}"`;
            enhancedInput += `\nThis project has ${projectDetails.scenes?.length || 0} scenes.`;
            if (projectDetails.fullScript) {
              enhancedInput += `\nThe project has a full script that should inform your scene descriptions.`;
            }
          }
          enhancedInput += `.\nAfter creating scene descriptions and image prompts, you should save them to the project using the canvas tool.`;
        }
        
        // Add additional context if available
        if (continuityData && continuityData.additionalContext) {
          enhancedInput += `\n\nAdditional context: ${JSON.stringify(continuityData.additionalContext)}`;
        }
        
        console.log("Enhanced input with explicit scene creation instructions");
      }
      
      // Call the Supabase function with enhanced context for the scene creator agent
      const { data, error } = await this.context.supabase.functions.invoke('multi-agent-chat', {
        body: {
          input: enhancedInput, // Use the enhanced input
          attachments,
          agentType: "scene",
          userId: user.id,
          usePerformanceModel: this.context.usePerformanceModel,
          enableDirectToolExecution: this.context.enableDirectToolExecution,
          tracingDisabled: this.context.tracingDisabled,
          contextData: {
            hasAttachments: attachments && attachments.length > 0,
            attachmentTypes: attachments.map(att => att.type.startsWith('image') ? 'image' : 'file'),
            isHandoffContinuation: isHandoffContinuation,
            previousAgentType: previousAgentType,
            handoffReason: handoffReason,
            instructions: instructions,
            agentSpecialty: "scene_creation", // Explicitly identify this agent's specialty
            handoffHistory: handoffHistory,
            continuityData: continuityData,
            projectId: projectId, // Pass the project ID if available
            projectDetails: projectDetails,
            toolContext: {
              canSaveToCanvas: !!projectId // Tell the agent if it can save to Canvas
            }
          },
          conversationHistory: conversationHistory,
          metadata: {
            ...this.context.metadata,
            previousAgentType: 'scene',
            conversationId: this.context.groupId,
            projectId: projectId // Include project ID in metadata
          },
          runId: this.context.runId,
          groupId: this.context.groupId
        }
      });
      
      if (error) {
        console.error("Scene creator agent error:", error);
        throw new Error(`Scene creator agent error: ${error.message}`);
      }
      
      console.log("Scene creator agent response:", data?.completion?.substring(0, 100) + "...");
      
      // Handle handoff if present
      let nextAgent = null;
      let handoffReasonResponse = null;
      let additionalContextForNext = null;
      
      if (data?.handoffRequest) {
        console.log("Handoff requested to:", data.handoffRequest.targetAgent);
        nextAgent = data.handoffRequest.targetAgent;
        handoffReasonResponse = data.handoffRequest.reason;
        additionalContextForNext = data.handoffRequest.additionalContext || continuityData?.additionalContext;
        
        // Make sure to pass along the project ID
        if (projectId && additionalContextForNext) {
          additionalContextForNext.projectId = projectId;
          if (projectDetails) {
            additionalContextForNext.projectTitle = projectDetails.title;
          }
        }
      }
      
      return {
        response: data?.completion || "I processed your request but couldn't generate a scene description response.",
        nextAgent: nextAgent,
        handoffReason: handoffReasonResponse,
        structured_output: data?.structured_output || null,
        additionalContext: additionalContextForNext || continuityData?.additionalContext || {
          projectId: projectId,
          projectTitle: projectDetails?.title || ""
        }
      };
    } catch (error) {
      console.error("SceneCreatorAgent run error:", error);
      throw error;
    }
  }
  
  getType() {
    return "scene";
  }
}
