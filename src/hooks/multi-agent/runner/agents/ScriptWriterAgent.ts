
import { Attachment } from "@/types/message";
import { AgentConfig, ToolContext } from "../../types";
import { AgentResult, AgentOptions } from "../types";
import { BaseAgentImpl } from "./BaseAgentImpl";

export class ScriptWriterAgent extends BaseAgentImpl {
  constructor(options: AgentOptions) {
    super(options);
  }

  async run(input: string, attachments: Attachment[]): Promise<AgentResult> {
    try {
      console.log("Running ScriptWriterAgent with input:", input.substring(0, 50), "attachments:", attachments.length);
      
      // Get the current user
      const { data: { user } } = await this.context.supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Get dynamic instructions if needed
      const instructions = await this.getInstructions(this.context);
      
      // Enhanced context handling: Get conversation history from context if available
      const conversationHistory = this.context.metadata?.conversationHistory || [];
      
      console.log(`ScriptWriterAgent processing with ${conversationHistory.length} historical messages`);
      
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
        // More explicit instruction to actually write a script
        enhancedInput = `[SCRIPT WRITING TASK FROM ${previousAgentType.toUpperCase()} AGENT]

${input}

Previous context: ${handoffReason}

IMPORTANT: YOU ARE THE SCRIPT WRITER AGENT. YOUR PRIMARY TASK IS TO WRITE A COMPLETE SCRIPT NOW.

DO NOT just talk about writing a script or offer to help - ACTUALLY WRITE THE FULL SCRIPT in your response.
Format it properly with scene headings, character dialogue, and actions where appropriate.
`;
        
        // Add Canvas project context if available
        if (projectId) {
          enhancedInput += `\n\nThis is for Canvas project ID: ${projectId}`;
          if (projectDetails) {
            enhancedInput += ` titled "${projectDetails.title}"`;
            enhancedInput += `\nThis project has ${projectDetails.scenes?.length || 0} scenes.`;
          }
          enhancedInput += `.\nAfter writing the script, you should save it to the project using the canvas tool.`;
        }
        
        // Add additional context if available
        if (continuityData && continuityData.additionalContext) {
          enhancedInput += `\n\nAdditional context: ${JSON.stringify(continuityData.additionalContext)}`;
        }
        
        console.log("Enhanced input with explicit script writing instructions");
      } else if (projectId && projectDetails) {
        // Add project context for direct requests to the script agent
        enhancedInput = `${input}\n\n[PROJECT CONTEXT: You are working on Canvas project "${projectDetails.title}" (ID: ${projectId}). This project has ${projectDetails.scenes?.length || 0} scenes.${projectDetails.fullScript ? " The project already has a full script that you can modify or expand upon." : " The project needs a full script."}]`;
      }
      
      // Call the Supabase function with enhanced context for the script writer agent
      const { data, error } = await this.context.supabase.functions.invoke('multi-agent-chat', {
        body: {
          input: enhancedInput, // Use the enhanced input
          attachments,
          agentType: "script",
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
            agentSpecialty: "script_writing", // Explicitly identify this agent's specialty
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
            previousAgentType: 'script',
            conversationId: this.context.groupId,
            projectId: projectId // Include project ID in metadata
          },
          runId: this.context.runId,
          groupId: this.context.groupId
        }
      });
      
      if (error) {
        console.error("Script writer agent error:", error);
        throw new Error(`Script writer agent error: ${error.message}`);
      }
      
      console.log("Script agent response:", data?.completion?.substring(0, 100) + "...");
      
      // Add custom processing for script content
      if (data?.completion) {
        // Check if there are script markers in the content
        const hasScriptMarkers = data.completion.includes('SCENE') || 
                               data.completion.includes('INT.') || 
                               data.completion.includes('EXT.') ||
                               data.completion.includes('FADE IN:') ||
                               data.completion.includes('CUT TO:');
                               
        if (!hasScriptMarkers && data.structured_output?.isScript !== true) {
          // Add a warning about inappropriate response
          console.warn("Script agent didn't return actual script content!");
          
          // We could enhance the output with a clear message that this is inappropriate
          data.completion = `${data.completion}\n\n[Note: This response doesn't contain an actual script as requested. Please ask the Script Writer agent specifically to write the script.]`;
        }
        
        // If we have project ID and script content but no explicit tool use happened, attempt to save it
        if (projectId && hasScriptMarkers && !data.toolExecutions?.includes('canvas')) {
          try {
            console.log("Auto-saving script to Canvas project", projectId);
            
            // Extract the script portion from the response
            let scriptContent = data.completion;
            if (scriptContent.includes("Here's your script:")) {
              scriptContent = scriptContent.split("Here's your script:")[1].trim();
            } else if (scriptContent.includes("Here is the script:")) {
              scriptContent = scriptContent.split("Here is the script:")[1].trim();
            }
            
            // Use the canvas tool to save the script to the project
            const { supabase } = this.context;
            
            // Try to save as full script first
            await supabase
              .from('canvas_projects')
              .update({ full_script: scriptContent })
              .eq('id', projectId);
            
            // Append a success message to the response
            data.completion += "\n\n[Script has been automatically saved to your Canvas project]";
          } catch (saveError) {
            console.error("Failed to auto-save script to Canvas:", saveError);
          }
        }
      }
      
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
        response: data?.completion || "I processed your request but couldn't generate a script response.",
        nextAgent: nextAgent,
        handoffReason: handoffReasonResponse,
        structured_output: data?.structured_output || null,
        additionalContext: additionalContextForNext || continuityData?.additionalContext || {
          projectId: projectId,
          projectTitle: projectDetails?.title || ""
        }
      };
    } catch (error) {
      console.error("ScriptWriterAgent run error:", error);
      throw error;
    }
  }
  
  getType() {
    return "script";
  }
}
