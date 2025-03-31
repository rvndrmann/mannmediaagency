import { BaseAgentImpl } from "./BaseAgentImpl";
import { AgentOptions, AgentResult, AgentType, RunnerContext } from "../types";

export class MainAgent extends BaseAgentImpl {
  private config: any;
  private model: string;

  constructor(options: AgentOptions) {
    super(options);
    this.config = options.config || {};
    this.model = options.model || "gpt-3.5-turbo";
  }

  getType(): AgentType {
    return "main";
  }

  async process(input: any, context: RunnerContext): Promise<AgentResult> {
    try {
      console.log("Running MainAgent with input:", input.substring(0, 50), "attachments:", context.attachments.length);
      
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
      
      // ENHANCEMENT: Add specific requirement gathering to the input
      const requirementGatheringPrompt = `
If this is an initial request for content creation, I should:
1. Gather specific requirements about what the user wants to create
2. Ask about the purpose, style, tone, and target audience
3. Determine if we need to create or modify a script
4. Understand if we need to create visual elements or image prompts
5. Identify which scenes need attention
`;

      contextualInput = `${contextualInput}\n\n[WORKFLOW GUIDANCE: ${requirementGatheringPrompt}]`;
      
      // Check for script writing requests - use more specific patterns and check message length
      // to prevent immediate handoff for simple greetings or short messages
      const scriptKeywords = ['write a script', 'create a script', 'script for', 'screenplay', 'script about'];
      const lowercaseInput = input.toLowerCase();
      
      // IMPROVED LOGIC: Don't trigger script agent for simple greetings or very short messages
      const isScriptRequest = input.length > 15 && scriptKeywords.some(keyword => lowercaseInput.includes(keyword));
      
      // Check for scene creation requests
      const sceneKeywords = ['scene description', 'visual scene', 'describe the scene', 'scene for', 'image prompt'];
      const isSceneRequest = input.length > 15 && sceneKeywords.some(keyword => lowercaseInput.includes(keyword));
      
      // ENHANCEMENT: Check for comprehensive content creation requests
      const contentCreationKeywords = ['create content', 'full content', 'complete project', 'end-to-end', 'start to finish'];
      const isContentCreationRequest = input.length > 15 && contentCreationKeywords.some(keyword => lowercaseInput.includes(keyword));
      
      // Log detection results
      console.log(`Request analysis: isScriptRequest=${isScriptRequest}, isSceneRequest=${isSceneRequest}, isContentCreationRequest=${isContentCreationRequest}, inputLength=${input.length}`);
      
      // Create a trace event for tracking
      const traceEvent = {
        eventType: 'agent_request',
        timestamp: new Date().toISOString(),
        data: {
          agentType: 'main',
          inputLength: contextualInput.length,
          isHandoffContinuation,
          previousAgentType: previousAgentType,
          hasAttachments: context.attachments && context.attachments.length > 0
        }
      };
      
      // Call the Supabase function with enhanced trace data
      const { data, error } = await this.context.supabase.functions.invoke('multi-agent-chat', {
        body: {
          input: contextualInput, // Use enhanced input with project context
          attachments: context.attachments,
          agentType: "main",
          userId: user.id,
          usePerformanceModel: this.context.usePerformanceModel,
          enableDirectToolExecution: this.context.enableDirectToolExecution,
          tracingDisabled: this.context.tracingDisabled,
          contextData: {
            hasAttachments: context.attachments && context.attachments.length > 0,
            attachmentTypes: context.attachments.map(att => att.type.startsWith('image') ? 'image' : 'file'),
            isHandoffContinuation: isHandoffContinuation,
            previousAgentType: previousAgentType,
            handoffReason: handoffReason,
            instructions: instructions,
            handoffHistory: handoffHistory,
            continuityData: continuityData,
            isScriptRequest: isScriptRequest,
            isSceneRequest: isSceneRequest,
            isContentCreationRequest: isContentCreationRequest,
            projectId: projectId,
            hasProjectDetails: !!projectDetails,
            projectTitle: projectDetails?.title || "",
            scenesCount: projectDetails?.scenes?.length || 0,
            hasFullScript: !!projectDetails?.fullScript,
            scriptExcerpt: projectDetails?.fullScript ? projectDetails.fullScript.substring(0, 500) : null,
            preventAutoHandoff: input.length < 20 || isSimpleGreeting(input)
          },
          conversationHistory: conversationHistory,
          metadata: {
            ...this.context.metadata,
            previousAgentType: 'main',
            conversationId: this.context.groupId,
            projectId: projectId,
            projectDetails: projectDetails,
            traceEvent,
            workflowInfo: {
              isWorkflowJob: isContentCreationRequest,
              workflowStage: "initial_assessment",
              nextStepsRecommendation: isScriptRequest ? "script_creation" : 
                                        isSceneRequest ? "scene_description" : 
                                        "requirement_gathering"
            },
            preventAutoHandoff: input.length < 20 || isSimpleGreeting(input)
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
      
      // NEW: Skip handoff for simple greetings or very short messages
      const isSimpleMessage = input.length < 20 || isSimpleGreeting(input);
      
      if (data?.handoffRequest && !isSimpleMessage) {
        console.log(`MainAgent handoff requested to: ${data.handoffRequest.targetAgent}`);
        nextAgent = data.handoffRequest.targetAgent;
        handoffReasonResponse = data.handoffRequest.reason;
        additionalContextForNext = data.handoffRequest.additionalContext || continuityData?.additionalContext;
        
        // ENHANCEMENT: For comprehensive content creation, always force to script writing first
        if (isContentCreationRequest && nextAgent !== "script") {
          console.log("Overriding handoff target: redirecting to script agent for content creation workflow");
          nextAgent = "script";
          handoffReasonResponse = "Starting structured content creation workflow with script writing.";
        }
        
        // For script handoffs, provide more specific context
        if (nextAgent === "script") {
          additionalContextForNext = {
            ...(additionalContextForNext || {}),
            originalRequest: input,
            requiresFullScript: true,
            scriptType: isScriptRequest ? detectScriptType(input) : "general",
            projectId: projectId,
            projectTitle: projectDetails?.title || "",
            existingScript: projectDetails?.fullScript || null,
            workflowInfo: {
              isPartOfWorkflow: isContentCreationRequest,
              workflowStage: "script_creation",
              nextSteps: "image_generation",
              shouldUpdateCanvasProject: true
            }
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
        } else if (nextAgent === "image") {
          additionalContextForNext = {
            ...(additionalContextForNext || {}),
            originalRequest: input,
            projectId: projectId,
            projectTitle: projectDetails?.title || "",
            sceneCount: projectDetails?.scenes?.length || 0,
            existingScript: projectDetails?.fullScript || null,
            imageParameters: {
              aspectRatio: "9:16",
              guidance: 5.1,
              steps: 13,
              requiresProductShot: true
            }
          };
        }
      } else if (isScriptRequest && data?.completion && !isSimpleMessage) {
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
          existingScript: projectDetails?.fullScript || null,
          workflowInfo: {
            isPartOfWorkflow: isContentCreationRequest,
            workflowStage: "script_creation",
            nextSteps: "image_generation",
            shouldUpdateCanvasProject: true
          }
        };
      } else if (isSceneRequest && data?.completion && !isSimpleMessage) {
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
      } else if (isContentCreationRequest && data?.completion && !isSimpleMessage) {
        // ENHANCEMENT: Force a handoff for comprehensive content creation
        console.log("Forcing handoff to script agent to begin content creation workflow");
        nextAgent = "script";
        handoffReasonResponse = "Starting structured content creation workflow with script writing.";
        additionalContextForNext = {
          originalRequest: input,
          requiresFullScript: true,
          scriptType: detectScriptType(input),
          forceScriptGeneration: true,
          projectId: projectId,
          projectTitle: projectDetails?.title || "",
          existingScript: projectDetails?.fullScript || null,
          workflowInfo: {
            isPartOfWorkflow: true,
            workflowStage: "script_creation",
            nextSteps: "image_generation",
            shouldUpdateCanvasProject: true
          }
        };
      }
      
      return {
        output: "Sample response from main agent",
        response: "Sample response from main agent",
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

  protected getInstructions(): string {
    return this.config.instructions || "You are a helpful assistant.";
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

// NEW: Helper function to detect simple greetings
function isSimpleGreeting(input: string): boolean {
  const trimmedInput = input.trim().toLowerCase();
  const simpleGreetings = [
    'hi', 'hello', 'hey', 'hi there', 'hello there', 'hey there',
    'greetings', 'good morning', 'good afternoon', 'good evening',
    'howdy', 'yo', 'hiya', 'what\'s up', 'sup'
  ];
  
  return simpleGreetings.some(greeting => 
    trimmedInput === greeting || 
    trimmedInput === greeting + '!' ||
    trimmedInput === greeting + '.' ||
    trimmedInput === greeting + '?'
  );
}
