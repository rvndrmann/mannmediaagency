
import { serve } from "std/server";
import { createClient } from "supabase-js";

interface ScheduledTask {
  id: string;
  task_input: string;
  browser_config: any;
  schedule_type: string;
  scheduled_time: string;
  repeat_interval: string | null;
  last_run_at: string | null;
  next_run_at: string | null;
  status: string;
}

interface ProcessTaskResult {
  success: boolean;
  message: string;
  taskId?: string;
}

// Process task with sensitive data substitutions
function processTaskWithSensitiveData(taskInput: string, sensitiveData: Array<{key: string, value: string}> | undefined): string {
  if (!sensitiveData || sensitiveData.length === 0) return taskInput;
  
  let processedTask = taskInput;
  sensitiveData.forEach(item => {
    const placeholder = `{${item.key}}`;
    const regex = new RegExp(placeholder, 'g');
    processedTask = processedTask.replace(regex, item.value);
  });
  
  return processedTask;
}

// Main function to process scheduled tasks
async function processScheduledTasks(supabase: any): Promise<ProcessTaskResult> {
  try {
    // Get current time
    const now = new Date();
    
    // Get tasks that are scheduled to run now
    const { data: tasks, error } = await supabase
      .from('scheduled_browser_tasks')
      .select('*')
      .or(`status.eq.pending,status.eq.active`)
      .lte('scheduled_time', now.toISOString());
    
    if (error) throw error;
    
    if (!tasks || tasks.length === 0) {
      return { success: true, message: "No tasks to process" };
    }
    
    // Process each task
    for (const task of tasks) {
      // Process task with sensitive data
      let processedTaskInput = task.task_input;
      if (task.browser_config && task.browser_config.sensitiveData) {
        processedTaskInput = processTaskWithSensitiveData(
          task.task_input, 
          task.browser_config.sensitiveData
        );
      }
      
      // Start the task using the browser-use-api function
      const { data: startTaskResult, error: startTaskError } = await supabase.functions.invoke(
        'browser-use-api',
        {
          body: {
            task: processedTaskInput,
            environment: 'browser',
            browser_config: task.browser_config
          }
        }
      );
      
      if (startTaskError) {
        console.error(`Error starting task ${task.id}:`, startTaskError);
        
        // Update task status to failed
        await supabase
          .from('scheduled_browser_tasks')
          .update({ 
            status: 'failed',
            last_run_at: now.toISOString()
          })
          .eq('id', task.id);
          
        continue;
      }
      
      const taskId = startTaskResult.taskId;
      
      // Update the task status
      if (task.schedule_type === 'once') {
        // For one-time tasks, mark as completed
        await supabase
          .from('scheduled_browser_tasks')
          .update({ 
            status: 'completed',
            last_run_at: now.toISOString()
          })
          .eq('id', task.id);
      } else {
        // For recurring tasks, calculate the next run time
        const nextRun = task.next_run_at ? new Date(task.next_run_at) : calculateNextRun(task);
        
        await supabase
          .from('scheduled_browser_tasks')
          .update({ 
            status: 'active',
            last_run_at: now.toISOString(),
            next_run_at: nextRun.toISOString()
          })
          .eq('id', task.id);
      }
      
      // Log the task execution
      await supabase
        .from('browser_task_logs')
        .insert({
          scheduled_task_id: task.id,
          browser_task_id: taskId,
          status: 'started',
          executed_at: now.toISOString()
        });
    }
    
    return { 
      success: true, 
      message: `Processed ${tasks.length} tasks`
    };
  } catch (error) {
    console.error("Error processing scheduled tasks:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

// Calculate next run time based on repeat interval
function calculateNextRun(task: ScheduledTask): Date {
  const baseTime = task.next_run_at ? new Date(task.next_run_at) : new Date(task.scheduled_time);
  const interval = task.repeat_interval || '1 day';
  
  if (interval.includes('day')) {
    const days = parseInt(interval.split(' ')[0]) || 1;
    return new Date(baseTime.getTime() + days * 24 * 60 * 60 * 1000);
  } else if (interval.includes('week')) {
    const weeks = parseInt(interval.split(' ')[0]) || 1;
    return new Date(baseTime.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
  } else if (interval.includes('month')) {
    const months = parseInt(interval.split(' ')[0]) || 1;
    const newDate = new Date(baseTime);
    newDate.setMonth(newDate.getMonth() + months);
    return newDate;
  }
  
  // Default to daily
  return new Date(baseTime.getTime() + 24 * 60 * 60 * 1000);
}

serve(async (req) => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };
  
  // Handle OPTIONS request for CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }
  
  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, message: "Method not allowed" }), 
      { headers, status: 405 }
    );
  }
  
  try {
    // Create a Supabase client
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase URL and service role key are required");
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Process scheduled tasks
    const result = await processScheduledTasks(supabase);
    
    return new Response(
      JSON.stringify(result),
      { headers, status: result.success ? 200 : 500 }
    );
  } catch (error) {
    console.error("Scheduler error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      { headers, status: 500 }
    );
  }
});
