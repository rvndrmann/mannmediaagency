
import { serve } from "std/http/server.ts";
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
  user_id: string;
}

interface ProcessTaskResult {
  success: boolean;
  message: string;
  taskId?: string;
  tasksProcessed?: number;
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
    console.log(`Processing scheduled tasks at ${now.toISOString()}`);
    
    // Get tasks that are scheduled to run now
    const { data: tasks, error } = await supabase
      .from('scheduled_browser_tasks')
      .select('*')
      .or(`status.eq.pending,status.eq.active`)
      .lte('scheduled_time', now.toISOString());
    
    if (error) {
      console.error("Error querying scheduled tasks:", error);
      throw error;
    }
    
    console.log(`Found ${tasks?.length || 0} tasks to process`);
    
    if (!tasks || tasks.length === 0) {
      return { success: true, message: "No tasks to process at this time", tasksProcessed: 0 };
    }
    
    let processedCount = 0;
    
    // Process each task
    for (const task of tasks) {
      console.log(`Processing task ${task.id}, scheduled for ${task.scheduled_time}`);
      
      try {
        // Process task with sensitive data
        let processedTaskInput = task.task_input;
        if (task.browser_config && task.browser_config.sensitiveData) {
          processedTaskInput = processTaskWithSensitiveData(
            task.task_input, 
            task.browser_config.sensitiveData
          );
          console.log(`Processed sensitive data for task ${task.id}`);
        }
        
        // Start the task using the browser-use-api function
        console.log(`Invoking browser-use-api for task ${task.id}`);
        const { data: startTaskResult, error: startTaskError } = await supabase.functions.invoke(
          'browser-use-api',
          {
            body: {
              task: processedTaskInput,
              environment: 'browser',
              browser_config: task.browser_config,
              scheduled_task_id: task.id,
              user_id: task.user_id
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
        
        console.log(`Task ${task.id} started successfully with browser task ID: ${startTaskResult?.taskId}`);
        const taskId = startTaskResult?.taskId;
        
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
            
          console.log(`One-time task ${task.id} marked as completed`);
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
            
          console.log(`Recurring task ${task.id} updated with next run time: ${nextRun.toISOString()}`);
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
          
        processedCount++;
        console.log(`Successfully processed task ${task.id}`);
      } catch (taskError) {
        console.error(`Error processing individual task ${task.id}:`, taskError);
        
        // Update task status to failed but continue processing other tasks
        await supabase
          .from('scheduled_browser_tasks')
          .update({ 
            status: 'failed',
            last_run_at: now.toISOString()
          })
          .eq('id', task.id);
      }
    }
    
    return { 
      success: true, 
      message: `Successfully processed ${processedCount} out of ${tasks.length} tasks`,
      tasksProcessed: processedCount
    };
  } catch (error) {
    console.error("Error processing scheduled tasks:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Unknown error",
      tasksProcessed: 0
    };
  }
}

// Calculate next run time based on repeat interval
function calculateNextRun(task: ScheduledTask): Date {
  const baseTime = task.next_run_at ? new Date(task.next_run_at) : new Date(task.scheduled_time);
  const interval = task.repeat_interval || '1 day';
  console.log(`Calculating next run time for task ${task.id} with interval ${interval} from base time ${baseTime.toISOString()}`);
  
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
    
    console.log("Creating Supabase client");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get request body
    let body;
    try {
      body = await req.json();
      console.log("Request body:", JSON.stringify(body));
    } catch (e) {
      console.log("No request body or invalid JSON");
      body = {};
    }
    
    // Process scheduled tasks
    console.log("Processing scheduled tasks");
    const result = await processScheduledTasks(supabase);
    console.log("Processing result:", JSON.stringify(result));
    
    return new Response(
      JSON.stringify(result),
      { headers, status: result.success ? 200 : 500 }
    );
  } catch (error) {
    console.error("Scheduler error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      }),
      { headers, status: 500 }
    );
  }
});
