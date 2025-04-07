# Multi-Agent Chat Automation Plan

This document outlines the plan to automate the video generation workflow starting from script approval in the Multi-Agent Chat interface.

## Goal

To automate the process of:
1.  Detecting script approval within the Multi-Agent Chat.
2.  Dividing the approved script into scenes.
3.  Creating corresponding scene records in the Supabase database.
4.  Triggering the generation pipeline (description, image, video) for all new scenes.
5.  Reporting the results (generated assets) back to the Multi-Agent Chat via real-time updates.

This automation focuses on the initial bulk generation, while allowing for manual revisions of individual scenes later through existing or enhanced UI/chat commands.

## Current State Analysis

-   **Chat:** `MultiAgentChat` handles user interaction.
-   **Scene Division:** `supabase/functions/divide-script/index.ts` uses AI to break down a script and suggest initial prompts but doesn't save to DB.
-   **Individual Generation:** `useCanvasAgentMCP` hook triggers MCP tools (`generate_scene_script`, `generate_scene_description`, `generate_scene_image`, `generate_scene_video`) for one scene at a time.
-   **Data Update:** Generation results are saved back to the scene record via the `updateScene` function prop.

## Missing Pieces

1.  **Script Approval Trigger:** A defined mechanism in the chat UI.
2.  **Orchestration Logic:** A central process to manage the flow from script approval to triggering the generation pipeline.
3.  **Result Aggregation & Delivery:** A robust way to notify the chat when final assets are ready.

## Proposed Plan

1.  **Define Script Approval Trigger:**
    *   Implement a method in `MultiAgentChat.tsx` for the user to signal script approval (e.g., a command like `/approve script` or a dedicated button).
    *   This trigger will initiate a call to the Orchestrator function.

2.  **Create Orchestrator (Supabase Edge Function):**
    *   Develop logic within `supabase/functions/request-router-orchestrator/index.ts`.
    *   **Input:** `projectId`, full `script` text.
    *   **Actions:**
        *   Call the `divide-script` function internally.
        *   Connect to Supabase DB.
        *   Iterate through the scenes returned by `divide-script`.
        *   For each scene: `INSERT` a new record into `canvas_scenes` (linking to `projectId`, saving `scene_script`, `image_prompt`, setting `status` to `'pending_generation'`).
        *   Trigger the generation pipeline runner (likely via an MCP tool, e.g., `start_project_generation(projectId)`).

3.  **Implement Generation Pipeline Runner (MCP Server):**
    *   Add logic to the MCP server (triggered by `start_project_generation` or DB monitoring).
    *   **Actions:**
        *   Fetch scenes for the `projectId` with status `'pending_generation'`.
        *   For each scene, execute the generation sequence, updating the scene status in Supabase DB after each step:
            *   Call MCP tool `generate_scene_description` -> status: `'generating_image_prompt'`
            *   Invoke Supabase Edge Function `generate-image-prompt` (passing script, voiceover, etc.) -> Update `image_prompt` in DB, status: `'generating_image'`
            *   Call MCP tool `generate_scene_image` (using updated prompt) -> Update `image_url` in DB, status: `'generating_video'`
            *   Call MCP tool `generate_scene_video` -> Update `video_url` in DB, status: `'completed'`
        *   Handle errors gracefully (e.g., set status to `'failed'`).

4.  **Enhance Chat for Realtime Results:**
    *   Modify the frontend (`MultiAgentChat.tsx` or related hooks) to use Supabase Realtime.
    *   Listen for `UPDATE` events on the `canvas_scenes` table for the current `projectId`.
    *   When a scene's `status` changes (especially to `'completed'` or `'failed'`), add a system message to the chat displaying the result (e.g., image/video URL or error message).
    *   Consider adding a summary message when all scenes are processed.

## Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant ChatUI (MultiAgentChat)
    participant Orchestrator (Edge Function: request-router-orchestrator)
    participant Divider (Edge Function: divide-script)
    participant ImgPromptFn (Edge Function: generate-image-prompt)
    participant SupabaseDB
    participant PipelineRunner (MCP Server)
    participant MCPTools (on MCP Server)
    participant FAL (External Service)

    User->>ChatUI: Provides script & approves (e.g., "/approve script")
    ChatUI->>Orchestrator: Call with projectId, script
    Orchestrator->>Divider: Call with script
    Divider-->>Orchestrator: Return structured scenes (JSON)
    loop For each scene in JSON
        Orchestrator->>SupabaseDB: INSERT canvas_scenes record (status='pending_generation')
    end
    Orchestrator->>PipelineRunner: Trigger via MCP tool (e.g., start_project_generation(projectId))
    Orchestrator-->>ChatUI: Acknowledge request (optional)

    PipelineRunner->>SupabaseDB: Query for scenes (projectId, status='pending_generation')
    loop For each pending scene
        PipelineRunner->>MCPTools: Call generate_scene_description
        PipelineRunner->>SupabaseDB: UPDATE scene (description, status='generating_image_prompt')
 
        PipelineRunner->>SupabaseDB: Fetch scene data (script, voiceover, etc.)
        PipelineRunner->>ImgPromptFn: Invoke generate-image-prompt (body: {sceneScript, ...})
        ImgPromptFn-->>PipelineRunner: Return { imagePrompt: "..." }
        PipelineRunner->>SupabaseDB: UPDATE scene (image_prompt, status='generating_image')
 
        PipelineRunner->>MCPTools: Call generate_scene_image (using updated prompt)
        MCPTools->>FAL: Request image generation
        FAL-->>MCPTools: Return image URL
        MCPTools-->>PipelineRunner: Return image URL
        PipelineRunner->>SupabaseDB: UPDATE scene (image_url, status='generating_video')

        PipelineRunner->>MCPTools: Call generate_scene_video
        MCPTools->>FAL: Request video generation
        FAL-->>MCPTools: Return video URL
        MCPTools-->>PipelineRunner: Return video URL
        PipelineRunner->>SupabaseDB: UPDATE scene (video_url, status='completed')
    end

    Note over ChatUI, SupabaseDB: ChatUI listens for 'completed' scenes via Realtime

    SupabaseDB-->>ChatUI: Realtime notification (scene completed)
    ChatUI->>User: Display generated assets (image/video URLs)
```

## Next Steps

-   Review and confirm this plan.
-   Proceed with implementation by switching to "Code" mode.