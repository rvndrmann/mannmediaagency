
import { BaseAgentImpl } from "./BaseAgentImpl";
import { AgentOptions, AgentResult, AgentType, RunnerContext } from "../types";
import { v4 as uuidv4 } from "uuid";

export class DataAgent extends BaseAgentImpl {
  constructor(options: AgentOptions) {
    super(options);
  }

  getType(): AgentType {
    return "data";
  }

  async process(input: string, context: RunnerContext): Promise<AgentResult> {
    try {
      console.log(`Processing request with Data Agent: ${input.substring(0, 50)}...`);
      
      // Track processing in trace if enabled
      if (!context.tracingDisabled && context.addMessage) {
        context.addMessage(`Processing with Data Agent: ${input.substring(0, 100)}`, "agent_start");
      }

      // Default response if direct API call fails
      let response: AgentResult = {
        output: "I'm the Data Agent, specialized in data analysis and processing. How can I help you today?",
        response: "I'm the Data Agent, specialized in data analysis and processing. How can I help you today?"
      };

      try {
        // Call the Multi-Agent Chat API
        const requestId = uuidv4();
        
        const apiResponse = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${process.env.OPENAI_API_KEY || ""}`
            },
            body: JSON.stringify({
              model: context.usePerformanceModel ? "gpt-4o-mini" : "gpt-4o",
              messages: [
                {
                  role: "system",
                  content: "You are a Data Agent specialized in data analysis and processing. You excel at understanding, transforming, and visualizing data. You can help with data cleaning, statistical analysis, chart creation, and data interpretation."
                },
                { role: "user", content: input }
              ],
              tools: this.getTools(context.directToolExecution || context.enableDirectToolExecution || false),
              tool_choice: "auto"
            })
          }
        );

        if (!apiResponse.ok) {
          const errorText = await apiResponse.text();
          throw new Error(`API call failed: ${apiResponse.status} - ${errorText}`);
        }

        const data = await apiResponse.json();
        
        // Check for tool calls
        if (data.choices[0]?.message?.tool_calls?.length > 0) {
          const toolCall = data.choices[0].message.tool_calls[0];
          
          // Check if it's a handoff
          if (toolCall.function.name.startsWith("transfer_to_")) {
            const targetAgent = toolCall.function.name.replace("transfer_to_", "").replace("_agent", "") as AgentType;
            const args = JSON.parse(toolCall.function.arguments || "{}");
            
            response = {
              output: `I'll transfer you to our ${this.getAgentName(targetAgent)} who can better assist with this. ${args.reason || ""}`,
              handoff: {
                targetAgent,
                reason: args.reason || `Transferring to ${targetAgent} agent for specialized assistance`,
                additionalContext: args.additionalContext || {}
              },
              // Add compatibility fields
              handoffReason: args.reason,
              nextAgent: targetAgent,
              additionalContext: args.additionalContext || {}
            };
          } else {
            // Handle other tool calls in the future
            response = {
              output: data.choices[0].message.content || "I need to use a tool to help with your request."
            };
          }
        } else {
          // Regular text response
          response = {
            output: data.choices[0].message.content || "I'm not sure how to respond to that."
          };
        }
      } catch (error) {
        console.error("Error processing with Data Agent:", error);
        response = {
          output: "I'm having trouble processing your request right now. Could you try again or rephrase your question?"
        };
      }

      // Track completion in trace if enabled
      if (!context.tracingDisabled && context.addMessage) {
        context.addMessage(`Completed Data Agent processing: ${response.output.substring(0, 100)}`, "agent_end");
      }

      return response;
    } catch (error) {
      console.error("Unexpected error in Data Agent:", error);
      return {
        output: "An unexpected error occurred. Please try again later."
      };
    }
  }

  private getTools(enableDirectTools: boolean): any[] {
    // Common handoff tools
    return [
      {
        type: "function",
        function: {
          name: "transfer_to_main_agent",
          description: "Transfer the conversation to the main assistant agent for general help",
          parameters: {
            type: "object",
            properties: {
              reason: {
                type: "string",
                description: "The reason for transferring to the main assistant"
              }
            },
            required: ["reason"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "transfer_to_script_agent",
          description: "Transfer to the script writer agent for creating or editing scripts",
          parameters: {
            type: "object",
            properties: {
              reason: {
                type: "string",
                description: "The reason for transferring to the script writer"
              },
              additionalContext: {
                type: "object",
                description: "Additional context to provide to the script writer",
                properties: {
                  scriptType: {
                    type: "string",
                    description: "The type of script to create (e.g., video, advertisement, etc.)"
                  }
                }
              }
            },
            required: ["reason"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "transfer_to_image_agent",
          description: "Transfer to the image generator agent for creating visual content",
          parameters: {
            type: "object",
            properties: {
              reason: {
                type: "string",
                description: "The reason for transferring to the image generator"
              }
            },
            required: ["reason"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "transfer_to_tool_agent",
          description: "Transfer to the tool agent for using specialized tools",
          parameters: {
            type: "object",
            properties: {
              reason: {
                type: "string",
                description: "The reason for transferring to the tool agent"
              },
              toolName: {
                type: "string",
                description: "The specific tool to use"
              }
            },
            required: ["reason"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "transfer_to_scene_agent",
          description: "Transfer to the scene creator agent for planning and creating visual scenes",
          parameters: {
            type: "object",
            properties: {
              reason: {
                type: "string",
                description: "The reason for transferring to the scene creator agent"
              }
            },
            required: ["reason"]
          }
        }
      }
    ];
  }

  private getAgentName(agentType: AgentType): string {
    switch (agentType) {
      case "main": return "Assistant";
      case "script": return "Script Writer";
      case "image": return "Image Generator";
      case "tool": return "Tool Specialist";
      case "scene": return "Scene Creator";
      case "data": return "Data Agent";
      default: return "Specialist";
    }
  }
}
