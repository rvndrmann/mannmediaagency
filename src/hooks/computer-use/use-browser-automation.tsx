
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBrowserAutomationAdapter, BrowserAction, actionToJson, jsonToAction } from "./browser-automation-adapter";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

export type BrowserEnvironment = "browser";

export interface BrowserSession {
  id: string;
  task: string;
  status: "active" | "completed" | "failed";
}

export interface BrowserActionHistory {
  id: string;
  action: BrowserAction;
  reasoning: string;
  timestamp: Date;
  screenshot?: string;
  status: "pending" | "executed" | "failed";
}

export const useBrowserAutomation = () => {
  const [taskDescription, setTaskDescription] = useState<string>("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>("https://www.google.com");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentActions, setCurrentActions] = useState<BrowserAction[]>([]);
  const [actionHistory, setActionHistory] = useState<BrowserActionHistory[]>([]);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [reasoning, setReasoning] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [browserSessionConnected, setBrowserSessionConnected] = useState<boolean>(false);
  
  // Get the supabase project URL to create a websocket URL
  const supabaseUrl = supabase.supabaseUrl;
  // Create a WebSocket URL from the Supabase URL
  const wsBaseUrl = supabaseUrl.replace('https://', 'wss://');
  
  const { 
    sendToBrowserAutomation, 
    formatAction, 
    actionToJson, 
    jsonToAction, 
    normalizeUrl
  } = useBrowserAutomationAdapter();
  
  const { data: userCredits, refetch: refetchCredits } = useQuery({
    queryKey: ["userCredits"],
    queryFn: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
          .from("user_credits")
          .select("credits_remaining")
          .eq("user_id", user.id)
          .single();

        if (error) throw error;
        return data;
      } catch (error) {
        console.error("Error fetching user credits:", error);
        return { credits_remaining: 0 };
      }
    },
  });
  
  // Initialize WebSocket connection to browser automation service
  const initializeWebSocket = useCallback(async (session_id: string) => {
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      
      if (!accessToken) {
        console.error("No access token available for WebSocket authentication");
        toast.error("Authentication error. Please sign in again.");
        return;
      }
      
      const wsUrl = `${wsBaseUrl}/functions/v1/browser-automation-ws?session_id=${session_id}&token=${accessToken}`;
      console.log("Connecting to WebSocket:", wsUrl);
      
      // Close any existing connection
      if (wsConnection && wsConnection.readyState !== WebSocket.CLOSED) {
        wsConnection.close();
      }
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log("WebSocket connection established");
        setBrowserSessionConnected(true);
        toast.success("Connected to browser automation service");
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("WebSocket message received:", data);
          
          if (data.type === "screenshot") {
            setScreenshot(data.data);
            // Also capture this in the database for history
            if (sessionId) {
              supabase
                .from("browser_automation_actions")
                .update({
                  screenshot_url: data.data
                })
                .eq("session_id", sessionId)
                .eq("status", "pending")
                .order("created_at", { ascending: true })
                .limit(1);
            }
          } else if (data.type === "navigation") {
            setCurrentUrl(data.url);
          } else if (data.type === "action_status") {
            if (data.status === "completed") {
              toast.success(`Action completed: ${data.action_type}`);
              // Update action status in database
              if (sessionId) {
                supabase
                  .from("browser_automation_actions")
                  .update({
                    status: "executed",
                    executed_at: new Date().toISOString()
                  })
                  .eq("session_id", sessionId)
                  .eq("status", "pending")
                  .order("created_at", { ascending: true })
                  .limit(1);
                
                // Fetch the next action
                fetchNextAction();
              }
            } else if (data.status === "failed") {
              toast.error(`Action failed: ${data.action_type} - ${data.error}`);
              // Update action status in database
              if (sessionId) {
                supabase
                  .from("browser_automation_actions")
                  .update({
                    status: "failed",
                    executed_at: new Date().toISOString()
                  })
                  .eq("session_id", sessionId)
                  .eq("status", "pending")
                  .order("created_at", { ascending: true })
                  .limit(1);
              }
            }
          } else if (data.type === "error") {
            toast.error(`Browser automation error: ${data.message}`);
            setError(data.message);
          } else if (data.type === "connected") {
            toast.success(data.message || "Connected to browser");
            setBrowserSessionConnected(true);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };
      
      ws.onerror = (event) => {
        console.error("WebSocket error:", event);
        setBrowserSessionConnected(false);
        toast.error("Connection to browser automation service failed");
        setError("Failed to connect to browser service. Please try again.");
      };
      
      ws.onclose = () => {
        console.log("WebSocket connection closed");
        setBrowserSessionConnected(false);
        
        // Auto-reconnect logic
        if (sessionId) {
          setTimeout(() => {
            if (sessionId === session_id) { // Make sure we're still in the same session
              console.log("Attempting to reconnect WebSocket...");
              initializeWebSocket(session_id);
            }
          }, 5000);
        }
      };
      
      setWsConnection(ws);
    } catch (error) {
      console.error("Error initializing WebSocket:", error);
      toast.error("Failed to connect to browser automation service");
      setError("Failed to initialize browser service. Please try again.");
    }
  }, [wsBaseUrl, sessionId]);
  
  // Cleanup WebSocket connection on unmount
  useEffect(() => {
    return () => {
      if (wsConnection) {
        console.log("Closing WebSocket connection");
        wsConnection.close();
      }
    };
  }, [wsConnection]);
  
  const captureScreenshot = useCallback(async () => {
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      wsConnection.send(JSON.stringify({ type: "capture_screenshot" }));
      return true;
    } else {
      console.error("WebSocket not connected for screenshot capture");
      
      if (sessionId) {
        // Try to reconnect if we have a session
        initializeWebSocket(sessionId);
        toast.error("Connection lost. Reconnecting...");
      }
      
      return false;
    }
  }, [wsConnection, sessionId, initializeWebSocket]);
  
  const fetchActionHistory = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      const { data, error } = await supabase
        .from("browser_automation_actions")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      
      const formattedHistory: BrowserActionHistory[] = data ? data.map(item => {
        const actionData = jsonToAction(item.action_details);
        
        if (!actionData) {
          console.error("Invalid action data in history:", item.action_details);
          return null;
        }
        
        return {
          id: item.id,
          action: actionData,
          reasoning: item.reasoning,
          timestamp: new Date(item.created_at),
          screenshot: item.screenshot_url,
          status: item.status as "pending" | "executed" | "failed"
        };
      }).filter(Boolean) as BrowserActionHistory[] : [];
      
      setActionHistory(formattedHistory);
    } catch (error) {
      console.error("Error fetching action history:", error);
      toast.error("Failed to load action history");
    }
  }, [sessionId, jsonToAction]);
  
  const fetchNextAction = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      // Get the next pending action for this session
      const { data, error } = await supabase
        .from("browser_automation_actions")
        .select("*")
        .eq("session_id", sessionId)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        const actionData = jsonToAction(data.action_details);
        if (actionData) {
          setCurrentActions([actionData]);
          setReasoning(data.reasoning || "");
        }
      } else {
        // No pending actions, get next steps from AI
        await getNextActions();
      }
      
      await fetchActionHistory();
    } catch (error) {
      console.error("Error fetching next action:", error);
      toast.error("Failed to fetch next action");
    }
  }, [sessionId, jsonToAction, fetchActionHistory]);
  
  const getNextActions = useCallback(async () => {
    if (!sessionId || !currentUrl) {
      console.error("No session or URL for getting next actions");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // First take a screenshot if we have a WebSocket connection
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.send(JSON.stringify({ type: "capture_screenshot" }));
        // Wait a bit for the screenshot to come back
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Get the previous action to provide context
      const previousAction = actionHistory.length > 0 
        ? actionHistory[actionHistory.length - 1].action 
        : null;
      
      const browserResponse = await sendToBrowserAutomation({
        task: taskDescription,
        screenshot: screenshot || undefined,
        current_url: currentUrl,
        previous_actions: previousAction ? [previousAction] : undefined,
        session_id: sessionId
      });
      
      if (!browserResponse) {
        throw new Error("Failed to get response from browser automation service");
      }
      
      if (browserResponse.actions.length > 0) {
        setCurrentActions(browserResponse.actions);
        setReasoning(browserResponse.reasoning || "");
        
        // Store the actions in the database
        for (const action of browserResponse.actions) {
          await supabase
            .from("browser_automation_actions")
            .insert({
              session_id: sessionId,
              action_type: action.type,
              action_details: actionToJson(action),
              reasoning: browserResponse.reasoning,
              status: "pending"
            });
        }
      } else {
        // If no actions, update session as completed
        await supabase
          .from("browser_automation_sessions")
          .update({
            status: "completed",
            completed_at: new Date().toISOString()
          })
          .eq("id", sessionId);
        
        toast.success("Task completed successfully");
      }
      
      await fetchActionHistory();
    } catch (error) {
      console.error("Error getting next actions:", error);
      setError(error instanceof Error ? error.message : "Failed to get next actions");
      toast.error(error instanceof Error ? error.message : "Failed to get next actions");
    } finally {
      setIsProcessing(false);
    }
  }, [
    sessionId,
    wsConnection,
    currentUrl,
    taskDescription,
    screenshot,
    actionHistory,
    sendToBrowserAutomation,
    fetchActionHistory,
    actionToJson
  ]);
  
  const startSession = useCallback(async () => {
    if (!taskDescription.trim()) {
      toast.error("Please enter a task description");
      return;
    }
    
    if (!userCredits || userCredits.credits_remaining < 1) {
      toast.error("You need at least 1 credit to use the Browser Automation");
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    setRetryCount(0);
    
    try {
      const { data: { user }, error: authCheckError } = await supabase.auth.getUser();
      if (authCheckError || !user) {
        setError("You need to be signed in to use the Browser Automation");
        toast.error("Authentication required. Please sign in to continue.");
        return;
      }
      
      // Create a new browser automation session
      const { data: sessionData, error: sessionError } = await supabase
        .from("browser_automation_sessions")
        .insert({
          user_id: user.id,
          task_description: taskDescription,
          status: "active"
        })
        .select()
        .single();
      
      if (sessionError) {
        throw new Error(sessionError.message);
      }
      
      setSessionId(sessionData.id);
      
      // Initialize WebSocket connection with the new session ID
      await initializeWebSocket(sessionData.id);
      
      // Once connected, get the first actions from the AI
      setTimeout(async () => {
        const browserResponse = await sendToBrowserAutomation({
          task: taskDescription,
          current_url: currentUrl || undefined,
          session_id: sessionData.id
        });
        
        if (!browserResponse) {
          throw new Error("Failed to get response from browser automation service");
        }
        
        // Store the first set of actions
        setCurrentActions(browserResponse.actions);
        setReasoning(browserResponse.reasoning || "");
        
        if (browserResponse.actions.length > 0) {
          for (const action of browserResponse.actions) {
            await supabase
              .from("browser_automation_actions")
              .insert({
                session_id: sessionData.id,
                action_type: action.type,
                action_details: actionToJson(action),
                reasoning: browserResponse.reasoning,
                status: "pending"
              });
          }
        }
        
        await fetchActionHistory();
        await refetchCredits();
        
        toast.success("Browser automation session started");
      }, 2000);
    } catch (error) {
      console.error("Error starting session:", error);
      setError(error instanceof Error ? error.message : "Failed to start session");
      toast.error(error instanceof Error ? error.message : "Failed to start session");
    } finally {
      setIsProcessing(false);
    }
  }, [
    taskDescription, 
    currentUrl, 
    userCredits, 
    sendToBrowserAutomation, 
    fetchActionHistory, 
    refetchCredits,
    initializeWebSocket,
    actionToJson
  ]);
  
  const executeAction = useCallback(async () => {
    if (!sessionId || currentActions.length === 0 || !wsConnection) {
      toast.error("No actions to execute or no connection to browser");
      return;
    }
    
    if (wsConnection.readyState !== WebSocket.OPEN) {
      toast.error("Browser connection lost. Reconnecting...");
      initializeWebSocket(sessionId);
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const actionToExecute = currentActions[0];
      
      // Send the action to the WebSocket server
      wsConnection.send(JSON.stringify({
        type: "execute_action",
        action: actionToExecute
      }));
      
      // The response will be handled by the WebSocket onmessage event
      // Which will trigger fetchNextAction() when the action is completed
      
      // Remove the current action from the list
      setCurrentActions(currentActions.slice(1));
      
    } catch (error) {
      console.error("Error executing action:", error);
      setError(error instanceof Error ? error.message : "Failed to execute action");
      toast.error(error instanceof Error ? error.message : "Failed to execute action");
      
      // Implement retry mechanism for failed actions
      if (retryCount < 2) {
        setRetryCount(prev => prev + 1);
        toast.info(`Action failed. Retrying (${retryCount + 1}/3)...`);
        
        // Wait before retrying
        setTimeout(() => {
          executeAction();
        }, 3000);
        return;
      } else {
        // Mark the action as failed after max retries
        if (sessionId) {
          await supabase
            .from("browser_automation_actions")
            .update({
              status: "failed",
              executed_at: new Date().toISOString()
            })
            .eq("session_id", sessionId)
            .eq("status", "pending")
            .order("created_at", { ascending: true })
            .limit(1);
            
          // Reset retry count and move to next action
          setRetryCount(0);
          await fetchNextAction();
        }
      }
    } finally {
      setIsProcessing(false);
    }
  }, [
    sessionId, 
    currentActions, 
    wsConnection, 
    fetchNextAction,
    retryCount,
    initializeWebSocket
  ]);
  
  const clearSession = useCallback(() => {
    // Close the WebSocket connection if exists
    if (wsConnection) {
      wsConnection.close();
      setWsConnection(null);
    }
    
    setSessionId(null);
    setCurrentActions([]);
    setActionHistory([]);
    setReasoning("");
    setScreenshot(null);
    setError(null);
    setCurrentUrl("https://www.google.com");
    setRetryCount(0);
    setBrowserSessionConnected(false);
    toast.info("Session ended");
  }, [wsConnection]);
  
  useEffect(() => {
    if (sessionId) {
      fetchActionHistory();
    }
  }, [sessionId, fetchActionHistory]);
  
  return {
    taskDescription,
    setTaskDescription,
    sessionId,
    isProcessing,
    currentActions,
    startSession,
    executeAction,
    clearSession,
    currentUrl,
    setCurrentUrl,
    actionHistory,
    userCredits,
    screenshot,
    setScreenshot,
    captureScreenshot,
    reasoning,
    error,
    formatAction,
    browserSessionConnected
  };
};
