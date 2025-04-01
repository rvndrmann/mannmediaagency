
import { ToolDefinition, CommandExecutionState, ToolContext, ToolExecutionResult } from '../types';
import { supabase } from '@/integrations/supabase/client';
import OpenAI from 'openai';
import { toast } from 'sonner';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true // Note: In production, use backend calls instead
});

async function executeCanvasTool(
  parameters: any,
  context: ToolContext
): Promise<ToolExecutionResult> {
  try {
    const { projectId, sceneId, action, content } = parameters;
    
    if (!projectId) {
      return {
        success: false,
        message: "Project ID is required",
        state: CommandExecutionState.FAILED
      };
    }
    
    if (!action) {
      return {
        success: false,
        message: "Action is required",
        state: CommandExecutionState.FAILED
      };
    }

    // Get project and scene details if needed
    let project = null;
    let scene = null;
    
    if (projectId) {
      const { data: projectData } = await supabase
        .from('canvas_projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      project = projectData;
    }
    
    if (sceneId) {
      const { data: sceneData } = await supabase
        .from('canvas_scenes')
        .select('*')
        .eq('id', sceneId)
        .single();
      
      scene = sceneData;
    }
    
    switch (action) {
      case "generate_description": {
        if (!sceneId) {
          return {
            success: false,
            message: "Scene ID is required for generating description",
            state: CommandExecutionState.FAILED
          };
        }
        
        let prompt = content || "Generate a detailed scene description";
        
        if (scene) {
          prompt = `Generate a detailed scene description based on the following:
Title: ${scene.title || 'Untitled Scene'}
Script: ${scene.script || ''}
${content ? 'Additional Context: ' + content : ''}

Create a detailed description that includes visual elements, camera movements, lighting, and atmosphere.`;
        }
        
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: "You are a professional scene director specializing in creating detailed visual scene descriptions." },
            { role: "user", content: prompt }
          ]
        });
        
        const description = completion.choices[0].message.content || '';
        
        // Update the scene with the generated description
        const { error } = await supabase
          .from('canvas_scenes')
          .update({ description })
          .eq('id', sceneId);
        
        if (error) {
          throw new Error(`Failed to update scene description: ${error.message}`);
        }
        
        return {
          success: true,
          message: "Scene description generated successfully",
          data: { description },
          state: CommandExecutionState.COMPLETED
        };
      }
      
      case "generate_script": {
        if (!sceneId) {
          return {
            success: false,
            message: "Scene ID is required for generating script",
            state: CommandExecutionState.FAILED
          };
        }
        
        let prompt = content || "Generate a creative script for this scene";
        
        if (scene) {
          prompt = `Generate a script for the following scene:
Title: ${scene.title || 'Untitled Scene'}
Description: ${scene.description || ''}
${content ? 'Additional Context: ' + content : ''}

Write a creative and engaging script that includes dialogue, action descriptions, and camera directions.`;
        }
        
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: "You are a professional screenwriter specializing in creative and engaging scripts." },
            { role: "user", content: prompt }
          ]
        });
        
        const script = completion.choices[0].message.content || '';
        
        // Update the scene with the generated script
        const { error } = await supabase
          .from('canvas_scenes')
          .update({ script })
          .eq('id', sceneId);
        
        if (error) {
          throw new Error(`Failed to update scene script: ${error.message}`);
        }
        
        return {
          success: true,
          message: "Scene script generated successfully",
          data: { script },
          state: CommandExecutionState.COMPLETED
        };
      }
      
      case "generate_image_prompt": {
        if (!sceneId) {
          return {
            success: false,
            message: "Scene ID is required for generating image prompt",
            state: CommandExecutionState.FAILED
          };
        }
        
        let prompt = content || "Generate a detailed image prompt";
        
        if (scene) {
          prompt = `Generate a detailed image prompt for the following scene:
Title: ${scene.title || 'Untitled Scene'}
Description: ${scene.description || ''}
Script: ${scene.script || ''}
${content ? 'Additional Context: ' + content : ''}

Create a detailed prompt for AI image generation that includes visual style, composition, lighting, and key elements.`;
        }
        
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: "You are a professional prompt engineer specializing in creating detailed prompts for AI image generation." },
            { role: "user", content: prompt }
          ]
        });
        
        const imagePrompt = completion.choices[0].message.content || '';
        
        // Update the scene with the generated image prompt
        const { error } = await supabase
          .from('canvas_scenes')
          .update({ imagePrompt })
          .eq('id', sceneId);
        
        if (error) {
          throw new Error(`Failed to update image prompt: ${error.message}`);
        }
        
        return {
          success: true,
          message: "Image prompt generated successfully",
          data: { imagePrompt },
          state: CommandExecutionState.COMPLETED
        };
      }
      
      default:
        return {
          success: false,
          message: `Unsupported action: ${action}`,
          state: CommandExecutionState.FAILED
        };
    }
  } catch (error) {
    console.error("Error executing canvas tool:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
      state: CommandExecutionState.ERROR
    };
  }
}

export const canvasTool: ToolDefinition = {
  name: "canvas_tool",
  description: "Generate content for canvas scenes",
  parameters: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "ID of the canvas project"
      },
      sceneId: {
        type: "string",
        description: "ID of the scene to modify"
      },
      action: {
        type: "string",
        description: "Action to perform",
        enum: ["generate_description", "generate_script", "generate_image_prompt", "generate_voiceover"]
      },
      content: {
        type: "string",
        description: "Additional context or content to consider"
      }
    },
    required: ["projectId", "action"]
  },
  metadata: {
    category: "canvas",
    displayName: "Canvas Tool",
    icon: "canvas"
  },
  execute: executeCanvasTool
};
