
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.1";
import * as playwright from "playwright";

// Define API endpoints and environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface BrowserAction {
  type: string;
  x?: number;
  y?: number;
  text?: string;
  url?: string;
  keys?: string[];
  selector?: string;
  value?: string;
  button?: string;
}

console.log("Browser Automation WebSocket function loaded");

serve(async (req) => {
  // Handle preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() != "websocket") {
    return new Response("Request is not a WebSocket upgrade", { 
      status: 400,
      headers: { ...corsHeaders }
    });
  }

  try {
    console.log("WebSocket connection request received");
    
    // Get query parameters
    const url = new URL(req.url);
    const session_id = url.searchParams.get("session_id");
    const token = url.searchParams.get("token");
    
    if (!session_id || !token) {
      return new Response("Missing required parameters: session_id and token", { 
        status: 400,
        headers: { ...corsHeaders }
      });
    }
    
    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error("Authentication failed:", authError);
      return new Response("Authentication failed", { 
        status: 401,
        headers: { ...corsHeaders }
      });
    }
    
    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabase
      .from("browser_automation_sessions")
      .select("*")
      .eq("id", session_id)
      .eq("user_id", user.id)
      .single();
    
    if (sessionError || !session) {
      console.error("Session not found:", sessionError);
      return new Response("Session not found or doesn't belong to authenticated user", { 
        status: 404,
        headers: { ...corsHeaders }
      });
    }
    
    console.log("Upgrading connection to WebSocket");
    
    // Establish WebSocket connection
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    // Initialize browser
    let browser;
    let page;
    let isConnected = false;
    
    socket.onopen = async () => {
      console.log("WebSocket connection opened");
      
      try {
        console.log("Launching browser...");
        browser = await playwright.chromium.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ]
        });
        
        const context = await browser.newContext({
          viewport: { width: 1280, height: 800 },
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'
        });
        
        page = await context.newPage();
        console.log("Browser launched successfully");
        isConnected = true;
        
        // Send confirmation message
        socket.send(JSON.stringify({
          type: "connected",
          message: "Connected to browser automation service"
        }));
        
        // Navigate to initial page
        await page.goto("https://www.google.com").catch(err => {
          console.error("Error navigating to initial page:", err);
        });
        
        // Take initial screenshot and convert it properly to base64
        try {
          const screenshot = await page.screenshot({ type: "jpeg", quality: 80 });
          
          // Convert the Uint8Array to a proper base64 string
          const base64Screenshot = `data:image/jpeg;base64,${btoa(String.fromCharCode.apply(null, [...new Uint8Array(screenshot)]))}`;
          
          socket.send(JSON.stringify({
            type: "screenshot",
            data: base64Screenshot
          }));
          
          socket.send(JSON.stringify({
            type: "navigation",
            url: page.url()
          }));
        } catch (screenshotError) {
          console.error("Error taking initial screenshot:", screenshotError);
        }
      } catch (error) {
        console.error("Error initializing browser:", error);
        socket.send(JSON.stringify({
          type: "error",
          message: "Failed to initialize browser: " + error.message
        }));
        
        if (browser) {
          await browser.close().catch(console.error);
        }
        
        socket.close(1011, "Browser initialization failed");
      }
    };
    
    socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("Received message:", message);
        
        if (!isConnected) {
          socket.send(JSON.stringify({
            type: "error",
            message: "Browser not connected yet. Please wait."
          }));
          return;
        }
        
        if (message.type === "capture_screenshot") {
          try {
            if (!page) {
              throw new Error("Browser page not initialized");
            }
            
            const screenshot = await page.screenshot({ type: "jpeg", quality: 80 });
            // Convert the Uint8Array to a proper base64 string
            const base64Screenshot = `data:image/jpeg;base64,${btoa(String.fromCharCode.apply(null, [...new Uint8Array(screenshot)]))}`;
            
            socket.send(JSON.stringify({
              type: "screenshot",
              data: base64Screenshot
            }));
          } catch (error) {
            console.error("Error capturing screenshot:", error);
            socket.send(JSON.stringify({
              type: "error",
              message: "Failed to capture screenshot: " + error.message
            }));
          }
        } else if (message.type === "execute_action") {
          const action = message.action as BrowserAction;
          
          try {
            if (!page) {
              throw new Error("Browser page not initialized");
            }
            
            console.log(`Executing action: ${action.type}`);
            
            switch (action.type) {
              case "click":
                if (action.selector) {
                  await page.click(action.selector);
                } else if (action.x !== undefined && action.y !== undefined) {
                  await page.mouse.click(action.x, action.y);
                }
                break;
                
              case "type":
                if (action.selector) {
                  await page.fill(action.selector, action.text || "");
                } else {
                  await page.keyboard.type(action.text || "");
                }
                break;
                
              case "openUrl":
              case "navigate":
                const url = action.url || "https://www.google.com";
                await page.goto(url);
                // Send the new URL to the client
                socket.send(JSON.stringify({
                  type: "navigation",
                  url: page.url()
                }));
                break;
                
              case "press":
                if (action.keys && action.keys.length > 0) {
                  if (action.keys.length === 1) {
                    await page.keyboard.press(action.keys[0]);
                  } else {
                    // For key combinations
                    for (let i = 0; i < action.keys.length - 1; i++) {
                      await page.keyboard.down(action.keys[i]);
                    }
                    await page.keyboard.press(action.keys[action.keys.length - 1]);
                    for (let i = 0; i < action.keys.length - 1; i++) {
                      await page.keyboard.up(action.keys[i]);
                    }
                  }
                }
                break;
                
              case "select":
                if (action.selector && action.value) {
                  await page.selectOption(action.selector, action.value);
                }
                break;
                
              default:
                throw new Error(`Unsupported action type: ${action.type}`);
            }
            
            // Wait for any potential navigation or rendering
            await page.waitForLoadState("networkidle").catch(() => {
              console.log("Network did not reach idle state, continuing...");
            });
            
            // Send action completed notification
            socket.send(JSON.stringify({
              type: "action_status",
              status: "completed",
              action_type: action.type
            }));
            
            // Take a new screenshot after action
            const screenshot = await page.screenshot({ type: "jpeg", quality: 80 });
            // Convert the Uint8Array to a proper base64 string
            const base64Screenshot = `data:image/jpeg;base64,${btoa(String.fromCharCode.apply(null, [...new Uint8Array(screenshot)]))}`;
            
            socket.send(JSON.stringify({
              type: "screenshot",
              data: base64Screenshot
            }));
            
            // Send current URL
            socket.send(JSON.stringify({
              type: "navigation",
              url: page.url()
            }));
          } catch (error) {
            console.error(`Error executing action ${action.type}:`, error);
            socket.send(JSON.stringify({
              type: "action_status",
              status: "failed",
              action_type: action.type,
              error: error.message
            }));
            
            // Still try to get a screenshot if possible
            try {
              if (page) {
                const screenshot = await page.screenshot({ type: "jpeg", quality: 80 });
                // Convert the Uint8Array to a proper base64 string
                const base64Screenshot = `data:image/jpeg;base64,${btoa(String.fromCharCode.apply(null, [...new Uint8Array(screenshot)]))}`;
                
                socket.send(JSON.stringify({
                  type: "screenshot",
                  data: base64Screenshot
                }));
              }
            } catch (screenshotError) {
              console.error("Failed to take error screenshot:", screenshotError);
            }
          }
        }
      } catch (error) {
        console.error("Error processing message:", error);
        socket.send(JSON.stringify({
          type: "error",
          message: "Error processing message: " + error.message
        }));
      }
    };
    
    socket.onclose = async (event) => {
      console.log(`WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`);
      if (browser) {
        await browser.close().catch(console.error);
      }
    };
    
    socket.onerror = (event) => {
      console.error("WebSocket error:", event);
      if (browser) {
        browser.close().catch(console.error);
      }
    };
    
    return response;
  } catch (error) {
    console.error("Error in WebSocket setup:", error);
    return new Response("Internal server error: " + error.message, { 
      status: 500,
      headers: { ...corsHeaders }
    });
  }
});
