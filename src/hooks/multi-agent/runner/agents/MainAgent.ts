
import { Attachment } from "@/types/message";
import { AgentResult, AgentOptions } from "../types";
import { BaseAgentImpl } from "./BaseAgentImpl";

export class MainAgent extends BaseAgentImpl {
  constructor(options: AgentOptions) {
    super(options);
  }

  async run(input: string, attachments: Attachment[]): Promise<AgentResult> {
    try {
      console.log("Running MainAgent with input:", input.substring(0, 50), "attachments:", attachments.length);
      
      // Get the current user
      const { data: { user } } = await this.context.supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Get dynamic instructions if needed
      const instructions = await this.getInstructions(this.context);
      
      // Get conversation history from context if available
      const conversationHistory = this.context.metadata?.conversationHistory || [];
      
      console.log(`MainAgent processing with ${conversationHistory.length} historical messages`);
      
      // Check if this is a handoff continuation
      const isHandoffContinuation = this.context.metadata?.isHandoffContinuation || false;
      const previousAgentType = this.context.metadata?.previousAgentType || 'main';
      const handoffReason = this.context.metadata?.handoffReason || '';
      const handoffHistory = this.context.metadata?.handoffHistory || [];
      const continuityData = this.context.metadata?.continuityData || {};
      const projectDetails = this.context.metadata?.projectDetails || null;
      const projectId = this.context.metadata?.projectId || null;
      
      console.log(`Handoff context: continuation=${isHandoffContinuation}, from=${previousAgentType}, reason=${handoffReason}`);
      console.log(`Handoff history:`, handoffHistory);
      console.log(`Continuity data:`, continuityData);
      console.log(`Project context: id=${projectId}, hasDetails=${!!projectDetails}`);
      
      // Enhanced input with handoff context if needed
      let enhancedInput = input;
      if (isHandoffContinuation && previousAgentType) {
        enhancedInput = `[Continuing from ${previousAgentType} agent] ${input}\n\nContext from previous agent: ${handoffReason}`;
        
        // Add additional context if available
        if (continuityData && Object.keys(continuityData).length > 0) {
          enhancedInput += `\n\nAdditional context: ${JSON.stringify(continuityData.additionalContext || {})}`;
        }
        
        console.log("Enhanced input with handoff context:", enhancedInput.substring(0, 100) + "...");
      }
      
      // Add project context if available
      let contextualInput = enhancedInput;
      if (projectId && projectDetails) {
        const projectContext = `
Working with Canvas video project: "${projectDetails.title}" (ID: ${projectId})
Number of scenes: ${projectDetails.scenes?.length || 0}
${projectDetails.fullScript ? "This project has a full script." : "This project does not have a full script yet."}
        `;
        
        contextualInput = `${enhancedInput}\n\n[Project context: ${projectContext}]`;
        console.log("Added project context to input");
      }
      
      // Check for script writing requests
      const scriptKeywords = ['write a script', 'create a script', 'script for', 'screenplay', 'script about'];
      const lowercaseInput = input.toLowerCase();
      const isScriptRequest = scriptKeywords.some(keyword => lowercaseInput.includes(keyword));
      
      if (isScriptRequest) {
        console.log("Detected script writing request - recommend handoff to script agent");
      }
      
      // Check for scene creation requests
      const sceneKeywords = ['scene description', 'visual scene', 'describe the scene', 'scene for', 'image prompt'];
      const isSceneRequest = sceneKeywords.some(keyword => lowercaseInput.includes(keyword));
      
      if (isSceneRequest) {
        console.log("Detected scene description request - recommend handoff to scene agent");
      }
      
      // Call the Supabase function
      const { data, error } = await this.context.supabase.functions.invoke('multi-agent-chat', {
        body: {
          input: contextualInput, // Use enhanced input with project context
          attachments,
          agentType: "main",
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
            handoffHistory: handoffHistory,
            continuityData: continuityData,
            isScriptRequest: isScriptRequest,
            isSceneRequest: isSceneRequest,
            projectId: projectId,
            hasProjectDetails: !!projectDetails,
            projectTitle: projectDetails?.title || "",
            scenesCount: projectDetails?.scenes?.length || 0,
            hasFullScript: !!projectDetails?.fullScript
          },
          conversationHistory: conversationHistory,
          metadata: {
            ...this.context.metadata,
            previousAgentType: 'main',
            conversationId: this.context.groupId
          },
          runId: this.context.runId,
          groupId: this.context.groupId
        }
      });
      
      if (error) {
        throw new Error(`Main agent error: ${error.message}`);
      }
      
      console.log("MainAgent response:", data?.completion?.substring(0, 100) + "...");
      
      // Handle handoff if present
      let nextAgent = null;
      let handoffReasonResponse = null;
      let additionalContextForNext = null;
      
      if (data?.handoffRequest) {
        console.log(`MainAgent handoff requested to: ${data.handoffRequest.targetAgent}`);
        nextAgent = data.handoffRequest.targetAgent;
        handoffReasonResponse = data.handoffRequest.reason;
        additionalContextForNext = data.handoffRequest.additionalContext || continuityData?.additionalContext;
        
        // For script handoffs, provide more specific context
        if (nextAgent === "script") {
          additionalContextForNext = {
            ...(additionalContextForNext || {}),
            originalRequest: input,
            requiresFullScript: true,
            scriptType: isScriptRequest ? detectScriptType(input) : "general",
            projectId: projectId,
            projectTitle: projectDetails?.title || ""
          };
        } else if (nextAgent === "scene") {
          additionalContextForNext = {
            ...(additionalContextForNext || {}),
            originalRequest: input,
            projectId: projectId,
            projectTitle: projectDetails?.title || "",
            sceneCount: projectDetails?.scenes?.length || 0
          };
        }
      } else if (isScriptRequest && data?.completion) {
        // If the system detected a script request but didn't handle it, force a handoff
        console.log("Forcing handoff to script agent for script request");
        nextAgent = "script";
        handoffReasonResponse = "The user requested a script to be written.";
        additionalContextForNext = {
          originalRequest: input,
          requiresFullScript: true,
          scriptType: detectScriptType(input),
          forceScriptGeneration: true,
          projectId: projectId,
          projectTitle: projectDetails?.title || ""
        };
      } else if (isSceneRequest && data?.completion) {
        // Force a handoff for scene creation if needed
        console.log("Forcing handoff to scene agent for scene description request");
        nextAgent = "scene";
        handoffReasonResponse = "The user requested scene descriptions or image prompts.";
        additionalContextForNext = {
          originalRequest: input,
          projectId: projectId,
          projectTitle: projectDetails?.title || "",
          sceneCount: projectDetails?.scenes?.length || 0
        };
      }
      
      return {
        response: data?.completion || "I processed your request but couldn't generate a response.",
        nextAgent: nextAgent,
        handoffReason: handoffReasonResponse,
        structured_output: data?.structured_output || null,
        additionalContext: additionalContextForNext || continuityData?.additionalContext || {
          projectId: projectId,
          projectTitle: projectDetails?.title || ""
        }
      };
    } catch (error) {
      console.error("MainAgent run error:", error);
      throw error;
    }
  }
  
  getType() {
    return "main";
  }
}

// Helper to detect script type from input
function detectScriptType(input: string): string {
  const lowerInput = input.toLowerCase();
  
  if (lowerInput.includes('movie') || lowerInput.includes('film') || lowerInput.includes('screenplay')) {
    return 'screenplay';
  } else if (lowerInput.includes('tv') || lowerInput.includes('television') || lowerInput.includes('episode')) {
    return 'teleplay';
  } else if (lowerInput.includes('commercial') || lowerInput.includes('ad ') || lowerInput.includes('advertisement')) {
    return 'commercial';
  } else if (lowerInput.includes('video')) {
    return 'video';
  } else if (lowerInput.includes('play') || lowerInput.includes('theater') || lowerInput.includes('stage')) {
    return 'stage play';
  } else {
    return 'general';
  }
}
