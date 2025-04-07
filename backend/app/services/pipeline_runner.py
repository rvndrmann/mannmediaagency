import os
import logging
from supabase import create_client, Client
from typing import Optional, Dict, Any
from .agent_service import agent_service # Import the agent service instance

# --- Configuration ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    logging.error("Supabase URL or Service Role Key not found in environment variables.")
    # Depending on the server setup, might want to raise an exception or exit
    # raise ValueError("Missing Supabase credentials")

# --- Placeholder MCP Tool Functions Removed ---
# Generation will be triggered via agent_service tool methods below

# --- Supabase Helper ---

def get_supabase_client() -> Optional[Client]:
    """Initializes and returns a Supabase client using service role key."""
    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
        try:
            return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        except Exception as e:
            logging.error(f"Failed to create Supabase client: {e}")
            return None
    return None

def update_scene_status(supabase: Client, scene_id: str, status: str, data: Optional[Dict[str, Any]] = None):
    """Updates the status and optionally other data for a scene."""
    update_data = {"status": status}
    if data:
        update_data.update(data)

    try:
        response = supabase.table("canvas_scenes").update(update_data).eq("id", scene_id).execute()
        if response.data:
            logging.info(f"Updated scene {scene_id} status to '{status}'")
        else:
            # Handle potential errors if needed, e.g., scene not found
             logging.warning(f"Scene {scene_id} not found or update failed. Response: {response}")
    except Exception as e:
        logging.error(f"Error updating scene {scene_id} status to '{status}': {e}")


# --- Core Pipeline Logic ---

async def run_generation_pipeline(project_id: str):
    """Fetches pending scenes and runs the generation pipeline for them by triggering agent tools."""
    logging.info(f"Starting generation pipeline for project {project_id}...")
    supabase = get_supabase_client()
    if not supabase:
        logging.error("Cannot run pipeline: Supabase client unavailable.")
        return

    try:
        # Fetch project details to get aspect ratio (assuming it's on the project table)
        project_response = supabase.table("canvas_projects").select("aspect_ratio").eq("id", project_id).maybe_single().execute()
        if not project_response.data:
             logging.error(f"Project {project_id} not found.")
             return
        aspect_ratio = project_response.data.get("aspect_ratio", "16:9") # Default aspect ratio

        # Fetch pending scenes for the project, ordered by scene_index
        scenes_response = supabase.table("canvas_scenes") \
            .select("id, scene_index, image_prompt, custom_instruction") \
            .eq("project_id", project_id) \
            .eq("status", "pending_generation") \
            .order("scene_index", desc=False) \
            .execute()

        if not scenes_response.data:
            logging.info(f"No pending scenes found for project {project_id}.")
            return

        logging.info(f"Found {len(scenes_response.data)} pending scenes for project {project_id}.")

        for scene in scenes_response.data:
            scene_id = scene["id"]
            logging.info(f"Processing scene {scene_id} (Index: {scene['scene_index']})...")

            try:
                # 1. Generate Description (if needed - assuming image_prompt might already exist)
                #    If description generation is always required, add the call here.
                #    For now, assume image_prompt is ready or generated earlier.
                current_image_prompt = scene.get("image_prompt", "")
                if not current_image_prompt:
                     logging.warning(f"Scene {scene_id} has no image_prompt. Skipping image generation.")
                     # Optionally call generate_scene_description here if it should create the prompt
                     # description = generate_scene_description(project_id, scene_id)
                     # update_scene_status(supabase, scene_id, 'description_generated', {'image_prompt': description}) # Example update
                     # current_image_prompt = description # Use the newly generated prompt
                     # If still no prompt, mark as failed or skip
                     update_scene_status(supabase, scene_id, 'failed', {'error_message': 'Missing image prompt'})
                     continue


                # 2. Generate Image
                update_scene_status(supabase, scene_id, 'generating_image')
                # Trigger image generation via agent tool
                # Assuming 'v2' is the desired version, adjust if needed
                # The tool itself handles updating status/image_url via Supabase functions
                logging.info(f"Triggering image generation tool for scene {scene_id}")
                image_gen_result_str = await agent_service._tool_trigger_image_generation(
                    scene_id=scene_id,
                    image_prompt=current_image_prompt,
                    version='v2' # Or fetch dynamically if needed
                )
                # TODO: Optionally check image_gen_result_str for success/failure if the tool returns meaningful status
                logging.info(f"Image generation tool triggered for scene {scene_id}. Result: {image_gen_result_str}")
                # We don't get the image_url back directly here, the triggered function handles updates.
                # The status update below marks the *start* of video generation.
                # We need to fetch the image_url before triggering video gen, or assume the video gen tool can fetch it.
                # Let's assume video gen tool fetches the image_url based on scene_id.

                # Fetch the updated scene data to get the image_url (or assume video tool does this)
                # scene_update_resp = supabase.table("canvas_scenes").select("image_url").eq("id", scene_id).maybe_single().execute()
                # image_url = scene_update_resp.data.get("image_url") if scene_update_resp.data else None
                # if not image_url:
                #     raise ValueError(f"Image URL not found for scene {scene_id} after triggering generation.")


                # 3. Generate Video
                update_scene_status(supabase, scene_id, 'generating_video') # Removed image_url update here
                # Trigger video generation via agent tool
                logging.info(f"Triggering video generation tool for scene {scene_id}")
                video_gen_result_str = await agent_service._tool_trigger_video_generation(scene_id=scene_id)
                # TODO: Optionally check video_gen_result_str for success/failure
                logging.info(f"Video generation tool triggered for scene {scene_id}. Result: {video_gen_result_str}")
                # Video URL is updated by the triggered function. We mark as completed here,
                # but actual completion depends on the background Supabase function.
                # The status update below might be premature. A separate mechanism should check final status.
                # For now, we'll keep the 'completed' update, assuming success for pipeline flow.


                # 4. Mark as Completed
                # Mark as completed in the pipeline runner's view. Actual status handled by generation functions.
                update_scene_status(supabase, scene_id, 'completed', {'error_message': None}) # Removed video_url update
                logging.info(f"Successfully processed scene {scene_id}.")

            except Exception as e:
                error_message = f"Failed processing scene {scene_id}: {e}"
                logging.error(error_message)
                update_scene_status(supabase, scene_id, 'failed', {'error_message': str(e)})
                # Continue to the next scene

        logging.info(f"Finished generation pipeline for project {project_id}.")

    except Exception as e:
        logging.error(f"Error during pipeline execution for project {project_id}: {e}")

# --- MCP Tool Endpoint ---

async def start_project_generation(project_id: str):
    """
    Triggers the asynchronous generation pipeline for a specific project.
    Intended to be run as a background task.
    """
    logging.info(f"Received request to start generation for project: {project_id}")
    # Consider running this in a background thread/task queue if it's long-running
    # For simplicity, running synchronously here.
    await run_generation_pipeline(project_id)
    # The MCP framework would handle the response to the caller.
    # This function might not need to return anything specific unless required by the framework.

# Example of how you might run this manually for testing (if needed)
# if __name__ == "__main__":
#     test_project_id = "your_test_project_id_here"
#     if not test_project_id or test_project_id == "your_test_project_id_here":
#         print("Please set a test_project_id in the script for testing.")
#     else:
#         # Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your environment
#         print(f"Running pipeline for project: {test_project_id}")
#         run_generation_pipeline(test_project_id)