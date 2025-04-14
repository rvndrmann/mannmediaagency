import logging
import json # Added for MCP communication
import subprocess # Added for MCP communication
import os # Added to construct path
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Any, Optional, Dict # Added Optional, Dict
from dotenv import load_dotenv # Added to load .env file

# Load environment variables from .env file at the very start
# This makes them available via os.getenv() throughout the application
load_dotenv()

# Import the pipeline runner function
from .services.pipeline_runner import start_project_generation

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app instance
app = FastAPI(title="Mann Media Agency - Agent Backend", version="0.1.0")

# Configure CORS
# Adjust origins based on your frontend URL
origins = [
    "http://localhost:5173", # Default Vite dev server port
    "http://localhost:3000", # Common React dev server port
    # Add your production frontend URL here
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models ---

class NotificationPayloadDetail(BaseModel):
    sceneId: str = Field(..., alias="sceneId")
    field: str
    value: Any

class NotificationPayload(BaseModel):
    type: str
    payload: NotificationPayloadDetail

class ChatMessageRequest(BaseModel):
    input: str
    thread_id: Optional[str] = None
    sceneId: Optional[str] = None # Added sceneId
    attachments: Optional[list] = None # Added attachments

class ChatMessageResponse(BaseModel):
    thread_id: str
    content: str
    run_id: str
    status: Optional[str] = None # e.g., 'completed', 'requires_action'
    required_action: Optional[Any] = None

# New Models for MCP Proxy
class McpCallRequest(BaseModel):
    toolName: str = Field(..., alias="toolName")
    arguments: Dict[str, Any]

# --- Helper Functions ---

# Define path to the MCP server executable
# IMPORTANT: Assumes this backend runs from the workspace root or adjusts path accordingly
# Using an absolute path based on previous steps
MCP_SERVER_BASE_PATH = "/Users/apple/Documents/Cline/MCP"
CANVAS_CONTENT_GENERATOR_SCRIPT = os.path.join(MCP_SERVER_BASE_PATH, "canvas-content-generator/build/index.js")

async def execute_mcp_stdio(server_script_path: str, tool_name: str, arguments: Dict[str, Any], env: Optional[Dict[str, str]] = None) -> Any:
    """
    Executes a local MCP server script via stdio and calls a tool.
    """
    if not os.path.exists(server_script_path):
         logger.error(f"MCP server script not found at: {server_script_path}")
         raise HTTPException(status_code=500, detail=f"MCP server script not found: {os.path.basename(server_script_path)}")

    mcp_request = {
        "jsonrpc": "2.0",
        "method": "CallTool",
        "params": {"name": tool_name, "arguments": arguments},
        "id": 1 # Simple ID for request/response matching
    }
    request_json = json.dumps(mcp_request) + "\n" # MCP expects newline delimited JSON

    process = None
    try:
        logger.info(f"Starting MCP server: node {server_script_path}")
        # Combine current environment with provided env vars (like API keys from config)
        # For now, we assume keys are in the environment where this backend runs
        # Later, this could read from mcp_settings.json
        current_env = os.environ.copy()
        if env:
            current_env.update(env)

        # Import asyncio here as it's used within this async function
        import asyncio

        process = await asyncio.create_subprocess_exec(
            'node', server_script_path,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE, # Capture stderr for debugging
            env=current_env
        )

        logger.info(f"Sending request to MCP server: {request_json.strip()}")
        process.stdin.write(request_json.encode('utf-8'))
        await process.stdin.drain()
        process.stdin.close() # Close stdin to signal end of input

        # Read response from stdout
        response_json = ""
        while True:
            line = await process.stdout.readline()
            if not line:
                break # End of stream
            response_json += line.decode('utf-8')
            # Basic check if we likely have a full JSON object
            if response_json.strip().endswith('}'):
                 try:
                     # Try parsing early to potentially break sooner
                     json.loads(response_json)
                     break
                 except json.JSONDecodeError:
                     continue # Incomplete JSON, keep reading

        # Read any remaining stderr output
        stderr_output = await process.stderr.read()
        stderr_text = stderr_output.decode('utf-8').strip()
        if stderr_text:
             logger.warning(f"MCP server stderr ({os.path.basename(server_script_path)}): {stderr_text}")


        await process.wait() # Wait for process to terminate

        logger.info(f"Received response from MCP server: {response_json.strip()}")

        if process.returncode != 0:
             logger.error(f"MCP server process exited with code {process.returncode}")
             raise HTTPException(status_code=500, detail=f"MCP server execution failed (code {process.returncode}). Stderr: {stderr_text}")

        if not response_json.strip():
             logger.error("Received empty response from MCP server.")
             raise HTTPException(status_code=500, detail="Received empty response from MCP server.")

        try:
            mcp_response = json.loads(response_json)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response from MCP server: {e}. Response: {response_json}")
            raise HTTPException(status_code=500, detail="Failed to parse response from MCP server.")

        # Handle JSON-RPC errors
        if 'error' in mcp_response:
            error_details = mcp_response['error']
            logger.error(f"MCP server returned error: {error_details}")
            raise HTTPException(status_code=500, detail=f"MCP Error: {error_details.get('message', 'Unknown MCP error')}")

        # Extract the actual result (assuming it's in result.content[0].text and needs parsing again)
        # This matches the structure our canvas-content-generator returns
        try:
            result_text = mcp_response.get('result', {}).get('content', [{}])[0].get('text', '{}')
            final_result = json.loads(result_text)
            return final_result
        except (json.JSONDecodeError, IndexError, KeyError, TypeError) as e:
             logger.error(f"Failed to extract final result from MCP response structure: {e}. Response: {mcp_response}")
             # Return the raw MCP result if extraction fails, frontend might handle it
             return mcp_response.get('result', {})


    except Exception as e:
        logger.exception(f"Error executing MCP tool '{tool_name}': {e}")
        # Ensure process is terminated if it exists and hasn't finished
        if process and process.returncode is None:
            try:
                process.terminate()
                await process.wait() # Ensure termination completes
            except ProcessLookupError:
                pass # Process already finished
            except Exception as term_err:
                logger.error(f"Error terminating MCP process: {term_err}")
        raise HTTPException(status_code=500, detail=f"Failed to execute MCP tool: {str(e)}")
    finally:
         # Ensure process is cleaned up if it exists and finished
         if process and process.returncode is not None:
              try:
                   # Attempt to close transports if needed, though closing stdin above might suffice
                   if process.stdin and not process.stdin.is_closing(): process.stdin.close()
                   # No need to explicitly close stdout/stderr pipes after reading
              except Exception as close_err:
                   logger.warning(f"Error during MCP process cleanup: {close_err}")


# --- API Endpoints ---

@app.get("/")
async def read_root():
    """Root endpoint for health check."""
    logger.info("Root endpoint accessed.")
    return {"message": "Agent Backend is running."}

@app.post("/api/agent/notify-update")
async def notify_update(notification: NotificationPayload):
    """
    Endpoint to receive notifications from the frontend (e.g., Canvas updates).
    """
    logger.info(f"Received notification: Type={notification.type}, Payload={notification.payload}")

    # Process the notification using the AgentService
    try:
        # Ensure agent_service is imported and initialized correctly
        from .services.agent_service import agent_service
        await agent_service.handle_canvas_update_notification(
            scene_id=notification.payload.sceneId,
            field=notification.payload.field,
            value=notification.payload.value
        )
    except Exception as e:
        logger.exception(f"Error processing notification: {notification.dict()}")
        raise HTTPException(status_code=500, detail="Failed to process notification")
    # - Example: If field is 'image_prompt', maybe inform the user via chat

    # For now, just acknowledge receipt
    return {"status": "Notification received", "data": notification.dict()}

# --- Agent Service ---
# Import agent service (ensure it's initialized appropriately elsewhere if needed)
from .services.agent_service import agent_service

# --- Chat Endpoint ---
# Assuming agent_service is available globally or initialized correctly
@app.post("/api/chat/{project_id}/send", response_model=ChatMessageResponse)
async def send_chat_message(project_id: str, request_data: ChatMessageRequest):
    """
    Handles incoming chat messages, interacts with the AgentService/OpenAI Assistant,
    and returns the assistant's response.
    """
    logger.info(f"Received chat message for project {project_id}. Thread ID: {request_data.thread_id}")
    try:
        # This part needs agent_service to be properly set up
        response_data = await agent_service.process_chat_message(
            project_id=project_id,
            thread_id=request_data.thread_id,
            message_text=request_data.input,
            attachments=request_data.attachments or []
        )
        return ChatMessageResponse(**response_data)

    except ValueError as ve:
        logger.warning(f"Validation error processing chat for project {project_id}: {ve}")
        raise HTTPException(status_code=400, detail=str(ve))
    except ConnectionError as ce:
        logger.error(f"Connection error processing chat for project {project_id}: {ce}")
        raise HTTPException(status_code=503, detail="Service unavailable. Could not connect to required backend services.")
    except Exception as e:
        logger.exception(f"Unexpected error processing chat for project {project_id}")
        raise HTTPException(status_code=500, detail="Internal server error")


# --- MCP Proxy Endpoint ---
@app.post("/api/mcp/call")
async def mcp_call_proxy(request: McpCallRequest):
    """
    Proxies MCP tool calls to the appropriate local MCP server.
    """
    tool_name = request.toolName
    arguments = request.arguments
    logger.info(f"Received MCP proxy call for tool: {tool_name}")

    # --- Tool Routing (Simple Example) ---
    target_script = None
    # Add more sophisticated routing later, potentially reading mcp_settings.json
    if tool_name.startswith("generate_scene_"):
        target_script = CANVAS_CONTENT_GENERATOR_SCRIPT
        logger.info(f"Routing '{tool_name}' to Canvas Content Generator.")
    # Example: Add routing for playwright if needed
    # elif tool_name.startswith("browser_"):
    #     target_script = PLAYWRIGHT_SCRIPT_PATH # Define this path
    #     logger.info(f"Routing '{tool_name}' to Playwright.")
    else:
        logger.error(f"No route found for MCP tool: {tool_name}")
        raise HTTPException(status_code=404, detail=f"MCP tool not found or route not configured: {tool_name}")

    # --- Execute MCP Call ---
    try:
        # Pass environment variables (API keys) loaded from .env file
        # The execute_mcp_stdio function uses os.environ which is populated by load_dotenv()
        mcp_env = {
            "SUPABASE_URL": os.getenv("SUPABASE_URL"),
            "SUPABASE_SERVICE_KEY": os.getenv("SUPABASE_SERVICE_KEY"),
            "GEMINI_API_KEY": os.getenv("GEMINI_API_KEY"), # Pass Gemini key now
            # Add other keys needed by MCP servers here
        }
        # Filter out None values to avoid passing unset variables
        mcp_env = {k: v for k, v in mcp_env.items() if v is not None}

        # Import asyncio here if not already imported at the top
        import asyncio

        result = await execute_mcp_stdio(target_script, tool_name, arguments, env=mcp_env)
        return result
    except HTTPException as http_exc:
        # Re-raise HTTP exceptions from execute_mcp_stdio
        raise http_exc
    except Exception as e:
        logger.exception(f"Failed to execute MCP tool '{tool_name}' via proxy.")
        raise HTTPException(status_code=500, detail=f"Error calling MCP tool: {str(e)}")


# --- Generation Pipeline Endpoint ---
@app.post("/api/pipeline/start/{project_id}")
async def trigger_generation_pipeline(project_id: str, background_tasks: BackgroundTasks):
    """
    Triggers the generation pipeline for a specific project as a background task.
    """
    logger.info(f"Received request to start generation pipeline for project: {project_id}")
    # Add the pipeline function as a background task
    background_tasks.add_task(start_project_generation, project_id)
    logger.info(f"Generation pipeline for project {project_id} added to background tasks.")
    # Return immediately
    return {"message": f"Generation pipeline started for project {project_id}"}

# --- Run the server (for local development) ---
if __name__ == "__main__":
    import uvicorn
    # Assuming config is setup correctly, otherwise provide defaults
    # Variables loaded from .env via load_dotenv()
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    # from .config import settings # Use this if config.py exists and is setup
    # logger.info(f"Starting Uvicorn server on {settings.host}:{settings.port}")
    # uvicorn.run(app, host=settings.host, port=settings.port)
    logger.info(f"Starting Uvicorn server on {host}:{port}")
    uvicorn.run("app.main:app", host=host, port=port, reload=True) # Use string format for reload