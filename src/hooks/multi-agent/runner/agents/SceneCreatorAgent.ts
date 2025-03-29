
import { AgentResult, RunnerContext } from "../types";
import { BaseAgentImpl } from "./BaseAgentImpl";
import { Attachment } from "@/types/message";
import { getSceneById, getScenesByProjectId, extractSceneContent } from "@/utils/canvas-data-utils";

export class SceneCreatorAgent extends BaseAgentImpl {
  constructor(options: { context: RunnerContext, traceId?: string }) {
    super(options);
  }

  getType() {
    return "scene";
  }

  async run(input: string, attachments: Attachment[] = []): Promise<AgentResult> {
    try {
      // Record the start of the agent execution
      this.recordTraceEvent("agent_start", {
        agent_type: this.getType(),
        input_length: input.length,
        has_attachments: attachments.length > 0
      });

      // Apply input guardrails
      await this.applyInputGuardrails(input);

      // Get project context if available
      const projectId = this.context.metadata?.projectId || this.context.projectId;
      let projectScenes = [];
      let enhancedInput = input;

      // If we have a project ID, let's fetch the scenes to provide context
      if (projectId) {
        try {
          // Get all scenes for this project
          const scenes = await getScenesByProjectId(projectId);
          projectScenes = scenes;

          // Check if the input references a specific scene number or ID
          const sceneNumberMatch = input.match(/scene\s+(\d+)/i);
          const sceneIdMatch = input.match(/scene\s+id\s*[:#]?\s*([a-f0-9-]+)/i);
          
          if (sceneNumberMatch) {
            const sceneNumber = parseInt(sceneNumberMatch[1]);
            // Find the scene by its order number
            const scene = scenes.find(s => s.order === sceneNumber) || 
                         scenes[sceneNumber - 1]; // Fallback to array index
            
            if (scene) {
              // Add scene context to input
              const sceneContent = extractSceneContent(scene);
              enhancedInput = `${input}\n\nHere's the current content for Scene ${sceneNumber} (ID: ${scene.id}):\n\n${sceneContent}`;
              
              // Record that we're working with a specific scene
              this.recordTraceEvent("scene_context_added", {
                scene_id: scene.id,
                scene_number: sceneNumber,
                has_script: !!scene.script,
                has_description: !!scene.description,
                has_image_prompt: !!scene.imagePrompt,
                has_voice_over: !!scene.voiceOverText
              });
            }
          } else if (sceneIdMatch) {
            const sceneId = sceneIdMatch[1];
            // Find the scene by its ID
            const scene = scenes.find(s => s.id === sceneId);
            
            if (scene) {
              // Add scene context to input
              const sceneContent = extractSceneContent(scene);
              enhancedInput = `${input}\n\nHere's the current content for Scene with ID ${sceneId}:\n\n${sceneContent}`;
              
              // Record that we're working with a specific scene
              this.recordTraceEvent("scene_context_added", {
                scene_id: scene.id,
                scene_number: scene.order,
                has_script: !!scene.script,
                has_description: !!scene.description,
                has_image_prompt: !!scene.imagePrompt,
                has_voice_over: !!scene.voiceOverText
              });
            }
          } else {
            // No specific scene mentioned, add summary of all scenes
            let sceneSummary = `This project has ${scenes.length} scenes:\n`;
            scenes.forEach((scene, index) => {
              sceneSummary += `- Scene ${scene.order}: ${scene.title} (ID: ${scene.id})\n`;
            });
            enhancedInput = `${input}\n\n${sceneSummary}`;
            
            // Record that we're providing a summary of all scenes
            this.recordTraceEvent("project_scenes_summary_added", {
              project_id: projectId,
              scene_count: scenes.length
            });
          }
        } catch (error) {
          console.error("Error fetching project scenes:", error);
        }
      }

      // Get the instructions for the Scene Creator agent
      const instructions = await this.getInstructions(this.context);

      // Prepare the model options
      const modelOptions = {
        model: this.context.usePerformanceModel ? "gpt-4o-mini" : "gpt-4o",
        messages: [
          { role: "system", content: instructions },
          { role: "user", content: enhancedInput }
        ],
        functions: [
          {
            name: "get_scene_content",
            description: "Retrieve content from a specific scene",
            parameters: {
              type: "object",
              properties: {
                sceneId: {
                  type: "string",
                  description: "ID of the scene to retrieve"
                },
                contentType: {
                  type: "string",
                  enum: ["script", "description", "imagePrompt", "voiceOverText", "all"],
                  description: "Type of content to retrieve"
                }
              },
              required: ["sceneId"]
            }
          },
          {
            name: "update_scene_content",
            description: "Update content in a specific scene",
            parameters: {
              type: "object",
              properties: {
                sceneId: {
                  type: "string",
                  description: "ID of the scene to update"
                },
                contentType: {
                  type: "string",
                  enum: ["script", "description", "imagePrompt", "voiceOverText"],
                  description: "Type of content to update"
                },
                content: {
                  type: "string",
                  description: "New content to set"
                }
              },
              required: ["sceneId", "contentType", "content"]
            }
          },
          {
            name: "handoff_to_agent",
            description: "Hand off to another specialized agent",
            parameters: {
              type: "object",
              properties: {
                targetAgent: {
                  type: "string",
                  enum: ["main", "script", "image", "tool"],
                  description: "The agent to hand off to"
                },
                reason: {
                  type: "string",
                  description: "Reason for handing off to another agent"
                }
              },
              required: ["targetAgent", "reason"]
            }
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      };

      // Call OpenAI to get a response
      const { data: openAIResponse } = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY || ""}`
        },
        body: JSON.stringify(modelOptions)
      }).then(res => res.json());

      // Process the response
      const responseMessage = openAIResponse.choices[0].message;
      let responseText = responseMessage.content || "";
      
      // Check if there's a function call
      if (responseMessage.function_call) {
        const functionName = responseMessage.function_call.name;
        const functionArgs = JSON.parse(responseMessage.function_call.arguments);
        
        if (functionName === "get_scene_content") {
          const { sceneId, contentType = "all" } = functionArgs;
          const scene = await getSceneById(sceneId);
          
          if (scene) {
            const content = extractSceneContent(scene, contentType);
            responseText = `Here's the ${contentType} content for Scene ${scene.title} (ID: ${scene.id}):\n\n${content}`;
          } else {
            responseText = `Sorry, I couldn't find a scene with ID ${sceneId}.`;
          }
        } else if (functionName === "update_scene_content") {
          const { sceneId, contentType, content } = functionArgs;
          
          // Call the canvas content tool
          const result = await this.context.supabase.functions.invoke("canvas-scene-agent", {
            body: {
              sceneId,
              prompt: content,
              type: contentType,
              projectId
            }
          });
          
          if (result.data?.success) {
            responseText = `I've updated the ${contentType} for the scene. Here's what I set:\n\n${content}`;
          } else {
            responseText = `Sorry, I was unable to update the scene ${contentType}. ${result.data?.message || ''}`;
          }
        } else if (functionName === "handoff_to_agent") {
          const { targetAgent, reason } = functionArgs;
          
          // Return a handoff result
          return {
            response: `I think the ${targetAgent} agent would be better suited to help with this. ${reason}`,
            nextAgent: targetAgent,
            handoffReason: reason
          };
        }
      }

      // Apply output guardrails
      await this.applyOutputGuardrails(responseText);
      
      // Record the completion of the agent execution
      this.recordTraceEvent("agent_complete", {
        agent_type: this.getType(),
        response_length: responseText.length
      });

      // Return the final response
      return {
        response: responseText,
        nextAgent: null
      };
    } catch (error) {
      console.error(`Error in ${this.getType()} agent:`, error);
      
      // Record the error
      this.recordTraceEvent("agent_error", {
        agent_type: this.getType(),
        error_message: error instanceof Error ? error.message : "Unknown error"
      });
      
      throw error;
    }
  }
  
  protected getDefaultInstructions(): string {
    return `You are a Scene Creator Assistant specifically focused on creating and improving video scene descriptions, image prompts, and voice over text. You excel at:

1. Creating detailed scene descriptions that paint a visual picture
2. Crafting precise image prompts for AI image generation
3. Writing natural-sounding voice over text that complements visuals
4. Helping structure scenes in a logical sequence

When a user asks about a specific scene, provide its details. When asked to create or edit content, focus on being descriptive and visual.

You can view and edit these types of content for each scene:
- Script: The dialogue and action descriptions
- Description: A detailed description of what should appear visually in the scene
- Image Prompt: The prompt used to generate the scene's image
- Voice Over Text: The narration that will be spoken over the scene

Always try to maintain consistency across all these elements when editing one of them.`;
  }
}
