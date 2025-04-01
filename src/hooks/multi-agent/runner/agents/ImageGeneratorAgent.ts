import { Attachment } from "@/types/message";
import { AgentResult, AgentOptions } from "../types";
import { BaseAgentImpl } from "./BaseAgentImpl";

export class ImageGeneratorAgent extends BaseAgentImpl {
  constructor(options: AgentOptions) {
    super(options);
  }

  async run(input: string, attachments: Attachment[]): Promise<AgentResult> {
    try {
      console.log("Running ImageGeneratorAgent with input:", input.substring(0, 50), "attachments:", attachments.length);
      
      // Get the current user
      const { data: { user } } = await this.context.supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Get dynamic instructions if needed
      const instructions = await this.getInstructions(this.context);
      
      // Get conversation history from context if available
      const conversationHistory = this.context.metadata?.conversationHistory || [];
      
      console.log(`ImageGeneratorAgent processing with ${conversationHistory.length} historical messages`);
      
      // Check if this is a handoff continuation
      const isHandoffContinuation = this.context.metadata?.isHandoffContinuation || false;
      const previousAgentType = this.context.metadata?.previousAgentType || 'main';
      const handoffReason = this.context.metadata?.handoffReason || '';
      const handoffHistory = this.context.metadata?.handoffHistory || [];
      const continuityData = this.context.metadata?.continuityData || {};
      const projectId = this.context.metadata?.projectId || continuityData?.additionalContext?.projectId || null;
      const projectDetails = this.context.metadata?.projectDetails || null;
      
      // ENHANCEMENT: Extract workflow info and image parameters
      const workflowInfo = continuityData?.additionalContext?.workflowInfo || {};
      const isPartOfWorkflow = workflowInfo.isPartOfWorkflow || false;
      const workflowStage = workflowInfo.workflowStage || "";
      const nextWorkflowStep = workflowInfo.nextSteps || "";
      
      // ENHANCEMENT: Get image parameters from continuity data
      const imageParameters = continuityData?.additionalContext?.imageParameters || {
        aspectRatio: "9:16",
        guidance: 5.1,
        steps: 13,
        requiresProductShot: true
      };
      
      console.log(`Handoff context: continuation=${isHandoffContinuation}, from=${previousAgentType}, reason=${handoffReason}`);
      console.log(`Workflow info:`, workflowInfo);
      console.log(`Image parameters:`, imageParameters);
      
      // Enhanced input for image generation
      let enhancedInput = input;
      
      if (isHandoffContinuation && previousAgentType) {
        enhancedInput = `[IMAGE PROMPT TASK FROM ${previousAgentType.toUpperCase()} AGENT]

${input}

Previous context: ${handoffReason}

TASK: Generate detailed image prompts for the scenes in this project. 
Focus on creating vivid, descriptive prompts that will result in high-quality visuals.

The image prompts should follow these guidelines:
- Be highly descriptive with visual details
- Include style, lighting, atmosphere, and composition information
- Specify camera angles and distances where relevant
- Include specific image parameters: aspect ratio ${imageParameters.aspectRatio}, guidance ${imageParameters.guidance}, steps ${imageParameters.steps}
`;
        
        // Add project context if available
        if (projectId && projectDetails) {
          enhancedInput += `\n\nThis is for Canvas project "${projectDetails.title}" (ID: ${projectId}).`;
          enhancedInput += `\nThe project has ${projectDetails.scenes?.length || 0} scenes.`;
          
          // Add script context
          if (projectDetails.fullScript) {
            enhancedInput += `\n\nRelevant script content:\n${projectDetails.fullScript.substring(0, 2000)}${projectDetails.fullScript.length > 2000 ? '\n...(script continues)' : ''}`;
          }
        }
        
        // ENHANCEMENT: Add workflow-specific instructions 
        if (isPartOfWorkflow) {
          enhancedInput += `\n\n[WORKFLOW CONTEXT: This image prompt creation is part of a content creation workflow. After you create image prompts, the tool agent will use them to generate actual images with the following parameters: aspect ratio ${imageParameters.aspectRatio}, guidance ${imageParameters.guidance}, steps ${imageParameters.steps}]`;
          
          if (imageParameters.requiresProductShot) {
            enhancedInput += `\n\nNOTE: The final images should be high-quality product shots. Your prompts should be optimized for product visualization.`;
          }
        }
      }
      
      // Call the Supabase function with enhanced context
      const { data, error } = await this.context.supabase.functions.invoke('multi-agent-chat', {
        body: {
          input: enhancedInput,
          attachments,
          agentType: "image",
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
            projectId: projectId,
            projectDetails: projectDetails,
            // ENHANCEMENT: Add image parameters and workflow info
            imageParameters: imageParameters,
            workflowInfo: {
              isPartOfWorkflow: isPartOfWorkflow,
              workflowStage: workflowStage,
              nextSteps: nextWorkflowStep
            }
          },
          conversationHistory: conversationHistory,
          metadata: {
            ...this.context.metadata,
            previousAgentType: 'image',
            conversationId: this.context.groupId,
            projectId: projectId,
            projectDetails: projectDetails
          },
          runId: this.context.runId,
          groupId: this.context.groupId
        }
      });
      
      if (error) {
        throw new Error(`Image agent error: ${error.message}`);
      }
      
      console.log("Image agent response:", data?.completion?.substring(0, 100) + "...");
      
      // ENHANCEMENT: Process image prompts for structured data
      let structuredImagePrompts = null;
      if (data?.completion) {
        // Look for image prompts in the response and extract them
        const promptRegex = /Image Prompt\s*(?:for Scene \d+)?\s*:\s*(.+?)(?=Image Prompt|$)/gis;
        const promptMatches = [...data.completion.matchAll(promptRegex)];
        
        if (promptMatches.length > 0) {
          structuredImagePrompts = promptMatches.map((match, index) => ({
            sceneIndex: index,
            promptText: match[1].trim(),
            parameters: imageParameters
          }));
          
          console.log(`Extracted ${structuredImagePrompts.length} structured image prompts`);
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
        
        // Make sure to pass along the project ID and image parameters
        if (projectId && additionalContextForNext) {
          additionalContextForNext.projectId = projectId;
          if (projectDetails) {
            additionalContextForNext.projectTitle = projectDetails.title;
          }
          additionalContextForNext.imageParameters = imageParameters;
          if (structuredImagePrompts) {
            additionalContextForNext.structuredImagePrompts = structuredImagePrompts;
          }
        }
      }
      // ENHANCEMENT: Force handoff to tool agent if part of workflow and we have image prompts
      else if (isPartOfWorkflow && structuredImagePrompts && structuredImagePrompts.length > 0) {
        console.log("Forcing handoff to tool agent to generate images as part of workflow");
        nextAgent = "tool";
        handoffReasonResponse = "Image prompts have been created. Now proceeding to generate actual images.";
        additionalContextForNext = {
          ...(continuityData?.additionalContext || {}),
          projectId: projectId,
          projectTitle: projectDetails?.title || "",
          imageParameters: imageParameters,
          structuredImagePrompts: structuredImagePrompts,
          workflowInfo: {
            isPartOfWorkflow: true,
            workflowStage: "image_generation",
            previousSteps: ["script_creation", "image_prompt_generation"],
            requireProductShotTool: imageParameters.requiresProductShot,
            toolParams: {
              aspectRatio: imageParameters.aspectRatio,
              guidance: imageParameters.guidance,
              steps: imageParameters.steps
            }
          }
        };
      }
      
      return {
        output: data?.completion || "I processed your request but couldn't generate an image response.",
        response: data?.completion || "I processed your request but couldn't generate an image response.",
        nextAgent: nextAgent,
        handoffReason: handoffReasonResponse,
        structured_output: structuredImagePrompts || data?.structured_output || null,
        additionalContext: additionalContextForNext || {
          projectId: projectId,
          projectTitle: projectDetails?.title || "",
          imageParameters: imageParameters
        }
      };
    } catch (error) {
      console.error("ImageGeneratorAgent run error:", error);
      throw error;
    }
  }
  
  getType(): AgentType {
    return "image";
  }
}
