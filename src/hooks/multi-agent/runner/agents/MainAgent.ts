
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
      console.log(`Project context: id=${projectId}, hasDetails=${!!projectDetails}, hasScript=${!!projectDetails?.fullScript}`);
      
      // Enhanced input with handoff context if needed
      let enhancedInput = input;
      
      // Handle very short inputs by providing additional context to the agent
      if (input.trim().length < 5) {
        enhancedInput = `${input}\n\n[Note: This is a brief greeting or very short message. Please respond appropriately with a friendly greeting and offer assistance with the Canvas project if available.]`;
        console.log("Enhanced very short input with context:", enhancedInput);
      }
      
      if (isHandoffContinuation && previousAgentType) {
        enhancedInput = `[Continuing from ${previousAgentType} agent] ${enhancedInput}\n\nContext from previous agent: ${handoffReason}`;
        
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
        
        // Include a brief excerpt of the script if available
        if (projectDetails.fullScript) {
          const scriptExcerpt = projectDetails.fullScript.substring(0, 300);
          const projectContextWithScript = `${projectContext}
Script excerpt:
${scriptExcerpt}${projectDetails.fullScript.length > 300 ? '...(script continues)' : ''}
`;
          contextualInput = `${enhancedInput}\n\n[Project context: ${projectContextWithScript}]`;
          console.log("Added project context with script excerpt to input");
        } else {
          contextualInput = `${enhancedInput}\n\n[Project context: ${projectContext}]`;
          console.log("Added project context to input");
        }
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
      
      // Create a trace event for tracking
      const traceEvent = {
        eventType: 'agent_request',
        timestamp: new Date().toISOString(),
        data: {
          agentType: 'main',
          inputLength: contextualInput.length,
          isHandoffContinuation,
          previousAgentType: previousAgentType,
          hasAttachments: attachments && attachments.length > 0
        }
      };
      
      // Call the Supabase function with enhanced trace data
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
            hasFullScript: !!projectDetails?.fullScript,
            scriptExcerpt: projectDetails?.fullScript ? projectDetails.fullScript.substring(0, 500) : null
          },
          conversationHistory: conversationHistory,
          metadata: {
            ...this.context.metadata,
            previousAgentType: 'main',
            conversationId: this.context.groupId,
            projectId: projectId,
            projectDetails: projectDetails,
            traceEvent
          },
          runId: this.context.runId,
          groupId: this.context.groupId
        }
      });
      
      if (error) {
        console.error("Main agent invoke error:", error);
        throw new Error(`Main agent error: ${error.message}`);
      }
      
      // Add fallback for empty responses
      if (!data?.completion || data.completion.trim() === '') {
        console.log("Empty response detected, providing fallback response");
        return {
          response: "I'm here to help with your Canvas project. How can I assist you today?",
          nextAgent: null,
          handoffReason: null,
          structured_output: data?.structured_output || null,
          additionalContext: {
            projectId: projectId,
            projectTitle: projectDetails?.title || "",
            existingScript: projectDetails?.fullScript || null
          }
        };
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
            projectTitle: projectDetails?.title || "",
            existingScript: projectDetails?.fullScript || null
          };
        } else if (nextAgent === "scene") {
          additionalContextForNext = {
            ...(additionalContextForNext || {}),
            originalRequest: input,
            projectId: projectId,
            projectTitle: projectDetails?.title || "",
            sceneCount: projectDetails?.scenes?.length || 0,
            existingScript: projectDetails?.fullScript || null
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
          projectTitle: projectDetails?.title || "",
          existingScript: projectDetails?.fullScript || null
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
          sceneCount: projectDetails?.scenes?.length || 0,
          existingScript: projectDetails?.fullScript || null
        };
      }
      
      return {
        response: data?.completion || "I processed your request but couldn't generate a response.",
        nextAgent: nextAgent,
        handoffReason: handoffReasonResponse,
        structured_output: data?.structured_output || null,
        additionalContext: additionalContextForNext || continuityData?.additionalContext || {
          projectId: projectId,
          projectTitle: projectDetails?.title || "",
          existingScript: projectDetails?.fullScript || null
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
