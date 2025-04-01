
import { MCPConnection, MCPServerConfig, MCPToolDefinition, MCPToolExecutionParams, MCPToolExecutionResult } from "./mcp/types";

export class MCPServerService implements MCPConnection {
  private serverUrl: string;
  private projectId?: string;
  private connected: boolean = false;
  private connectionError: Error | null = null;
  private lastActiveTimestamp: number = 0;
  private connectionId: string = "";
  public name: string = "MCP Server";
  public baseUrl: string = "";

  constructor(serverUrl: string, projectId?: string) {
    this.serverUrl = serverUrl;
    this.projectId = projectId;
    this.baseUrl = serverUrl;
  }

  public async connect(): Promise<void> {
    try {
      // Simulate connection to MCP server
      console.log(`Connecting to MCP server at ${this.serverUrl} for project ${this.projectId}`);
      
      // In a real implementation, this would establish a WebSocket or HTTP connection
      await new Promise(resolve => setTimeout(resolve, 500));
      
      this.connected = true;
      this.connectionError = null;
      this.lastActiveTimestamp = Date.now();
      // Use a more browser-compatible way to generate UUID
      this.connectionId = `mcp-${Math.random().toString(36).substring(2, 15)}-${Date.now().toString(36)}`;
      
      console.log(`Connected to MCP server with ID ${this.connectionId}`);
    } catch (error) {
      this.connected = false;
      this.connectionError = error instanceof Error ? error : new Error(String(error));
      console.error("Failed to connect to MCP server:", error);
      throw this.connectionError;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (!this.connected) {
        return;
      }
      
      console.log(`Disconnecting from MCP server ${this.connectionId}`);
      
      // In a real implementation, this would close the WebSocket or HTTP connection
      await new Promise(resolve => setTimeout(resolve, 200));
      
      this.connected = false;
      this.lastActiveTimestamp = 0;
    } catch (error) {
      console.error("Error disconnecting from MCP server:", error);
    }
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public getConnectionError(): Error | null {
    return this.connectionError;
  }

  public isConnectionActive(): boolean {
    // Consider a connection active if it's connected and has been used in the last 5 minutes
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return this.connected && this.lastActiveTimestamp > fiveMinutesAgo;
  }

  public async listTools(): Promise<MCPToolDefinition[]> {
    return [
      {
        name: "create_video_project",
        description: "Create a new video project",
        parameters: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Name of the video project",
            },
            description: {
              type: "string",
              description: "Description of the video project",
            },
          },
          required: ["name"],
        },
      },
      {
        name: "get_video_project",
        description: "Get video project details",
        parameters: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              description: "ID of the video project",
            },
          },
          required: ["projectId"],
        },
      },
      {
        name: "list_video_projects",
        description: "List all video projects",
        parameters: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Maximum number of projects to return",
            },
            offset: {
              type: "number",
              description: "Number of projects to skip",
            },
            status: {
              type: "string",
              enum: ["draft", "in_progress", "completed", "failed", "all"],
              description: "Filter projects by status",
            },
          },
          required: [],
        },
      },
      {
        name: "update_video_project",
        description: "Update video project details",
        parameters: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              description: "ID of the video project",
            },
            name: {
              type: "string",
              description: "Updated name of the video project",
            },
            description: {
              type: "string",
              description: "Updated description of the video project",
            },
            status: {
              type: "string",
              enum: ["draft", "in_progress", "completed", "failed"],
              description: "Updated status of the video project",
            },
          },
          required: ["projectId"],
        },
      },
      {
        name: "add_scene",
        description: "Add a new scene to the video project",
        parameters: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              description: "ID of the video project",
            },
            name: {
              type: "string",
              description: "Name of the scene",
            },
            description: {
              type: "string",
              description: "Description of the scene",
            },
            order: {
              type: "number",
              description: "Order of the scene in the project",
            },
          },
          required: ["projectId", "name"],
        },
      },
      {
        name: "upload_product_image",
        description: "Upload a product image for scene creation",
        parameters: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              description: "ID of the video project",
            },
            filename: {
              type: "string",
              description: "Name of the file being uploaded",
            },
            fileData: {
              type: "string",
              description: "Base64 encoded image data or reference",
            },
          },
          required: ["projectId", "filename"],
        },
      },
      {
        name: "generate_image_prompt",
        description: "Generate image prompt for the current scene",
        parameters: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              description: "ID of the video project",
            },
            sceneId: {
              type: "string",
              description: "ID of the scene to generate prompt for",
            },
            imageAnalysis: {
              type: "string",
              description: "Optional image analysis to use as context",
            },
          },
          required: ["projectId", "sceneId"],
        },
      },
      {
        name: "generate_scene_description",
        description: "Generate a description for the current scene",
        parameters: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              description: "ID of the video project",
            },
            sceneId: {
              type: "string",
              description: "ID of the scene to generate description for",
            },
            useDescription: {
              type: "string",
              description: "Whether to use existing description as context",
            },
          },
          required: ["projectId", "sceneId"],
        },
      },
      {
        name: "generate_scene_image",
        description: "Generate an image for the current scene",
        parameters: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              description: "ID of the video project",
            },
            sceneId: {
              type: "string",
              description: "ID of the scene to generate image for",
            },
            productShotVersion: {
              type: "string",
              enum: ["v1", "v2", "v3"],
              description: "Version of the product shot generator to use",
            },
            imagePrompt: {
              type: "string",
              description: "Prompt to use for image generation",
            },
          },
          required: ["projectId", "sceneId"],
        },
      },
      {
        name: "generate_scene_video",
        description: "Generate a video for the current scene",
        parameters: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              description: "ID of the video project",
            },
            sceneId: {
              type: "string",
              description: "ID of the scene to generate video for",
            },
            aspectRatio: {
              type: "string",
              enum: ["16:9", "9:16", "1:1", "4:3"],
              description: "Aspect ratio of the video",
            },
          },
          required: ["projectId", "sceneId"],
        },
      },
      {
        name: "generate_scene_script",
        description: "Generate a script for the current scene",
        parameters: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              description: "ID of the video project",
            },
            sceneId: {
              type: "string",
              description: "ID of the scene to generate script for",
            },
            contextPrompt: {
              type: "string",
              description: "Additional context for script generation",
            },
          },
          required: ["projectId", "sceneId"],
        },
      },
      {
        name: "compile_video",
        description: "Compile all scenes into a final video",
        parameters: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              description: "ID of the video project",
            },
            outputFormat: {
              type: "string",
              enum: ["mp4", "webm"],
              description: "Output format of the compiled video",
            },
            config: {
              type: "object",
              description: "Configuration for the video compilation",
            },
          },
          required: ["projectId"],
        },
      },
    ];
  }

  public async callTool(name: string, parameters: Record<string, any>): Promise<MCPToolExecutionResult> {
    // Update last active timestamp
    this.lastActiveTimestamp = Date.now();
    
    if (!this.connected) {
      throw new Error("Cannot call tool: Not connected to MCP server");
    }
    
    console.log(`Calling MCP tool ${name} with parameters:`, parameters);
    
    // In a real implementation, this would make an API call to the MCP server
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    switch (name) {
      case 'create_video_project':
        return {
          success: true,
          data: {
            project: {
              id: `project-${Math.random().toString(36).substring(2, 15)}-${Date.now().toString(36)}`,
              name: parameters.name,
              description: parameters.description,
              status: 'draft',
              scenes: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          }
        };
      
      case 'list_video_projects':
        // Generate a list of projects for testing
        const numProjects = 5;
        const projects = Array.from({ length: numProjects }, (_, index) => ({
          id: `project-${index + 1}-${Date.now().toString().slice(-5)}`,
          name: `Project ${index + 1}`,
          description: `Description for project ${index + 1}`,
          status: ['draft', 'in_progress', 'completed'][Math.floor(Math.random() * 3)],
          scenes: [],
          sceneCount: Math.floor(Math.random() * 5) + 1,
          createdAt: new Date(Date.now() - (index * 24 * 60 * 60 * 1000)).toISOString(), // Each project a day apart
          updatedAt: new Date(Date.now() - (index * 12 * 60 * 60 * 1000)).toISOString(),
        }));

        return {
          success: true,
          data: {
            projects: projects,
            total: projects.length,
            timestamp: new Date().toISOString(),
          }
        };
        
      case 'get_video_project':
        // Generate a dynamic number of scenes with timestamps that change each time
        const numScenes = Math.floor(Math.random() * 3) + 3; // 3-5 scenes
        const scenes = Array.from({ length: numScenes }, (_, index) => ({
          id: `scene-${index + 1}-${Date.now().toString().slice(-5)}`,
          projectId: parameters.projectId,
          name: `Scene ${index + 1}`,
          description: `Description for scene ${index + 1} - Updated at ${new Date().toLocaleTimeString()}`,
          status: ['pending', 'in_progress', 'completed'][Math.floor(Math.random() * 3)],
          order: index,
          imageUrl: index % 2 === 0 ? `https://picsum.photos/seed/${Date.now() + index}/300/200` : undefined,
          videoUrl: index % 3 === 0 ? `https://example.com/videos/${parameters.projectId}/scene-${index + 1}.mp4` : undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));

        return {
          success: true,
          data: {
            project: {
              id: parameters.projectId,
              name: `Demo Project - ${new Date().toLocaleTimeString()}`,
              description: `Dynamic project description - Updated at ${new Date().toLocaleTimeString()}`,
              status: 'in_progress',
              scenes: scenes,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          }
        };
        
      case 'add_scene':
        return {
          success: true,
          data: {
            scene: {
              id: `scene-${Math.random().toString(36).substring(2, 15)}-${Date.now().toString(36)}`,
              projectId: parameters.projectId,
              name: parameters.name,
              description: parameters.description,
              status: 'pending',
              order: parameters.order || 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          }
        };
        
      case 'upload_product_image':
        return {
          success: true,
          data: {
            imageUrl: `https://example.com/uploads/${parameters.projectId}/${parameters.filename}`,
            timestamp: new Date().toISOString(),
          }
        };
        
      case 'generate_image_prompt':
        return {
          success: true,
          data: {
            prompt: `Enhanced prompt based on ${parameters.imageAnalysis || 'default analysis'}`,
            timestamp: new Date().toISOString(),
          }
        };
        
      case 'generate_scene_image':
        return {
          success: true,
          data: {
            result: `Generated scene_image for scene ${parameters.sceneId}`,
            imageUrl: `https://example.com/images/${parameters.projectId}/${parameters.sceneId}.jpg`,
            timestamp: new Date().toISOString(),
          }
        };
        
      case 'generate_scene_video':
        return {
          success: true,
          data: {
            result: `Generated scene_video for scene ${parameters.sceneId}`,
            videoUrl: `https://example.com/videos/${parameters.projectId}/${parameters.sceneId}.mp4`,
            timestamp: new Date().toISOString(),
          }
        };
        
      case 'generate_scene_script':
        return {
          success: true,
          data: {
            result: `Generated scene_script for scene ${parameters.sceneId}`,
            script: "This is a sample script for the scene.",
            timestamp: new Date().toISOString(),
          }
        };
        
      case 'compile_video':
        return {
          success: true,
          data: {
            videoUrl: `https://example.com/videos/${parameters.projectId}/output.${parameters.outputFormat || 'mp4'}`,
            timestamp: new Date().toISOString(),
          }
        };
        
      default:
        return {
          success: true,
          data: {
            result: `Result from ${name} with parameters ${JSON.stringify(parameters)}`,
            timestamp: new Date().toISOString(),
          }
        };
    }
  }

  public async executeToolById(params: MCPToolExecutionParams): Promise<MCPToolExecutionResult> {
    if (!params.tool_id) {
      throw new Error("Tool ID is required");
    }
    
    return this.callTool(params.tool_id, params.parameters || {});
  }

  public async executeTool(toolId: string, params: any): Promise<MCPToolExecutionResult> {
    return this.executeToolById({
      tool_id: toolId,
      parameters: params
    });
  }

  public async cleanup(): Promise<void> {
    await this.disconnect();
  }
}
