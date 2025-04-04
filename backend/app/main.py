import logging
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Any

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
from .services.agent_service import agent_service # Import agent service

# --- Chat Endpoint ---
@app.post("/api/chat/{project_id}/send", response_model=ChatMessageResponse)
async def send_chat_message(project_id: str, request_data: ChatMessageRequest):
    """
    Handles incoming chat messages, interacts with the AgentService/OpenAI Assistant,
    and returns the assistant's response.
    """
    logger.info(f"Received chat message for project {project_id}. Thread ID: {request_data.thread_id}")
    try:
        response_data = await agent_service.process_chat_message(
            project_id=project_id,
            thread_id=request_data.thread_id,
            message_text=request_data.input,
            attachments=request_data.attachments or []
            # TODO: Pass sceneId if needed by agent logic: request_data.sceneId
        )
        # Ensure the response matches the Pydantic model
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

# --- Run the server (for local development) ---
#     return {"message": "Chat endpoint not yet implemented"}

# --- Run the server (for local development) ---
if __name__ == "__main__":
    import uvicorn
    from .config import settings
    logger.info(f"Starting Uvicorn server on {settings.host}:{settings.port}")
    uvicorn.run(app, host=settings.host, port=settings.port)