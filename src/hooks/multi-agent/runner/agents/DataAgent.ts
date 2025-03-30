
import { BaseAgentImpl } from "./BaseAgentImpl";
import { AgentResult, AgentType, RunnerContext } from "../types";
import { Attachment } from "@/types/message";
import { getTool } from "../../tools";

export class DataAgent extends BaseAgentImpl {
  constructor(options: { context: RunnerContext, traceId?: string }) {
    super(options);
  }

  getType(): AgentType {
    return "data";
  }

  async run(input: string, attachments: Attachment[] = []): Promise<AgentResult> {
    try {
      // Record trace event for agent start
      this.recordTraceEvent("agent_start", {
        input_length: input.length,
        has_attachments: attachments.length > 0,
        agent_type: this.getType()
      });

      // Check if this is a handoff continuation
      const isHandoff = this.context.metadata?.isHandoffContinuation;
      const previousAgent = this.context.metadata?.previousAgentType;
      const handoffReason = this.context.metadata?.handoffReason;

      // Get dynamic instructions based on context
      const instructions = await this.getInstructions(this.context);

      // Configure data extraction specific prompts
      let enhancedInput = input;
      if (isHandoff && previousAgent) {
        enhancedInput = `[Handoff from ${previousAgent} agent reason: ${handoffReason || 'Data extraction/input needed'}]\n\n${input}`;
      }

      // Get access to canvas content tool for data operations
      const canvasContentTool = getTool("canvas_content");
      const canvasTool = getTool("canvas");

      // Check if project context is available
      const projectId = this.context.projectId;
      if (!projectId) {
        // If no project context, determine if we need to hand back to main
        this.recordTraceEvent("agent_end", {
          result: "handoff to main - no project context",
          agent_type: this.getType()
        });

        return {
          response: "I need to extract or manipulate data, but there's no project selected. Let me hand this over to the main assistant who can help with general queries.",
          nextAgent: "main",
          handoffReason: "No project context available for data operations"
        };
      }

      // Construct the prompt for the OpenAI assistant
      const prompt = `
You are a specialized Data Agent focused on working with data in the Canvas project system. Your main capabilities are:

1. EXTRACTING data from Canvas scenes (images, videos, scripts, etc.)
2. INPUTTING data into Canvas scenes (uploading/importing media)
3. MANAGING media assets across the Canvas system

You have the following tools available:
- canvas_content: For accessing and modifying scene content
- canvas: For generating new content and updating scenes

Instructions:
${instructions}

You are currently working with Project ID: ${projectId}

After extracting or inputting data, hand off to the main agent once your specialized task is complete.

${enhancedInput}
`;

      // Use context to determine model to use
      const usePerformanceModel = this.context.usePerformanceModel;
      const modelToUse = usePerformanceModel ? 'gpt-3.5-turbo' : 'gpt-4o';

      // Create a list of available tools for this agent
      const availableTools = [];
      if (canvasContentTool) availableTools.push(canvasContentTool);
      if (canvasTool) availableTools.push(canvasTool);

      // Call OpenAI API via supabase function
      const { data, error } = await this.context.supabase.functions.invoke('ai-agent', {
        body: {
          messages: [{ role: 'user', content: prompt }],
          model: modelToUse,
          tools: availableTools.map(tool => ({
            type: 'function',
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters
            }
          })),
          context: {
            projectId: this.context.projectId,
            userId: this.context.userId,
            runId: this.context.runId,
            groupId: this.context.groupId,
            agentType: this.getType()
          }
        }
      });

      if (error) {
        throw new Error(`API error: ${error.message}`);
      }

      // Check if we need to execute tools or hand off
      const response = data?.response || "";
      let handoffToMain = false;
      
      // Check for patterns suggesting data work is complete
      const dataWorkCompletePatterns = [
        /data (extraction|import|upload) (is )?complete/i,
        /successfully (extracted|imported|uploaded|updated)/i,
        /(all done|task complete|finished)/i,
        /handed back to (the )?(main|assistant)/i
      ];
      
      handoffToMain = dataWorkCompletePatterns.some(pattern => pattern.test(response));

      // Process the response and return results
      this.recordTraceEvent("agent_end", {
        response_length: response.length,
        handoff_to_main: handoffToMain,
        agent_type: this.getType()
      });

      const result: AgentResult = {
        response,
        nextAgent: handoffToMain ? "main" : null,
        handoffReason: handoffToMain ? "Data operations completed, returning to main assistant" : undefined
      };

      return result;
    } catch (error) {
      console.error(`Data Agent error:`, error);
      this.recordTraceEvent("agent_error", {
        error_message: error instanceof Error ? error.message : "Unknown error",
        agent_type: this.getType()
      });

      // On error, hand back to main agent
      return {
        response: `I encountered an error while handling data operations: ${error instanceof Error ? error.message : "Unknown error"}. Let me hand this back to the main assistant.`,
        nextAgent: "main",
        handoffReason: "Error in data operations"
      };
    }
  }

  protected getDefaultInstructions(): string {
    return `You are a specialized Data Agent focused on extracting and inputting data in the Canvas system.
    
Your responsibilities:
1. Extract media (images, videos) from scenes
2. Update scene content and attributes 
3. Input new data into the Canvas system
4. Help users find and manipulate their content

Always use the canvas_content tool to view and modify content, and the canvas tool for operations like generating new images or videos.

When your specialized data task is complete, hand off to the main agent.`;
  }
}
