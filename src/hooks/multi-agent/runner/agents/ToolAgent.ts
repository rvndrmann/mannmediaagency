
import { Attachment } from "@/types/message";
import { AgentResult, AgentOptions, AgentType } from "../types";
import { BaseAgentImpl } from "../BaseAgentImpl";

export class ToolAgent extends BaseAgentImpl {
  constructor(options: AgentOptions) {
    super(options);
  }

  getType(): AgentType {
    return "tool";
  }

  async run(input: string, attachments: Attachment[]): Promise<AgentResult> {
    try {
      console.log("Running ToolAgent with input:", input.substring(0, 50), "attachments:", attachments.length);
      
      // Get the current user
      const { data: { user } } = await this.context.supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Get dynamic instructions if needed
      const instructions = await this.getInstructions(this.context);
      
      // Get conversation history from context if available
      const conversationHistory = this.context.metadata?.conversationHistory || [];
      
      console.log(`ToolAgent processing with ${conversationHistory.length} historical messages`);
      
      // Check if this is a handoff continuation
      const isHandoffContinuation = this.context.metadata?.isHandoffContinuation || false;
      const previousAgentType = this.context.metadata?.previousAgentType || 'main';
      const handoffReason = this.context.metadata?.handoffReason || '';
      const handoffHistory = this.context.metadata?.handoffHistory || [];
      const continuityData = this.context.metadata?.continuityData || {};
      const projectId = this.context.metadata?.projectId || continuityData?.additionalContext?.projectId || null;
      const projectDetails = this.context.metadata?.projectDetails || null;
      
      // ENHANCEMENT: Extract workflow info and structured prompts
      const workflowInfo = continuityData?.additionalContext?.workflowInfo || {};
      const isPartOfWorkflow = workflowInfo.isPartOfWorkflow || false;
      const workflowStage = workflowInfo.workflowStage || "";
      const structuredImagePrompts = continuityData?.additionalContext?.structuredImagePrompts || [];
      
      // ENHANCEMENT: Get tool parameters from workflow info
      const toolParams = workflowInfo.toolParams || {
        aspectRatio: "9:16",
        guidance: 5.1,
        steps: 13
      };
      
      const requireProductShotTool = workflowInfo.requireProductShotTool || false;
      
      console.log(`Handoff context: continuation=${isHandoffContinuation}, from=${previousAgentType}, reason=${handoffReason}`);
      console.log(`Workflow info:`, workflowInfo);
      console.log(`Structured image prompts:`, structuredImagePrompts);
      console.log(`Tool parameters:`, toolParams);
      
      // Enhanced input for the tool agent
      let enhancedInput = input;
      
      if (isHandoffContinuation && previousAgentType) {
        enhancedInput = `[TOOL EXECUTION TASK FROM ${previousAgentType.toUpperCase()} AGENT]

${input}

Previous context: ${handoffReason}

TASK: Execute the appropriate AI tools based on the provided context and prompts.
`;
        
        // ENHANCEMENT: Add specific instructions for workflow
        if (isPartOfWorkflow && structuredImagePrompts.length > 0) {
          enhancedInput += `\n\nYou have been provided with ${structuredImagePrompts.length} structured image prompts that need to be processed. Use the product-shot-v1 tool with the following parameters:
- Aspect ratio: ${toolParams.aspectRatio}
- Guidance: ${toolParams.guidance}
- Steps: ${toolParams.steps}

The prompts are structured as follows:
${JSON.stringify(structuredImagePrompts, null, 2)}
`;
        }
        
        if (requireProductShotTool) {
          enhancedInput += `\n\nYou should use the product-shot-v1 tool since this workflow requires high-quality product shots.`;
        }
        
        // Add attachment context if available
        if (attachments && attachments.length > 0) {
          enhancedInput += `\n\nYou have ${attachments.length} attachments available that can be used with the tools.`;
        }
      }
      
      // Call the Supabase function with enhanced context
      const { data, error } = await this.context.supabase.functions.invoke('multi-agent-chat', {
        body: {
          input: enhancedInput,
          attachments,
          agentType: "tool",
          userId: user.id,
          usePerformanceModel: this.context.usePerformanceModel,
          enableDirectToolExecution: true, // Always enable direct tool execution for the tool agent
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
            // ENHANCEMENT: Add workflow info and structured prompts
            workflowInfo: workflowInfo,
            structuredImagePrompts: structuredImagePrompts,
            toolParams: toolParams,
            requireProductShotTool: requireProductShotTool
          },
          conversationHistory: conversationHistory,
          metadata: {
            ...this.context.metadata,
            previousAgentType: 'tool',
            conversationId: this.context.groupId,
            projectId: projectId,
            projectDetails: projectDetails
          },
          runId: this.context.runId,
          groupId: this.context.groupId
        }
      });
      
      if (error) {
        throw new Error(`Tool agent error: ${error.message}`);
      }
      
      console.log("Tool agent response:", data?.completion?.substring(0, 100) + "...");
      
      // Handle handoff if present
      let nextAgent = null;
      let handoffReasonResponse = null;
      let additionalContextForNext = null;
      
      if (data?.handoffRequest) {
        console.log("Handoff requested to:", data.handoffRequest.targetAgent);
        nextAgent = data.handoffRequest.targetAgent;
        handoffReasonResponse = data.handoffRequest.reason;
        additionalContextForNext = data.handoffRequest.additionalContext || continuityData?.additionalContext;
      } 
      // ENHANCEMENT: Always return to main agent after workflow completion
      else if (isPartOfWorkflow) {
        console.log("Workflow complete, returning to main agent");
        nextAgent = "main";
        handoffReasonResponse = "The tool agent has completed the image generation workflow and is returning control to the main agent.";
        additionalContextForNext = {
          ...(continuityData?.additionalContext || {}),
          projectId: projectId,
          projectTitle: projectDetails?.title || "",
          workflowInfo: {
            isPartOfWorkflow: false,
            workflowCompleted: true,
            completedSteps: ["script_creation", "image_prompt_generation", "image_generation"]
          },
          workflowCompletion: {
            message: "The full content creation workflow has been completed successfully.",
            timestamp: new Date().toISOString()
          }
        };
      }
      
      return {
        response: data?.completion || "I processed your request but couldn't generate a tool agent response.",
        nextAgent: nextAgent,
        handoffReason: handoffReasonResponse,
        structured_output: data?.structured_output || null,
        additionalContext: additionalContextForNext || {
          projectId: projectId,
          projectTitle: projectDetails?.title || ""
        }
      };
    } catch (error) {
      console.error("ToolAgent run error:", error);
      throw error;
    }
  }
  
  getType() {
    return "tool";
  }
}
