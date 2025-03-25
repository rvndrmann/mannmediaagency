
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';

export interface BrowserUseParameters {
  task: string;
  save_browser_data?: boolean;
}

interface BrowserUseResponse {
  success: boolean;
  message: string;
  taskId?: string;
  error?: string;
}

export const executeBrowserUseTool = async (
  parameters: BrowserUseParameters,
  userId: string,
  traceId?: string
): Promise<BrowserUseResponse> => {
  try {
    console.log('Executing browser-use tool with parameters:', parameters);
    
    // Call the execute-tool edge function to run the browser-use tool
    const response = await fetch('/api/execute-tool', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        toolName: 'browser-use',
        parameters: {
          task: parameters.task,
          save_browser_data: parameters.save_browser_data !== false
        },
        userId,
        traceId
      })
    });
    
    // Handle non-OK responses
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Browser Use API Error Response:", errorText);
      return {
        success: false,
        message: `Error: API returned ${response.status}`,
        error: errorText
      };
    }
    
    // Create a record in the browser_use_tasks table
    const taskId = uuidv4();
    const { error: insertError } = await supabase
      .from('browser_use_tasks')
      .insert({
        id: taskId,
        user_id: userId,
        input: parameters.task,
        status: 'created',
        trace_id: traceId || null
      });
    
    if (insertError) {
      console.error("Error inserting browser task record:", insertError);
    }
    
    // Parse the response
    try {
      const data = await response.json();
      return {
        success: true,
        message: data.message || 'Browser task executed successfully',
        taskId: data.taskId || taskId
      };
    } catch (jsonError) {
      console.error("Error parsing JSON response:", jsonError);
      return {
        success: true, // Still return success if we got a 200 response
        message: 'Browser task submitted, but could not parse the response details',
        taskId
      };
    }
  } catch (error) {
    console.error('Error executing browser-use tool:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
