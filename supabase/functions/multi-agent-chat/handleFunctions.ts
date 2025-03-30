
import { supabase } from './supabaseClient.ts';

// Helper to determine if a handoff should be prevented for simple messages
export function shouldPreventHandoff(input: string): boolean {
  // Prevent automated handoffs for greetings and short questions
  if (!input) return true;
  
  const simplePhrases = [
    /^hi+\s*$/i,
    /^hello+\s*$/i,
    /^hey+\s*$/i,
    /^what['s\s]+up/i,
    /^how are you/i,
    /^thank/i,
    /^ok+\s*$/i,
    /^okay+\s*$/i,
    /^cool+\s*$/i,
    /^nice+\s*$/i,
    /^got it/i,
    /^help me/i,
    /^can you help/i
  ];
  
  // Check if input matches any simple phrases
  for (const phrase of simplePhrases) {
    if (phrase.test(input.trim())) {
      return true;
    }
  }
  
  // Also prevent handoff for very short messages (less than 15 chars) 
  // that don't clearly express an intent
  return input.trim().length < 15 && !/write|create|make|generate|edit/i.test(input);
}

// Helper function to get one or more scenes from a project
export async function getSceneDetails(projectId: string, sceneId?: string) {
  try {
    let query = supabase
      .from('canvas_scenes')
      .select(`
        id, 
        title, 
        script, 
        description, 
        image_prompt, 
        scene_order,
        image_url,
        voice_over_text
      `)
      .eq('project_id', projectId)
      .order('scene_order', { ascending: true });
    
    if (sceneId) {
      query = query.eq('id', sceneId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching scene details:', error);
    return [];
  }
}

// Helper function to get project script
export async function getProjectScript(projectId: string) {
  try {
    const { data, error } = await supabase
      .from('canvas_projects')
      .select('full_script')
      .eq('id', projectId)
      .single();
    
    if (error) throw error;
    return data?.full_script || null;
  } catch (error) {
    console.error('Error fetching project script:', error);
    return null;
  }
}

// Helper function to save content to a project
export async function saveContentToProject(
  projectId: string, 
  contentType: 'script' | 'scene' | 'image_prompt' | 'voice_over', 
  content: string, 
  sceneId?: string
) {
  try {
    if (contentType === 'script') {
      // Save to project's full script
      const { error } = await supabase
        .from('canvas_projects')
        .update({ full_script: content })
        .eq('id', projectId);
      
      if (error) throw error;
      return true;
    } else if (sceneId) {
      // Map content type to database field
      const fieldMap: Record<string, string> = {
        'scene': 'description',
        'image_prompt': 'image_prompt',
        'voice_over': 'voice_over_text'
      };
      
      const field = fieldMap[contentType];
      if (!field) throw new Error(`Unknown content type: ${contentType}`);
      
      // Update specific scene field
      const { error } = await supabase
        .from('canvas_scenes')
        .update({ [field]: content })
        .eq('id', sceneId)
        .eq('project_id', projectId);
      
      if (error) throw error;
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error saving content to project:', error);
    throw error;
  }
}

// Process function calls
export async function processFunctionCall(
  functionName: string,
  args: any,
  requestId: string,
  userId: string,
  projectId?: string,
  agentType?: string
) {
  console.log(`Processing function call: ${functionName} ${projectId ? `for project ${projectId}` : ''}`);
  
  let responseText = '';
  let handoff = null;
  let structuredOutput = null;
  let isScript = false;
  
  try {
    // Handle handoff functions
    if (functionName.startsWith('transfer_to_')) {
      const targetAgent = functionName.replace('transfer_to_', '').replace('_agent', '');
      const reason = args.reason || 'Specialized assistance needed';
      
      console.log(`[${requestId}] Handoff requested to ${targetAgent}`, args);
      
      handoff = {
        targetAgent,
        reason,
        additionalContext: args.additionalContext || {}
      };
      
      if (projectId) {
        handoff.additionalContext.projectId = projectId;
      }
      
      responseText = `I'll transfer you to our ${targetAgent} specialist. ${reason}`;
    }
    // Handle save function
    else if (functionName === 'save_content_to_project' && args.contentType && args.content) {
      if (!projectId) {
        throw new Error('Project ID is required to save content');
      }
      
      const contentType = args.contentType;
      const content = args.content;
      const sceneId = args.sceneId;
      
      isScript = contentType === 'script' || content.includes('FADE IN:') || content.includes('INT.') || content.includes('EXT.');
      
      // Save the content
      const success = await saveContentToProject(
        projectId,
        contentType,
        content,
        sceneId
      );
      
      if (success) {
        if (contentType === 'script') {
          responseText = `I've saved the script to your project. You can now view and edit it in the script editor.`;
        } else if (contentType === 'scene') {
          responseText = `I've saved the scene description${sceneId ? ` for scene ${sceneId}` : ''}. You can now view it in the scene editor.`;
        } else if (contentType === 'image_prompt') {
          responseText = `I've saved the image prompt${sceneId ? ` for scene ${sceneId}` : ''}. You can now use it to generate an image.`;
        } else if (contentType === 'voice_over') {
          responseText = `I've saved the voice over text${sceneId ? ` for scene ${sceneId}` : ''}. You can now generate voice over audio.`;
        }
      } else {
        responseText = `I wasn't able to save the ${contentType} to your project. Please try again.`;
      }
      
      // Set structured output for better client-side handling
      structuredOutput = {
        type: 'content_saved',
        contentType,
        success,
        projectId,
        sceneId: sceneId || null
      };
    }
    // Handle agent responses
    else if (functionName === 'agentResponse' && args.completion) {
      responseText = args.completion;
    }
    else {
      responseText = "I couldn't process that function call. Please try again.";
    }
  } catch (error) {
    console.error(`[${requestId}] Error processing function call:`, error);
    responseText = `I encountered an error: ${error.message}. Please try again.`;
  }
  
  return {
    responseText,
    handoff,
    structuredOutput,
    isScript
  };
}

// Special function for streaming responses
export function streamFunctionCall(
  functionCallStream: ReadableStream,
  requestId: string
) {
  let responseText = '';
  let handoff = null;
  let structuredOutput = null;
  let isScript = false;
  
  const transformer = new TransformStream({
    async transform(chunk, controller) {
      try {
        if (chunk) {
          const text = new TextDecoder().decode(chunk);
          // Process streamed function call as it comes in
          // This will be less complete compared to the non-streaming version
          // but allows immediate client feedback
          
          // Send the raw text for now
          const event = `data: ${JSON.stringify({ 
            type: 'chunk', 
            content: text,
            requestId
          })}\n\n`;
          
          controller.enqueue(new TextEncoder().encode(event));
          
          // Accumulate the full response text
          responseText += text;
          
          // Simple check for script content
          if (!isScript && (text.includes('FADE IN:') || text.includes('INT.') || text.includes('EXT.'))) {
            isScript = true;
          }
        }
      } catch (error) {
        console.error(`[${requestId}] Error in stream transform:`, error);
        controller.enqueue(new TextEncoder().encode(
          `data: ${JSON.stringify({ 
            type: 'error', 
            content: `Error processing stream: ${error.message}`,
            requestId
          })}\n\n`
        ));
      }
    },
    
    async flush(controller) {
      // Once the stream is fully processed, send the complete result
      // This allows the client to have the complete data for processing
      controller.enqueue(new TextEncoder().encode(
        `data: ${JSON.stringify({ 
          type: 'complete', 
          content: responseText,
          isScript,
          handoff,
          structuredOutput,
          requestId
        })}\n\n`
      ));
      
      // Signal the end of the stream
      controller.enqueue(new TextEncoder().encode(`data: [DONE]\n\n`));
    }
  });
  
  return functionCallStream.pipeThrough(transformer);
}
