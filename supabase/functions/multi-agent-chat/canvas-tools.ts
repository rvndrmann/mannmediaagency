
// Canvas-specific tools and functions for the multi-agent chat

// Function to format canvas project info for the agent
export function formatCanvasProjectInfo(projectData: any) {
  if (!projectData) return "No project data available.";
  
  // Format project data for context
  const projectInfo = `
Project ID: ${projectData.id || 'Unknown'}
Title: ${projectData.title || 'Untitled Project'}
Created: ${projectData.created_at ? new Date(projectData.created_at).toLocaleDateString() : 'Unknown'}
Scenes: ${projectData.scenes?.length || 0}
  `;
  
  // Add scene information if available
  let scenesInfo = "";
  if (projectData.scenes && projectData.scenes.length > 0) {
    scenesInfo = "\nScenes:\n" + projectData.scenes.map((scene: any, index: number) => 
      `${index + 1}. Scene ID: ${scene.id || 'Unknown'} - ${scene.title || 'Untitled Scene'}`
    ).join("\n");
  }
  
  return projectInfo + scenesInfo;
}

// Function to get canvas tools for the agent
export function getCanvasTools() {
  return [
    {
      type: "function",
      function: {
        name: "generate_scene_script",
        description: "Generate a script for a specific scene in the canvas project",
        parameters: {
          type: "object",
          properties: {
            sceneId: {
              type: "string",
              description: "ID of the scene to generate a script for"
            },
            context: {
              type: "string",
              description: "Additional context or requirements for the script"
            }
          },
          required: ["sceneId"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "generate_scene_description",
        description: "Generate a description for a specific scene in the canvas project",
        parameters: {
          type: "object",
          properties: {
            sceneId: {
              type: "string",
              description: "ID of the scene to generate a description for"
            },
            context: {
              type: "string",
              description: "Additional context or requirements for the description"
            }
          },
          required: ["sceneId"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "generate_image_prompt",
        description: "Generate an image prompt for a specific scene in the canvas project",
        parameters: {
          type: "object",
          properties: {
            sceneId: {
              type: "string",
              description: "ID of the scene to generate an image prompt for"
            },
            context: {
              type: "string",
              description: "Additional context or requirements for the image prompt"
            }
          },
          required: ["sceneId"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "update_scene_content",
        description: "Update content for a specific scene in the canvas project",
        parameters: {
          type: "object",
          properties: {
            sceneId: {
              type: "string",
              description: "ID of the scene to update"
            },
            contentType: {
              type: "string",
              description: "Type of content to update",
              enum: ["script", "description", "imagePrompt", "voiceOverText"]
            },
            content: {
              type: "string",
              description: "The new content to save"
            }
          },
          required: ["sceneId", "contentType", "content"]
        }
      }
    }
  ];
}
