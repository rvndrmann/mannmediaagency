import { Attachment } from "@/types/message";
import { AgentResult, AgentOptions, AgentType, RunnerContext } from "../types";
import { BaseAgentImpl } from "./BaseAgentImpl";

export class ScriptWriterAgent extends BaseAgentImpl {
  constructor(options: AgentOptions) {
    super({
      name: options.name || "Script Writer Agent",
      instructions: options.instructions || "You are an AI agent specialized in writing scripts.",
      context: options.context,
      traceId: options.traceId,
      ...options
    });
  }

  getType(): AgentType {
    return "script";
  }

  async process(input: string, context: RunnerContext): Promise<AgentResult> {
    try {
      console.log("Running ScriptWriterAgent with input:", input.substring(0, 50));
      
      // Get the current user
      const { data: { user } } = await this.context.supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Get dynamic instructions if needed
      const instructions = this.getInstructions();
      
      // Handle attachments if they exist in metadata
      const attachments = this.context.metadata?.attachments || [];
      
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
      const existingScript = projectDetails?.fullScript || continuityData?.additionalContext?.existingScript || null;
      
      // ENHANCEMENT: Check if this is part of a workflow
      const workflowInfo = continuityData?.additionalContext?.workflowInfo || {};
      const isPartOfWorkflow = workflowInfo.isPartOfWorkflow || false;
      const workflowStage = workflowInfo.workflowStage || "";
      const nextWorkflowStep = workflowInfo.nextSteps || "";
      
      console.log(`Handoff context: continuation=${isHandoffContinuation}, from=${previousAgentType}, reason=${handoffReason}`);
      console.log(`Handoff history:`, handoffHistory);
      console.log(`Continuity data:`, continuityData);
      console.log(`Canvas project context: projectId=${projectId}, hasDetails=${!!projectDetails}, hasScript=${!!existingScript}`);
      console.log(`Workflow context: isPartOfWorkflow=${isPartOfWorkflow}, stage=${workflowStage}, nextStep=${nextWorkflowStep}`);
      
      // Enhanced input for script writing task - using more forceful language
      let enhancedInput = input;
      if (isHandoffContinuation && previousAgentType) {
        // Very explicit instruction to actually write a script, with formatting guidelines
        enhancedInput = `[SCRIPT WRITING TASK FROM ${previousAgentType.toUpperCase()} AGENT]

${input}

Previous context: ${handoffReason}

IMPORTANT INSTRUCTIONS:
YOU ARE THE SCRIPT WRITER AGENT, AND YOU MUST WRITE A COMPLETE SCRIPT NOW.

YOUR TASK:
- WRITE THE FULL SCRIPT in your response - not just talk about writing it
- Use proper script formatting with scene headings (INT/EXT), character names, and dialogue
- Include visual descriptions in action paragraphs
- Start with FADE IN: or similar standard script opening

DO NOT just offer to help with the script or describe what you would write.
CREATE AND PROVIDE THE ACTUAL COMPLETE SCRIPT in your response.
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
        
        // Include existing script if available - but now with more clear instructions
        if (existingScript) {
          enhancedInput += `\n\nThe project already has the following script that you should use as a starting point or modify:\n\n${existingScript.substring(0, 1000)}${existingScript.length > 1000 ? '\n...(script continues)' : ''}`;
        }
        
        // ENHANCEMENT: Add workflow guidance if part of a workflow
        if (isPartOfWorkflow) {
          enhancedInput += `\n\n[WORKFLOW CONTEXT: This script writing is part of a content creation workflow. After you write the script, the system will automatically proceed to create image prompts. Make sure your script is detailed with clear visual descriptions for each scene.]`;
        }
        
        // Add additional context if available
        if (continuityData && continuityData.additionalContext) {
          enhancedInput += `\n\nAdditional context: ${JSON.stringify(continuityData.additionalContext)}`;
        }
        
        console.log("Enhanced input with explicit script writing instructions");
      } else if (projectId && projectDetails) {
        // Add project context for direct requests to the script agent
        enhancedInput = `${input}\n\n[PROJECT CONTEXT: You are working on Canvas project "${projectDetails.title}" (ID: ${projectId}). This project has ${projectDetails.scenes?.length || 0} scenes.${projectDetails.fullScript ? " The project already has a full script that you can modify or expand upon." : " The project needs a full script."}]`;
        
        // Include existing script if available
        if (projectDetails.fullScript) {
          enhancedInput += `\n\nExisting script:\n\n${projectDetails.fullScript.substring(0, 1000)}${projectDetails.fullScript.length > 1000 ? '\n...(script continues)' : ''}`;
        }
        
        // Add the explicit script instruction
        enhancedInput += `\n\nIMPORTANT: YOU MUST WRITE A COMPLETE, PROPERLY FORMATTED SCRIPT. DO NOT just discuss writing a script.`;
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
          tracingEnabled: !this.context.tracingEnabled,
          contextData: {
            hasAttachments: attachments && attachments.length > 0,
            attachmentTypes: attachments.map((att: Attachment) => att.type.startsWith('image') ? 'image' : 'file'),
            isHandoffContinuation: isHandoffContinuation,
            previousAgentType: previousAgentType,
            handoffReason: handoffReason,
            instructions: instructions,
            agentSpecialty: "script_writing", // Explicitly identify this agent's specialty
            handoffHistory: handoffHistory,
            continuityData: continuityData,
            projectId: projectId, // Pass the project ID if available
            projectDetails: projectDetails,
            existingScript: existingScript,
            // ENHANCEMENT: Add workflow context
            workflowInfo: {
              isPartOfWorkflow: isPartOfWorkflow,
              workflowStage: workflowStage,
              nextSteps: nextWorkflowStep,
              shouldHandoffToImageAgent: isPartOfWorkflow // Indicate that we should handoff to image agent when done
            },
            toolContext: {
              canSaveToCanvas: !!projectId, // Tell the agent if it can save to Canvas
              mustSaveToCanvas: !!projectId && isPartOfWorkflow // Must save in workflow mode
            }
          },
          conversationHistory: conversationHistory,
          metadata: {
            ...this.context.metadata,
            previousAgentType: 'script',
            conversationId: this.context.groupId,
            projectId: projectId, // Include project ID in metadata
            projectDetails: projectDetails
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
      let scriptSaved = false;
      let actualScriptContent = '';
      
      if (data?.completion) {
        // Check if we got structured output from the edge function or need to detect script ourselves
        const isScript = data.structured_output?.isScript === true;
        const scriptText = data.structured_output?.scriptText || data.completion;
        
        // Check if there are script markers in the content
        const hasScriptMarkers = 
          /SCENE \d+|INT\.|EXT\.|FADE IN:|CUT TO:|^\s*[A-Z][A-Z\s]+:?\s/m.test(scriptText);
          
        if (isScript || hasScriptMarkers) {
          console.log("Script detected in response!");
          actualScriptContent = scriptText;
        } else {
          // Add a warning about inappropriate response
          console.warn("Script agent didn't return actual script content!");
          
          // We could enhance the output with a clear message that this is inappropriate
          data.completion = `${data.completion}\n\n[Note: I was unable to generate a properly formatted script as requested. Please ask me again specifically to write the script with proper formatting.]`;
        }
        
        // Extract a title from the script if possible
        let scriptTitle = '';
        if ((isScript || hasScriptMarkers) && projectId) {
          try {
            // Look for a title in the script - check various patterns
            const titlePatterns = [
              /^Title:[\s]*(.+?)[\r\n]/i,            // Title: My Script
              /^#\s*(.+?)[\r\n]/,                    // # My Script
              /TITLE:[\s]*(.+?)[\r\n]/i,             // TITLE: My Script
              /^\s*"(.+?)"[\r\n]/,                   // "My Script"
              /FADE IN:\s*[\r\n]+\s*(.+?)[\r\n]/i,   // FADE IN: followed by title
              /^\s*(.+?)\s*[\r\n]+by[\r\n]/i         // Title followed by "by"
            ];
            
            for (const pattern of titlePatterns) {
              const match = actualScriptContent.match(pattern);
              if (match && match[1]) {
                scriptTitle = match[1].trim();
                break;
              }
            }
            
            // If no title was found through patterns but we have a FADE IN or similar marker,
            // try to extract from the first few lines
            if (!scriptTitle && actualScriptContent.length > 0) {
              const lines = actualScriptContent.split('\n');
              const firstNonEmptyLines = lines.filter(line => line.trim().length > 0).slice(0, 3);
              
              // Try to find a reasonable title in the first few lines
              for (const line of firstNonEmptyLines) {
                if (line.trim() && 
                    !line.includes('FADE IN:') && 
                    !line.includes('INT.') && 
                    !line.includes('EXT.') &&
                    !line.match(/^[A-Z][A-Z\s]+:/)) { // Not character dialogue
                  scriptTitle = line.trim();
                  break;
                }
              }
            }
            
            // If we found a title and it doesn't match the current project title, update it
            if (scriptTitle && projectDetails && projectDetails.title !== scriptTitle) {
              console.log(`Updating project title from "${projectDetails.title}" to "${scriptTitle}"`);
              
              // Update the project title in Supabase
              await this.context.supabase
                .from('canvas_projects')
                .update({ title: scriptTitle })
                .eq('id', projectId);
              
              // Append a message about the title update
              data.completion += `\n\n[I've updated your project title to "${scriptTitle}" based on the script content.]`;
            }
          } catch (titleError) {
            console.error("Error processing script title:", titleError);
          }
        }
        
        // If we have project ID and script content but no explicit tool use happened, attempt to save it
        if (projectId && (isScript || hasScriptMarkers) && !data.savedContent && !data.toolExecutions?.includes('canvas')) {
          try {
            console.log("Auto-saving script to Canvas project", projectId);
            
            // If we have actual script content, use it; otherwise use the full response
            const scriptContent = actualScriptContent || data.completion;
            
            // Use the Supabase API to save the script to the project
            const { error: saveError } = await this.context.supabase
              .from('canvas_projects')
              .update({ full_script: scriptContent })
              .eq('id', projectId);
            
            if (saveError) {
              console.error("Error saving script to Canvas:", saveError);
            } else {
              // Mark script as saved for our workflow
              scriptSaved = true;
              
              // Append a success message to the response
              data.completion += "\n\n[Script has been automatically saved to your Canvas project]";
            }
          } catch (saveError) {
            console.error("Failed to auto-save script to Canvas:", saveError);
          }
        }
      }
      
