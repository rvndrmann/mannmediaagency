import logging
import time
import asyncio
import json
from typing import Any, Dict, Optional, List
from openai import OpenAI, AssistantEventHandler
from openai.types.beta.threads import Run
from openai.types.beta.threads.runs import ToolOutput
from ..config import settings # Import settings
from ..supabase_client import get_supabase_client # Import Supabase client getter

# Configure logging
logger = logging.getLogger(__name__)

class AgentService:
    """
    Placeholder class for handling agent logic, interactions with OpenAI Assistants,
    and processing notifications.
    """
    def __init__(self):
        try:
            self.client = OpenAI(api_key=settings.openai_api_key)
            self.assistant_id = settings.openai_assistant_id
            if not self.assistant_id or self.assistant_id == "YOUR_OPENAI_ASSISTANT_ID":
                 logger.warning("OpenAI Assistant ID is not configured in .env file.")
                 # Potentially raise an error or handle gracefully
            logger.info(f"AgentService initialized. Using Assistant ID: {self.assistant_id}")
        except Exception as e:
            logger.exception("Failed to initialize OpenAI client in AgentService.")
            raise RuntimeError("Could not initialize OpenAI client.") from e
        # No in-memory store needed now

    async def _get_or_create_thread(self, project_id: str, existing_thread_id: Optional[str]) -> str:
        """
        Gets the existing OpenAI thread ID associated with the project from the database,
        or creates a new thread if one doesn't exist.
        """
        if existing_thread_id:
            logger.info(f"Using provided existing thread_id: {existing_thread_id} for project {project_id}")
            # Optional: Verify thread exists in OpenAI API? Could add overhead.
            return existing_thread_id

        supabase = get_supabase_client()
        logger.info(f"Checking database for existing thread_id for project {project_id}")

        try:
            # TODO: Adapt table/column names if different (e.g., canvas_projects table?)
            # Assuming a direct link or a separate chat_sessions table
            response = await asyncio.to_thread(
                supabase.table("chat_sessions") # Or potentially canvas_projects
                .select("openai_thread_id")
                .eq("project_id", project_id)
                .maybe_single() # Expect 0 or 1 result
                .execute
            )

            if response.error:
                raise Exception(f"Supabase error fetching thread ID: {response.error.message}")

            if response.data and response.data.get("openai_thread_id"):
                db_thread_id = response.data["openai_thread_id"]
                logger.info(f"Found existing thread_id in database: {db_thread_id} for project {project_id}")
                return db_thread_id
            else:
                 logger.info(f"No existing thread_id found in database for project {project_id}. Creating new thread.")
                 # Create new thread via OpenAI API
                 thread = await asyncio.to_thread(self.client.beta.threads.create)
                 new_thread_id = thread.id
                 logger.info(f"Created new OpenAI thread with id: {new_thread_id}")

                 # Save the new thread ID to the database
                 # This uses upsert: creates if no record for project_id exists, updates if it does (e.g., if it was null before)
                 # TODO: Adapt table/column names and logic if using a different structure
                 update_response = await asyncio.to_thread(
                     supabase.table("chat_sessions")
                     .upsert({"project_id": project_id, "openai_thread_id": new_thread_id}, on_conflict="project_id")
                     .execute
                 )

                 if update_response.error:
                      # Log error but proceed with the new thread ID anyway for this session
                      logger.error(f"Failed to save new thread_id {new_thread_id} to database for project {project_id}: {update_response.error.message}")
                 else:
                      logger.info(f"Successfully saved new thread_id {new_thread_id} to database for project {project_id}")

                 return new_thread_id

        except Exception as e:
            logger.exception(f"Error getting or creating thread for project {project_id}")
            # Decide on fallback behavior: re-raise, return None, or try creating without saving?
            # Raising for now to make the issue visible.
            raise ConnectionError(f"Could not get or create OpenAI thread for project {project_id}.") from e

    async def process_chat_message(self, project_id: str, thread_id: Optional[str], message_text: str, attachments: list = []) -> Dict[str, Any]:
        """
        Processes an incoming chat message using the OpenAI Assistant API.
        """
        logger.info(f"Processing chat message for project {project_id}, thread {thread_id}: '{message_text}'")

        if not self.assistant_id or self.assistant_id == "YOUR_OPENAI_ASSISTANT_ID":
             raise ValueError("OpenAI Assistant ID is not configured.")

        current_thread_id = await self._get_or_create_thread(project_id, thread_id)

        try:
            # 1. Add the user message to the thread
            logger.info(f"Adding message to thread {current_thread_id}")
            # TODO: Handle attachments correctly when adding message
            message = await asyncio.to_thread(
                self.client.beta.threads.messages.create,
                thread_id=current_thread_id,
                role="user",
                content=message_text,
                # attachments=attachments # Add attachment handling later if needed
            )
            logger.info(f"Message {message.id} added to thread {current_thread_id}")

            # 2. Create a Run
            logger.info(f"Creating run for thread {current_thread_id} with assistant {self.assistant_id}")
            run = await asyncio.to_thread(
                self.client.beta.threads.runs.create,
                thread_id=current_thread_id,
                assistant_id=self.assistant_id,
                # instructions="Override assistant instructions here if needed",
                tools=[ # Define the tools the assistant can use
                    {
                        "type": "function",
                        "function": {
                            "name": "get_project_details",
                            "description": "Get the project title and a list of its scenes (ID and title).",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "project_id": {
                                        "type": "string",
                                        "description": "The ID of the project to fetch details for."
                                    }
                                },
                                "required": ["project_id"]
                            }
                        }
                    },
                    {
                        "type": "function",
                        "function": {
                            "name": "update_scene_script",
                            "description": "Update the script content for a specific scene.",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "scene_id": {
                                        "type": "string",
                                        "description": "The ID of the scene to update."
                                    },
                                    "script_content": {
                                        "type": "string",
                                        "description": "The new script content for the scene."
                                    }
                                },
                                "required": ["scene_id", "script_content"]
                            }
                        }
                    },
                    {
                        "type": "function",
                        "function": {
                            "name": "create_scene",
                            "description": "Create a new scene within a project.",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "project_id": {
                                        "type": "string",
                                        "description": "The ID of the project to add the scene to."
                                    },
                                    "title": {
                                        "type": "string",
                                        "description": "The title for the new scene."
                                    }
                                },
                                "required": ["project_id", "title"]
                            }
                        }
                    },
                    {
                        "type": "function",
                        "function": {
                            "name": "trigger_image_generation",
                            "description": "Starts the process to generate a scene image using a specific prompt and product image.",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "scene_id": {
                                        "type": "string",
                                        "description": "The ID of the scene for which to generate the image."
                                    },
                                    "image_prompt": { # Assuming prompt is passed, could also fetch from scene_id
                                        "type": "string",
                                        "description": "The detailed prompt to use for image generation."
                                    },
                                     # Product image URL will be fetched based on scene_id
                                    "version": {
                                        "type": "string",
                                        "enum": ["v1", "v2"],
                                        "description": "The generation model version to use (v1 or v2)."
                                    }
                                },
                                "required": ["scene_id", "image_prompt", "version"]
                            }
                        }
                    },
                    { # Added comma here
                        "type": "function",
                        "function": {
                            "name": "trigger_video_generation",
                            "description": "Starts the process to generate a scene video using the scene image and description.",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "scene_id": {
                                        "type": "string",
                                        "description": "The ID of the scene for which to generate the video."
                                    }
                                    # Assuming image_url and description are fetched based on scene_id
                                },
                                "required": ["scene_id"]
                            }
                        }
                    }, # Added comma here
                    {
                        "type": "function",
                        "function": {
                            "name": "create_multiple_scenes",
                            "description": "Creates multiple new scenes within a project based on provided script content for each.",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "project_id": {
                                        "type": "string",
                                        "description": "The ID of the project to add the scenes to."
                                    },
                                    "scenes": {
                                        "type": "array",
                                        "description": "A list of scene objects to create.",
                                        "items": {
                                            "type": "object",
                                            "properties": {
                                                "title": {"type": "string", "description": "Title for the scene (e.g., 'Scene 1')"},
                                                "script": {"type": "string", "description": "The script content for this specific scene."},
                                                "scene_order": {"type": "integer", "description": "The order number for this scene."}
                                                # Add other fields like voice_over_text if the agent provides them
                                            },
                                            "required": ["title", "script", "scene_order"]
                                        }
                                    }
                                },
                                "required": ["project_id", "scenes"]
                            }
                        }
                    }
                    # TODO: Add more tools later if needed
                ] # Correctly close tools list
            ) # Correctly close runs.create call
            logger.info(f"Run {run.id} created with status: {run.status}")

            # 3. Poll the Run status and handle actions
            while run.status in ['queued', 'in_progress', 'cancelling', 'requires_action']:
                if run.status == 'requires_action' and run.required_action:
                    logger.info(f"Run {run.id} requires action. Processing tool calls...")
                    tool_outputs = await self._process_tool_calls(run.required_action)

                    logger.info(f"Submitting tool outputs for run {run.id}")
                    try:
                        run = await asyncio.to_thread(
                            self.client.beta.threads.runs.submit_tool_outputs,
                            thread_id=current_thread_id,
                            run_id=run.id,
                            tool_outputs=tool_outputs
                        )
                        logger.info(f"Tool outputs submitted for run {run.id}. New status: {run.status}")
                        # Immediately continue to the next polling iteration
                        await asyncio.sleep(0.5) # Short sleep before re-polling after submission
                    except Exception as tool_submission_error:
                         logger.exception(f"Error submitting tool outputs for run {run.id}")
                         # Decide how to handle this - fail the run?
                         run = await asyncio.to_thread(self.client.beta.threads.runs.cancel, thread_id=current_thread_id, run_id=run.id)
                         raise RuntimeError(f"Failed to submit tool outputs: {tool_submission_error}") from tool_submission_error
                else:
                    # If not requires_action, wait before polling again
                    await asyncio.sleep(1)

                # Re-retrieve the run status
                run = await asyncio.to_thread(self.client.beta.threads.runs.retrieve, thread_id=current_thread_id, run_id=run.id)
                logger.info(f"Run {run.id} status: {run.status}")

            # 4. Handle final Run status after the loop exits
            if run.status == 'completed':
                logger.info(f"Run {run.id} completed. Fetching messages...")
                messages_response = await asyncio.to_thread(
                    self.client.beta.threads.messages.list,
                    thread_id=current_thread_id,
                    order="desc", # Get the latest messages first
                    limit=10 # Limit to recent messages
                )

                # Find the latest assistant message(s) in this run
                assistant_messages = [
                    msg for msg in messages_response.data
                    if msg.role == 'assistant' and msg.run_id == run.id
                ]

                if not assistant_messages:
                     logger.error(f"Run {run.id} completed but no assistant messages found.")
                     # It's possible a run completes without a message (e.g., only tool calls)
                     # Return an empty content string or handle as appropriate
                     return {
                         "thread_id": current_thread_id,
                         "content": "", # Or a system message like "Task completed."
                         "run_id": run.id,
                         "status": run.status
                     }


                # Combine content from potentially multiple assistant messages in the same run
                # Taking the first one for simplicity now
                latest_assistant_message = assistant_messages[0]
                response_content = ""
                if latest_assistant_message.content:
                    for content_block in latest_assistant_message.content:
                        if content_block.type == 'text':
                            response_content += content_block.text.value + "\n"

                logger.info(f"Assistant response retrieved for run {run.id}")
                return {
                    "thread_id": current_thread_id,
                    "content": response_content.strip(),
                    "run_id": run.id,
                    "status": run.status
                }
            # Handle other terminal states
            elif run.status in ['failed', 'cancelled', 'expired']:
                 logger.error(f"Run {run.id} ended with status: {run.status}")
                 # Include error details if available
                 error_message = f"Assistant run ended with status: {run.status}"
                 if run.last_error:
                     error_message += f". Error: {run.last_error.message} (Code: {run.last_error.code})"
                 raise RuntimeError(error_message)
            else: # Should not happen if loop condition is correct, but handle defensively
                 logger.error(f"Run {run.id} ended with unexpected status: {run.status}")
                 raise RuntimeError(f"Assistant run ended unexpectedly: {run.status}")

        except Exception as e:
            logger.exception(f"Error processing chat message in thread {current_thread_id}")
            raise # Re-raise the exception to be handled by the API endpoint

    async def _process_tool_calls(self, required_action) -> List[ToolOutput]:
        """Processes required tool calls and returns their outputs."""
        tool_outputs: List[ToolOutput] = []

        for tool_call in required_action.submit_tool_outputs.tool_calls:
            function_name = tool_call.function.name
            arguments = json.loads(tool_call.function.arguments)
            tool_call_id = tool_call.id

            logger.info(f"Executing tool call: {function_name}({arguments}) ID: {tool_call_id}")

            output = None
            try:
                # --- Map function names to actual backend functions ---
                if function_name == "get_project_details":
                    output = await self._tool_get_project_details(**arguments)
                elif function_name == "update_scene_script":
                    output = await self._tool_update_scene_script(**arguments)
                elif function_name == "create_scene":
                    output = await self._tool_create_scene(**arguments)
                elif function_name == "trigger_image_generation":
                    output = await self._tool_trigger_image_generation(**arguments)
                elif function_name == "trigger_video_generation":
                    output = await self._tool_trigger_video_generation(**arguments)
                elif function_name == "create_multiple_scenes":
                    output = await self._tool_create_multiple_scenes(**arguments)
                # TODO: Add mappings for other tools
                else:
                    logger.warning(f"Unknown tool function called: {function_name}")
                    output = json.dumps({"error": f"Unknown tool function: {function_name}"})

            except Exception as e:
                logger.exception(f"Error executing tool call {function_name} with ID {tool_call_id}")
                output = json.dumps({"error": f"Error executing tool {function_name}: {str(e)}"})

            tool_outputs.append(ToolOutput(tool_call_id=tool_call_id, output=output))

        return tool_outputs

    # --- Placeholder Tool Implementations ---
    # Replace these with actual logic interacting with Supabase or other services

    async def _tool_get_project_details(self, project_id: str) -> str:
        """Tool implementation: Fetches project title and scene list from Supabase."""
        logger.info(f"Tool: get_project_details called for project_id: {project_id}")
        try:
            supabase = get_supabase_client()
            # Fetch project title and associated scenes (id and title only)
            project_response = await asyncio.to_thread(
                supabase.table("canvas_projects")
                .select("id, title, canvas_scenes(id, title, scene_order)")
                .eq("id", project_id)
                .single()
                .execute
            )

            if project_response.error:
                raise Exception(f"Supabase error fetching project: {project_response.error.message}")

            if not project_response.data:
                 return json.dumps({"error": f"Project with ID {project_id} not found."})

            project_data = project_response.data
            # Sort scenes by order
            scenes = sorted(project_data.get("canvas_scenes", []), key=lambda s: s.get("scene_order", 0))

            result = {
                "project_id": project_data.get("id"),
                "title": project_data.get("title"),
                "scenes": [{"id": s.get("id"), "title": s.get("title")} for s in scenes]
            }
            return json.dumps(result)

        except Exception as e:
            logger.exception(f"Error in _tool_get_project_details for project {project_id}")
            return json.dumps({"error": f"Failed to get project details: {str(e)}"})

    async def _tool_update_scene_script(self, scene_id: str, script_content: str) -> str:
        """Tool implementation: Updates the script for a given scene in Supabase."""
        logger.info(f"Tool: update_scene_script called for scene_id: {scene_id}")
        try:
            supabase = get_supabase_client()
            response = await asyncio.to_thread(
                supabase.table("canvas_scenes")
                .update({"script": script_content, "updated_at": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())})
                .eq("id", scene_id)
                .execute
            )

            # Check if the update was successful (e.g., data is not empty or error is None)
            # Note: Supabase update response might not return data by default unless specified with select()
            if response.error:
                 raise Exception(f"Supabase error updating scene script: {response.error.message}")

            # You might want to check response.count or similar if available and relevant
            # For simplicity, we assume success if no error is thrown

            logger.info(f"Successfully updated script for scene {scene_id}")
            return json.dumps({"success": True, "scene_id": scene_id, "message": "Scene script updated successfully."})

        except Exception as e:
            logger.exception(f"Error in _tool_update_scene_script for scene {scene_id}")
            return json.dumps({"success": False, "error": f"Failed to update scene script: {str(e)}"})

    async def _tool_create_scene(self, project_id: str, title: str) -> str:
        """Tool implementation: Creates a new scene for a project in Supabase."""
        logger.info(f"Tool: create_scene called for project_id: {project_id} with title: {title}")
        try:
            supabase = get_supabase_client()

            # 1. Get the current max scene_order for the project
            order_response = await asyncio.to_thread(
                supabase.table("canvas_scenes")
                .select("scene_order")
                .eq("project_id", project_id)
                .order("scene_order", desc=True)
                .limit(1)
                .execute
            )

            if order_response.error:
                raise Exception(f"Supabase error fetching scene order: {order_response.error.message}")

            next_order = 1
            if order_response.data:
                next_order = (order_response.data[0].get("scene_order") or 0) + 1

            # 2. Insert the new scene
            insert_response = await asyncio.to_thread(
                supabase.table("canvas_scenes")
                .insert({
                    "project_id": project_id,
                    "title": title,
                    "scene_order": next_order,
                    # Add default empty values for other fields if needed by schema
                    "script": "",
                    "description": "",
                    "voice_over_text": "",
                    "image_prompt": "",
                })
                .select("id") # Select the ID of the newly created scene
                .single() # Expecting only one row back
                .execute
            )

            if insert_response.error:
                 raise Exception(f"Supabase error creating scene: {insert_response.error.message}")

            if not insert_response.data or not insert_response.data.get("id"):
                 raise Exception("Failed to create scene or retrieve its ID.")

            new_scene_id = insert_response.data["id"]
            logger.info(f"Successfully created scene {new_scene_id} for project {project_id}")
            # Return success and the new scene ID and title
            return json.dumps({"success": True, "project_id": project_id, "new_scene_id": new_scene_id, "title": title})

        except Exception as e:
            logger.exception(f"Error in _tool_create_scene for project {project_id}")
            return json.dumps({"success": False, "error": f"Failed to create scene: {str(e)}"})

    async def _tool_trigger_image_generation(self, scene_id: str, image_prompt: str, version: str) -> str: # Removed product_image_url from signature
        """Tool implementation: Creates an image generation job entry in Supabase."""
        logger.info(f"Tool: trigger_image_generation called for scene_id: {scene_id}, version: {version}")
        try:
            supabase = get_supabase_client()

            # 1. Fetch the product_image_url from the scene
            scene_response = await asyncio.to_thread(
                supabase.table("canvas_scenes")
                .select("product_image_url")
                .eq("id", scene_id)
                .single()
                .execute
            )

            if scene_response.error:
                raise Exception(f"Supabase error fetching scene data: {scene_response.error.message}")
            if not scene_response.data:
                return json.dumps({"success": False, "error": f"Scene with ID {scene_id} not found."})

            product_image_url = scene_response.data.get("product_image_url")
            if not product_image_url:
                 return json.dumps({"success": False, "error": f"Product image URL not found for scene {scene_id}."})

            logger.info(f"Found product_image_url: {product_image_url} for scene {scene_id}")

            # TODO: Get user_id if needed for the table RLS

            # Insert a job into the image_generation_jobs table
            # Adjust table/column names as per your actual schema
            response = await asyncio.to_thread(
                supabase.table("agent_image_generation_jobs")
                .insert({
                    "scene_id": scene_id,
                    "prompt": image_prompt,
                    "product_image_url": product_image_url, # Use fetched URL
                    "version": version, # Assuming this column exists
                    "status": "pending", # Or "in_queue"
                    # "user_id": user_id # Add if required
                })
                .select("id") # Get the ID of the new job
                .single()
                .execute
            )

            if response.error:
                raise Exception(f"Supabase error creating image generation job: {response.error.message}")

            if not response.data or not response.data.get("id"):
                 raise Exception("Failed to create image generation job or retrieve its ID.")

            job_id = response.data["id"]
            logger.info(f"Successfully created image generation job {job_id} for scene {scene_id}")
            # Return confirmation to the assistant
            return json.dumps({
                "success": True,
                "job_id": job_id,
                "message": f"Image generation ({version}) started for scene {scene_id}. Job ID: {job_id}. The result will be available later."
            })

        except Exception as e:
            logger.exception(f"Error in _tool_trigger_image_generation for scene {scene_id}")
            return json.dumps({"success": False, "error": f"Failed to trigger image generation: {str(e)}"})

    async def _tool_trigger_video_generation(self, scene_id: str) -> str:
        """
        Tool implementation: Fetches scene data, submits a job to fal.ai video queue,
        and updates the video_generation_jobs table.
        """
        logger.info(f"Tool: trigger_video_generation called for scene_id: {scene_id}")
        supabase = get_supabase_client()
        fal_request_id = None # Initialize fal_request_id
        db_job_id = None # Initialize db_job_id

        try:
            # 1. Fetch necessary inputs (image_url, description) from the scene
            logger.debug(f"Fetching scene data for scene_id: {scene_id}")
            scene_response = await asyncio.to_thread(
                supabase.table("canvas_scenes")
                .select("image_url, description") # Fetch required fields
                .eq("id", scene_id)
                .single()
                .execute
            )

            if scene_response.error:
                raise Exception(f"Supabase error fetching scene data: {scene_response.error.message}")
            if not scene_response.data:
                return json.dumps({"success": False, "error": f"Scene with ID {scene_id} not found."})

            image_url = scene_response.data.get("image_url")
            # Use scene description as the prompt for the video API
            prompt = scene_response.data.get("description")

            if not image_url:
                 return json.dumps({"success": False, "error": f"Scene image URL not found for scene {scene_id}. Cannot generate video."})
            if not prompt:
                 logger.warning(f"Scene description (used as prompt) is empty for scene {scene_id}.")
                 # Proceed anyway, but log warning. API might handle empty prompt.

            # 2. Submit job to fal.ai queue
            # NOTE: Requires fal_client setup similar to OpenAI client, using FAL_KEY
            # For now, we simulate the submission and response structure.
            # Replace with actual fal.queue.submit call when fal client is integrated.
            logger.info(f"Submitting video generation job to fal.ai for scene {scene_id}")

            # --- Placeholder for fal.ai submission ---
            # try:
            #    fal_response = await fal.queue.submit(
            #        "fal-ai/kling-video/v1.6/standard/image-to-video",
            #        input={
            #            "image_url": image_url,
            #            "prompt": prompt or "", # Pass empty string if description is None
            #            # Add other parameters like duration, aspect_ratio if needed
            #        }
            #        # webhookUrl="YOUR_SUPABASE_FUNCTION_URL_FOR_RESULTS" # Optional but recommended
            #    )
            #    fal_request_id = fal_response.get("request_id")
            #    if not fal_request_id:
            #        raise Exception("fal.ai submission did not return a request_id")
            #    logger.info(f"fal.ai video job submitted. Request ID: {fal_request_id}")
            # except Exception as fal_error:
            #    logger.exception("Error submitting job to fal.ai")
            #    raise Exception(f"Failed to submit job to fal.ai: {fal_error}") from fal_error
            # --- End Placeholder ---

            # Simulate successful submission for now
            fal_request_id = f"sim_fal_video_{int(time.time())}"
            logger.info(f"Simulated fal.ai video job submission. Request ID: {fal_request_id}")


            # 3. Create/Update job entry in 'video_generation_jobs' table
            logger.debug(f"Upserting video generation job for scene {scene_id}")
            # Use upsert to handle potential retries or existing placeholder rows
            job_response = await asyncio.to_thread(
                supabase.table("agent_video_generation_jobs") # Target the agent video jobs table
                .upsert({
                    "scene_id": scene_id,
                    "image_url": image_url,
                    "description": prompt, # Store the prompt used
                    "status": "queued", # Set status to queued (or processing if fal starts immediately)
                    "fal_request_id": fal_request_id, # Store the fal.ai request ID
                    # Add user_id if necessary for RLS
                }, on_conflict="scene_id") # Assuming scene_id should be unique or use a different conflict target
                .select("id") # Get the ID of the job row
                .single()
                .execute
            )

            if job_response.error:
                raise Exception(f"Supabase error saving video generation job: {job_response.error.message}")

            if not job_response.data or not job_response.data.get("id"):
                 raise Exception("Failed to save video generation job or retrieve its ID.")

            db_job_id = job_response.data["id"]
            logger.info(f"Successfully saved video generation job {db_job_id} (fal ID: {fal_request_id}) for scene {scene_id}")

            # Return success message to the Assistant
            return json.dumps({
                "success": True,
                "job_id": db_job_id,
                "fal_request_id": fal_request_id,
                "message": f"Video generation submitted for scene {scene_id}. Job ID: {db_job_id}. The result will be available later."
            })

        except Exception as e:
            logger.exception(f"Error in _tool_trigger_video_generation for scene {scene_id}")
            # Attempt to update DB job status to failed if we have an ID
            if db_job_id:
                 try:
                      await asyncio.to_thread(
                           supabase.table("agent_video_generation_jobs")
                           .update({"status": "failed", "error_message": str(e)})
                           .eq("id", db_job_id)
                           .execute
                      )
                 except Exception as update_err:
                      logger.error(f"Failed to update video job status to failed after error: {update_err}")
            return json.dumps({"success": False, "error": f"Failed to trigger video generation: {str(e)}"})

    async def _tool_create_multiple_scenes(self, project_id: str, scenes: List[Dict[str, Any]]) -> str:
        """Tool implementation: Creates multiple scenes for a project in Supabase."""
        logger.info(f"Tool: create_multiple_scenes called for project_id: {project_id} with {len(scenes)} scenes.")

        if not scenes:
             return json.dumps({"success": False, "error": "No scene data provided."})

        supabase = get_supabase_client()
        created_scene_ids = []
        errors = []

        try:
            # Prepare data for batch insert
            scenes_to_insert = []
            for scene_data in scenes:
                 # Validate required fields (basic check)
                 if not all(k in scene_data for k in ["title", "script", "scene_order"]):
                      errors.append(f"Missing required fields in scene data: {scene_data.get('title', 'N/A')}")
                      continue

                 scenes_to_insert.append({
                    "project_id": project_id,
                    "title": scene_data["title"],
                    "script": scene_data["script"],
                    "scene_order": scene_data["scene_order"],
                    # Add defaults or optional fields provided by agent
                    "description": scene_data.get("description", ""),
                    "voice_over_text": scene_data.get("voice_over_text", scene_data["script"]), # Default voiceover to script?
                    "image_prompt": scene_data.get("image_prompt", ""),
                 })

            if not scenes_to_insert:
                 raise ValueError(f"No valid scenes to insert. Errors: {'; '.join(errors)}")

            # Perform batch insert
            insert_response = await asyncio.to_thread(
                supabase.table("canvas_scenes")
                .insert(scenes_to_insert)
                .select("id, title") # Select IDs and titles of newly created scenes
                .execute
            )

            if insert_response.error:
                raise Exception(f"Supabase error creating multiple scenes: {insert_response.error.message}")

            if not insert_response.data:
                 raise Exception("Failed to create multiple scenes or retrieve their IDs.")

            created_scene_ids = [{"id": s["id"], "title": s["title"]} for s in insert_response.data]
            logger.info(f"Successfully created {len(created_scene_ids)} scenes for project {project_id}")

            return json.dumps({
                "success": True,
                "project_id": project_id,
                "created_scenes": created_scene_ids,
                "message": f"Successfully created {len(created_scene_ids)} scenes."
            })

        except Exception as e:
            logger.exception(f"Error in _tool_create_multiple_scenes for project {project_id}")
            # Include partial success info if available
            return json.dumps({
                 "success": False,
                 "error": f"Failed to create multiple scenes: {str(e)}",
                 "created_scenes": created_scene_ids # Return IDs of any scenes that might have been created before error
            })

    async def handle_canvas_update_notification(self, scene_id: str, field: str, value: Any):
        """
        Handles notifications about updates made in the Canvas by adding a system message
        to the relevant chat thread.
        """
        logger.info(f"Handling canvas update notification for scene {scene_id}: Field={field}")

        try:
            supabase = get_supabase_client()

            # 1. Find the project_id for the given scene_id
            scene_response = await asyncio.to_thread(
                supabase.table("canvas_scenes")
                .select("project_id")
                .eq("id", scene_id)
                .single()
                .execute
            )

            if scene_response.error or not scene_response.data:
                 logger.error(f"Could not find project for scene {scene_id} to send notification: {scene_response.error}")
                 return # Cannot proceed without project_id

            project_id = scene_response.data["project_id"]

            # 2. Find the openai_thread_id for the project
            thread_response = await asyncio.to_thread(
                 supabase.table("chat_sessions")
                .select("openai_thread_id")
                .eq("project_id", project_id)
                .maybe_single()
                .execute
            )

            if thread_response.error or not thread_response.data or not thread_response.data.get("openai_thread_id"):
                 logger.warning(f"Could not find chat thread for project {project_id} to send notification. Update happened, but user won't be notified in chat.")
                 return # No thread to notify

            thread_id = thread_response.data["openai_thread_id"]

            # 3. Add a system message to the thread
            # Consider making the message content more informative or user-friendly
            # Truncate value if it's too long
            value_str = str(value)
            if len(value_str) > 100:
                value_str = value_str[:100] + "..."

            notification_content = f"System: User updated '{field}' for scene {scene_id} in the Canvas."
            # Optionally add the value: f" New value starts with: '{value_str}'"

            logger.info(f"Adding notification message to thread {thread_id}: {notification_content}")

            await asyncio.to_thread(
                self.client.beta.threads.messages.create,
                thread_id=thread_id,
                role="system", # Use 'system' role for automated notifications
                content=notification_content
            )
            logger.info(f"Successfully added notification message to thread {thread_id}")

        except Exception as e:
            logger.exception(f"Error handling canvas update notification for scene {scene_id}: {e}")
            # Decide if this error should propagate or just be logged

# Single instance (optional, depending on how you structure dependencies)
agent_service = AgentService()

# Example usage (optional, for testing):
if __name__ == "__main__":
    import asyncio
    # Removed duplicate import

    async def test():
        service = AgentService()
        # Add more comprehensive tests if needed
        # response = await service.process_chat_message("proj_123", None, "Create a scene titled 'Intro'")
        # print("Chat Response:", response)
        # if response.get("new_scene_id"):
        #    await service.handle_canvas_update_notification(response["new_scene_id"], "script", "Updated script from test")
        print("Agent Service test setup complete.")


    asyncio.run(test())

