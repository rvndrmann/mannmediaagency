
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { handleBrowserUseApiResponse, safeJsonStringify } from '../runner/fix-agent-runner';

interface BrowserUseApiParams {
  task: string;
  save_browser_data?: boolean;
}

export const executeBrowserUseTool = async (
  parameters: Record<string, any>,
  userId: string,
  traceId: string
): Promise<{ success: boolean; message: string; taskId?: string }> => {
  try {
    console.log('Executing browser-use tool with parameters:', parameters);
    
    // Validate parameters
    if (!parameters.task || typeof parameters.task !== 'string') {
      return {
        success: false,
        message: 'Missing or invalid task parameter. Please provide a task instruction as a string.'
      };
    }
    
    const browserParams: BrowserUseApiParams = {
      task: parameters.task,
      save_browser_data: parameters.save_browser_data !== false // Default to true if not explicitly set to false
    };
    
    // Get API key from Supabase environment
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'browser_use_api_key')
      .single();
    
    if (apiKeyError || !apiKeyData) {
      console.error('Error fetching Browser Use API key:', apiKeyError);
      
      // Attempt to use edge function as fallback
      return await executeBrowserUseViaFunction(browserParams, userId, traceId);
    }
    
    const apiKey = apiKeyData.value;
    
    // Log the start of the task to the database
    const taskRecord = {
      id: uuidv4(),
      user_id: userId,
      input: parameters.task, // Add input field to match the required schema
      status: 'pending',
      trace_id: traceId
    };
    
    const { data: insertedTask, error: insertError } = await supabase
      .from('browser_automation_tasks')
      .insert(taskRecord)
      .select()
      .single();
    
    if (insertError) {
      console.error('Error creating browser task record:', insertError);
      return {
        success: false,
        message: 'Error creating task record: ' + insertError.message
      };
    }
    
    // Make the API request with improved error handling
    try {
      const response = await fetch('https://api.browser-use.com/api/v1/run-task', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: safeJsonStringify(browserParams)
      });
      
      const result = await handleBrowserUseApiResponse(response);
      
      if (!result || !result.task_id) {
        throw new Error('Invalid response from Browser Use API: missing task_id');
      }
      
      // Update our task record with the API task ID
      await supabase
        .from('browser_automation_tasks')
        .update({
          browser_task_id: result.task_id,
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', taskRecord.id);
      
      return {
        success: true,
        message: `Browser automation task started. Task ID: ${result.task_id}`,
        taskId: result.task_id
      };
    } catch (apiError) {
      console.error('Browser Use API error:', apiError);
      
      // Update task status to error
      await supabase
        .from('browser_automation_tasks')
        .update({
          status: 'error',
          output: apiError instanceof Error ? apiError.message : String(apiError),
          updated_at: new Date().toISOString()
        })
        .eq('id', taskRecord.id);
      
      return {
        success: false,
        message: `Error executing browser task: ${apiError instanceof Error ? apiError.message : String(apiError)}`
      };
    }
  } catch (error) {
    console.error('Error in executeBrowserUseTool:', error);
    return {
      success: false,
      message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

// Fallback method that uses our edge function instead of direct API call
async function executeBrowserUseViaFunction(
  parameters: BrowserUseApiParams,
  userId: string,
  traceId: string
): Promise<{ success: boolean; message: string; taskId?: string }> {
  try {
    console.log('Using edge function for browser automation');
    
    const response = await fetch('/api/browser-use', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: safeJsonStringify({
        ...parameters,
        userId,
        traceId
      })
    });
    
    const result = await handleBrowserUseApiResponse(response);
    
    if (!result || result.error) {
      throw new Error(result?.error || 'Unknown error from browser-use function');
    }
    
    return {
      success: true,
      message: result.message || 'Browser automation task started via edge function',
      taskId: result.taskId
    };
  } catch (error) {
    console.error('Error in executeBrowserUseViaFunction:', error);
    return {
      success: false,
      message: `Edge function error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