      // Handle handoff if present or force handoff based on workflow
      let nextAgent: AgentType | null = null;
      let handoffReasonResponse = null;
      let additionalContextForNext = null;
      
      if (data?.handoffRequest) {
        console.log("Handoff requested to:", data.handoffRequest.targetAgent);
        nextAgent = data.handoffRequest.targetAgent as AgentType;
        handoffReasonResponse = data.handoffRequest.reason;
        additionalContextForNext = data.handoffRequest.additionalContext || continuityData?.additionalContext;
        
        // Make sure to pass along the project ID
        if (projectId && additionalContextForNext) {
          additionalContextForNext.projectId = projectId;
          if (projectDetails) {
            additionalContextForNext.projectTitle = projectDetails.title;
          }
          
          // If a script was created, include that information
          if ((data.savedContent?.isScript || scriptSaved) && actualScriptContent) {
            additionalContextForNext.scriptSaved = true;
            additionalContextForNext.scriptContent = actualScriptContent;
          }
        }
      } 
      // ENHANCEMENT: Force handoff to image agent if part of workflow and script was saved
      else if (isPartOfWorkflow && (scriptSaved || data.savedContent?.isScript) && projectId) {
        console.log("Forcing handoff to image agent as part of content creation workflow");
        nextAgent = "image";
        handoffReasonResponse = "Script has been created. Now proceeding to generate image prompts for the scenes.";
        additionalContextForNext = {
          ...(continuityData?.additionalContext || {}),
          originalRequest: input,
          projectId: projectId,
          projectTitle: projectDetails?.title || "",
          scriptSaved: true,
          scriptContent: actualScriptContent || data.savedContent?.content,
          workflowInfo: {
            isPartOfWorkflow: true,
            workflowStage: "image_prompt_generation",
            nextSteps: "image_generation",
            previousSteps: ["script_creation"],
            originalScriptText: actualScriptContent || data.savedContent?.content || data.completion
          },
          imageParameters: {
            aspectRatio: "9:16",
            guidance: 5.1,
            steps: 13,
            requiresProductShot: true
          }
        };
      }
      
      return {
        response: data?.completion || "I processed your request but couldn't generate a script response.",
        output: data?.completion || "I processed your request but couldn't generate a script response.",
        nextAgent: nextAgent,
        handoffReason: handoffReasonResponse,
        structured_output: data?.structured_output || {
          isScript: scriptSaved || data.savedContent?.isScript,
          scriptText: actualScriptContent
        },
        additionalContext: additionalContextForNext || continuityData?.additionalContext || {
          projectId: projectId,
          projectTitle: projectDetails?.title || "",
          existingScript: existingScript,
          scriptSaved: scriptSaved,
          scriptContent: actualScriptContent
        }
      };
    } catch (error) {
      console.error("ScriptWriterAgent run error:", error);
      throw error;
    }
  }
}
