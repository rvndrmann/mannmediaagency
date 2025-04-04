# Implementation Plan: Multi-Agent Chat with Backend Automation (Chat-Centric)

## I. Core Idea

The Multi-Agent Chat is the primary interface. Users interact mainly with agents via chat messages. Agents understand requests, extract necessary information (text, media uploads via chat), trigger backend processes, and deliver results (including image/video previews) directly back into the chat conversation. The Canvas visually reflects the project's state, synchronized with the data updated through the chat/backend flow.

## II. Architecture

*   **Frontend:**
    *   **Multi-Agent Chat (`src/pages/MultiAgentChat.tsx`, `src/hooks/use-multi-agent-chat.tsx`):** Main interaction point. Needs enhancements for:
        *   Media uploads (product image).
        *   Rendering results (images, video previews) within chat messages.
        *   Potential interactive elements in messages.
    *   **Canvas (`src/components/canvas/*`):** Visual representation of scenes/content. Listens for Supabase data changes and updates automatically. Allows direct editing (e.g., prompts), which notifies the backend agent logic.
*   **Backend:**
    *   **Agent Logic:** Processes chat messages (NLP), extracts data, delegates tasks, formats results for chat. Receives notifications from Canvas edits.
    *   **Task Workers:** Monitors Supabase job queues (e.g., `image_generation_jobs`) and executes underlying logic (image generation v1/v2, etc.).
    *   **APIs:** Internal (Chat UI <-> Agent Logic), External (OpenAI, I2V at `http://localhost:8080/image-to-video`, T2A - future).
*   **Data Storage:**
    *   **Supabase:** Central repository for project/scene data (scripts, prompts, media URLs, descriptions) and task statuses. Keeps Chat and Canvas in sync.

## III. Workflow & Implementation Steps

1.  **Project Initiation (Chat):**
    *   User starts chat, provides script, uploads Product Image via chat attachment.
    *   Agent detects input, confirms, creates project/scene records in Supabase (stores image URL).
    *   Agent confirms project creation in chat.

2.  **Script Division & Scene Creation (Chat & Agent):**
    *   User asks agent to divide script.
    *   Agent processes script, creates scene records in Supabase.
    *   Agent confirms scene creation in chat. Canvas updates automatically.

3.  **Voiceover Text Extraction (Chat & Agent):**
    *   User asks agent to extract voiceover for a specific scene.
    *   Agent extracts text (GPT), updates Supabase.
    *   Agent replies with extracted text in chat.

4.  **Image Prompt Generation (Chat & Agent):**
    *   User asks agent to generate prompt for a scene.
    *   Agent generates prompt (AI assistant), updates Supabase.
    *   Agent replies with generated prompt in chat.

5.  **Scene Image Generation (Chat, Agent & Backend Worker):**
    *   User asks agent to generate image (v1/v2) for a scene.
    *   Agent confirms, creates job in `image_generation_jobs` (Supabase) with prompt, product image URL, scene ID, version.
    *   Agent confirms job start in chat.
    *   Backend Worker processes job from Supabase queue, generates image, updates job `result_url`.
    *   Agent Logic detects completion, sends **new chat message** with the generated image embedded. Updates scene record in Supabase.

6.  **Scene Description Generation (Chat & Agent):**
    *   User asks agent to describe the generated image for a scene.
    *   Agent uses image URL (Vision model), updates Supabase.
    *   Agent replies with description in chat.

7.  **Video Creation (Chat, Agent & API):**
    *   User asks agent to create video for a scene.
    *   Agent retrieves image URL/description, calls Image-to-Video API (`http://localhost:8080/image-to-video`).
    *   Agent confirms start in chat.
    *   On completion, Agent sends **new chat message** with video player/link embedded. Updates scene record in Supabase.

8.  **Voiceover Generation (Future - Chat, Agent & API):**
    *   Similar chat-driven flow, resulting in an audio player embedded in chat upon completion.

9.  **Canvas Synchronization:**
    *   Canvas components listen to Supabase real-time updates for the active project.
    *   UI refreshes automatically when scene data changes.

10. **Canvas Editing & Agent Notification:**
    *   User edits content (e.g., prompt) directly in the Canvas.
    *   Canvas component saves the change to Supabase.
    *   Canvas component *also* sends a notification message (e.g., `{ type: 'user_update', sceneId: '...', field: '...', newValue: '...' }`) to the backend Agent Logic.
    *   Agent Logic processes the notification and can optionally inform the user in chat (e.g., "I see you updated the prompt...").

## IV. Key Focus Areas

*   **Chat UI Development:** Enhance `MultiAgentChat.tsx` for media uploads, rendering media in messages.
*   **Agent NLP & State Management:** Robust understanding of conversational context, parameter extraction, task state tracking.
*   **Backend Notification:** Reliable mechanism for Agent Logic to know when async tasks (image gen) complete (Supabase Functions/Webhooks/Polling).
*   **Data Flow:** Ensure smooth communication: Chat -> Agent Logic -> Supabase/API -> Backend Worker -> Supabase -> Agent Logic -> Chat.
*   **Bidirectional Sync:** Handle updates originating from both Chat (agent-driven) and Canvas (user-driven).

## V. Mermaid Diagram (Chat-Centric - Simplified Flow)

```mermaid
graph TD
    A[User Interaction via Chat (Text/Media)] <--> B(Multi-Agent Chat UI)
    B -- Request/Info --> C(Backend: Agent Logic / NLP)
    C -- Task Delegation --> D{Backend Tasks (API Calls / Supabase Job Creation)}
    D -- Results --> C
    C -- Formatted Results / Updates --> B
    C -- Update Data --> E[(Supabase: Project/Scene Data)]
    E -- Realtime Sync --> F(Canvas UI - Visual Aid)
    E -- Realtime Sync --> B

    %% Canvas Edit Flow
    F -- User Edit --> G{Canvas Update Logic}
    G -- Update Data --> E
    G -- Notify Agent --> C