
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.1";

const BROWSER_USE_API_KEY = Deno.env.get('BROWSER_USE_API_KEY');
const BROWSER_USE_API_URL = "https://api.browser-use.com/api/v1";

// Format for cron job: this function can be called by a scheduled job
serve(async (req) => {
  try {
    // Verify request authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid Authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log("Running browser tasks scheduler");
    
    const now = new Date();
    
    // Get tasks that are scheduled to run now
    const { data: tasksToRun, error: fetchError } = await supabase
      .from('scheduled_browser_tasks')
      .select('*, user_credits(credits_remaining)')
      .eq('status', 'pending')
      .lte('scheduled_time', now.toISOString());
    
    if (fetchError) {
      console.error("Error fetching scheduled tasks:", fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch scheduled tasks', details: fetchError }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Found ${tasksToRun?.length || 0} tasks to run`);
    
    const results = [];
    
    // Process each task that's due to run
    for (const task of (tasksToRun || [])) {
      console.log(`Processing scheduled task ${task.id}`);
      
      // Check if user has enough credits
      const userCredits = task.user_credits?.credits_remaining || 0;
      
      if (userCredits < 1) {
        console.log(`User ${task.user_id} doesn't have enough credits. Marking task as failed`);
        
        // Update task status to failed
        const { error: updateError } = await supabase
          .from('scheduled_browser_tasks')
          .update({ 
            status: 'failed',
            last_run_at: now.toISOString()
          })
          .eq('id', task.id);
        
        if (updateError) {
          console.error(`Error updating task status to failed:`, updateError);
        }
        
        results.push({
          taskId: task.id,
          status: 'failed',
          reason: 'Insufficient credits'
        });
        
        continue;
      }
      
      try {
        // Launch browser task via Browser Use API
        const requestBody = {
          task: task.task_input,
          environment: 'browser',
          save_browser_data: true
        };
        
        // Add browser configuration if available
        if (task.browser_config) {
          // Transform the configuration to match the API's expected format
          const apiConfig: any = { ...task.browser_config };
          
          // Handle sensitive data if present
          if (task.browser_config.sensitiveData && task.browser_config.sensitiveData.length > 0) {
            const sensitiveDataMap: Record<string, string> = {};
            
            // Convert to the format expected by the API
            task.browser_config.sensitiveData.forEach((item: any) => {
              sensitiveDataMap[item.key] = item.value;
            });
            
            apiConfig.sensitive_data = sensitiveDataMap;
            delete apiConfig.sensitiveData;
          }
          
          // Handle connection methods specifically
          if (task.browser_config.wssUrl) {
            apiConfig.wss_url = task.browser_config.wssUrl;
            delete apiConfig.wssUrl;
          }
          
          if (task.browser_config.cdpUrl) {
            apiConfig.cdp_url = task.browser_config.cdpUrl;
            delete apiConfig.cdpUrl;
          }
          
          if (task.browser_config.browserInstancePath) {
            apiConfig.browser_instance_path = task.browser_config.browserInstancePath;
            delete apiConfig.browserInstancePath;
          }
          
          if (task.browser_config.chromePath) {
            apiConfig.chrome_path = task.browser_config.chromePath;
            delete apiConfig.chromePath;
          }
          
          // Transform context config if present
          if (task.browser_config.contextConfig) {
            apiConfig.context_config = {
              ...task.browser_config.contextConfig,
              
              // Transform camelCase to snake_case for API compatibility
              min_wait_page_load_time: task.browser_config.contextConfig.minWaitPageLoadTime,
              wait_for_network_idle_page_load_time: task.browser_config.contextConfig.waitForNetworkIdlePageLoadTime,
              max_wait_page_load_time: task.browser_config.contextConfig.maxWaitPageLoadTime,
              browser_window_size: task.browser_config.contextConfig.browserWindowSize,
              highlight_elements: task.browser_config.contextConfig.highlightElements,
              viewport_expansion: task.browser_config.contextConfig.viewportExpansion,
              user_agent: task.browser_config.contextConfig.userAgent,
              allowed_domains: task.browser_config.contextConfig.allowedDomains
            };
            
            // Remove camelCase properties
            delete apiConfig.context_config.minWaitPageLoadTime;
            delete apiConfig.context_config.waitForNetworkIdlePageLoadTime;
            delete apiConfig.context_config.maxWaitPageLoadTime;
            delete apiConfig.context_config.browserWindowSize;
            delete apiConfig.context_config.highlightElements;
            delete apiConfig.context_config.viewportExpansion;
            delete apiConfig.context_config.userAgent;
            delete apiConfig.context_config.allowedDomains;
            
            delete apiConfig.contextConfig;
          }
          
          requestBody.browser_config = apiConfig;
        }
        
        const options = {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${BROWSER_USE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        };
        
        console.log(`Starting scheduled browser automation task for ${task.id}`);
        const response = await fetch(`${BROWSER_USE_API_URL}/run-task`, options);
        const apiData = await response.json();
        
        if (!response.ok) {
          throw new Error(apiData.error || 'Failed to start browser automation task');
        }
        
        // Log the task in the database
        const { error: taskLogError } = await supabase
          .from('browser_automation_tasks')
          .insert({
            user_id: task.user_id,
            task_id: apiData.id,
            task_description: task.task_input,
            environment: 'browser',
            status: 'running',
            browser_config: task.browser_config || null
          });
        
        if (taskLogError) {
          console.error('Error logging task in database:', taskLogError);
        }
        
        // Deduct a credit for the task
        const { error: creditUpdateError } = await supabase
          .from('user_credits')
          .update({ 
            credits_remaining: userCredits - 1,
            last_used_at: now.toISOString()
          })
          .eq('user_id', task.user_id);
          
        if (creditUpdateError) {
          console.error('Error updating user credits:', creditUpdateError);
        }
        
        // Update the scheduled task status
        let taskStatus = 'completed';
        let nextRunTime = null;
        
        // If this is a recurring task, calculate next run time and set status to 'pending'
        if (task.schedule_type === 'recurring' && task.repeat_interval) {
          taskStatus = 'pending';
          
          // Use the next_run_at field if it exists, otherwise calculate it
          if (task.next_run_at) {
            nextRunTime = new Date(task.next_run_at);
          } else {
            // Parse the repeat interval (e.g. "1 day", "1 week", "1 month")
            const intervalParts = task.repeat_interval.split(' ');
            const amount = parseInt(intervalParts[0]);
            const unit = intervalParts[1];
            
            // Calculate the next run time
            nextRunTime = new Date(task.scheduled_time);
            
            if (unit.includes('day')) {
              nextRunTime.setDate(nextRunTime.getDate() + amount);
            } else if (unit.includes('week')) {
              nextRunTime.setDate(nextRunTime.getDate() + (amount * 7));
            } else if (unit.includes('month')) {
              nextRunTime.setMonth(nextRunTime.getMonth() + amount);
            }
          }
        }
        
        const updateData: any = {
          status: taskStatus,
          last_run_at: now.toISOString()
        };
        
        if (nextRunTime) {
          updateData.scheduled_time = nextRunTime.toISOString();
          updateData.next_run_at = null; // Reset next_run_at so it will be recalculated next time
        }
        
        const { error: updateError } = await supabase
          .from('scheduled_browser_tasks')
          .update(updateData)
          .eq('id', task.id);
        
        if (updateError) {
          console.error(`Error updating scheduled task:`, updateError);
        }
        
        results.push({
          taskId: task.id,
          browserTaskId: apiData.id,
          status: 'running',
          nextRun: nextRunTime ? nextRunTime.toISOString() : null
        });
        
      } catch (error) {
        console.error(`Error running scheduled task ${task.id}:`, error);
        
        // Update task status to failed
        const { error: updateError } = await supabase
          .from('scheduled_browser_tasks')
          .update({ 
            status: 'failed',
            last_run_at: now.toISOString()
          })
          .eq('id', task.id);
        
        if (updateError) {
          console.error(`Error updating task status to failed:`, updateError);
        }
        
        results.push({
          taskId: task.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return new Response(
      JSON.stringify({
        processed: tasksToRun?.length || 0,
        results: results
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in browser-tasks-scheduler:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
