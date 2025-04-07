# Canvas & Multi-Agent Chat: Status and Testing Plan (June 4, 2025)

This document summarizes the current status of the Canvas and Multi-Agent Chat features based on code review and outlines a testing plan for the active functionalities.

## Current Status Summary

**Active Features:**

1.  **Manual Scene Generation:**
    *   Triggered scene-by-scene (Script, Description, Image Prompt, Image, Video).
    *   Primarily initiated via UI elements within `src/components/canvas/SceneEditor.tsx` (rendered inside `CanvasDetailPanelAdapter` on `Canvas.tsx` page).
    *   Can also be triggered via specific commands (e.g., `generate_scene_image`) within `src/components/canvas/CanvasChat.tsx`.
    *   Uses functions (`generateScene*`) provided by `CanvasMcpContext` (via `useCanvasMcp` hook calling MCP tools).
2.  **Direct Scene Data Updates:**
    *   Scene fields (Script, Voiceover, Image Prompt, Description) can be updated directly.
    *   Triggered via input fields/buttons likely within `SceneEditor.tsx` (on `Canvas.tsx` page), using update functions from `CanvasMcpContext`.
    *   Can also be triggered via interactive prompts initiated from messages in `MultiAgentChat.tsx` (using `handleEditScene*` functions calling `useCanvasAgent` methods).
3.  **Scene Management (Canvas Page):**
    *   Adding new scenes, deleting scenes, and selecting scenes are handled within `CanvasWorkspaceAdapter` on the `Canvas.tsx` page.
4.  **Script Division Suggestion:**
    *   The `divide-script` Supabase function (*suggests* scenes but *doesn't save* them) can be triggered from `CanvasWorkspaceAdapter` on `Canvas.tsx` (via `divideScriptToScenes` function from `useCanvas` hook).
5.  **Project Management:**
    *   Creating, selecting, updating, and deleting projects is handled via `useCanvasProjects` and UI components (`CanvasProjectSelector`, `CanvasHeaderAdapter` on `Canvas.tsx`).
6.  **Multi-Agent Chat Interface (`MultiAgentChat.tsx`):**
    *   Handles core chat interactions (`useMultiAgentChat`).
    *   Supports file attachments (`AttachmentButton`, `AttachmentPreview`).
    *   Allows navigation to the corresponding Canvas page.
    *   Listens for MCP stream events (`scene_update`) for potential real-time feedback (likely reflecting manual updates).
7.  **Canvas UI (`Canvas.tsx`):**
    *   Displays project/scene data (`useCanvasProjects`, `useCanvas`).
    *   Uses a two-panel layout (Scene List via `CanvasWorkspaceAdapter`, Scene Details via `CanvasDetailPanelAdapter`).
    *   Reflects data changes (likely via Supabase real-time).
8.  **Context Providers:**
    *   `CanvasMcpProvider` centralizes generation logic (`useCanvasMcp`) and direct update functions.
    *   `MCPProvider` likely handles core MCP connection/tool calling.
    *   `useProjectContext` shares active project/scene ID globally.

**Pending Features:**

1.  **Full Automation Pipeline:** Chat approval trigger -> orchestrator -> **save divided scenes to DB** -> pipeline runner -> generate all assets automatically (as per `multi_agent_automation_plan.md`).
2.  **Enhanced `MultiAgentChat.tsx` Features:** Rendering rich results (images/videos) in chat, real-time feedback from the *automated* pipeline.
3.  **Saving Divided Scenes:** The step to actually *save* suggested scenes from `divideScriptToScenes` to the database is missing (part of the pending automation).

## Testing Plan for Active Features

1.  **Manual Scene Generation (Canvas Page - Scene Editor)**
    *   **Objective:** Verify generation steps triggered from `SceneEditor` work correctly.
    *   **Test Cases:**
        *   Navigate to `Canvas.tsx`, select project/scene.
        *   In `SceneEditor`, trigger each `generateScene*` action (Script, Description, Prompt, Image, Video).
        *   **Expected:** Field updates in UI/Supabase, success message/toast.
        *   Test error handling (MCP disconnected, tool failure). **Expected:** Graceful error message.
        *   Verify data persistence on refresh.
2.  **Manual Scene Generation (Canvas Chat Component)**
    *   **Objective:** Verify generation steps triggered from `CanvasChat.tsx` work correctly.
    *   **Test Cases:**
        *   Identify component rendering `CanvasChat.tsx`.
        *   Use chat command(s) for generation (e.g., `generate_scene_image`).
        *   **Expected:** Field updates in UI/Supabase, success message in chat.
3.  **Direct Scene Data Updates (Canvas Page - Scene Editor)**
    *   **Objective:** Verify direct field updates from `SceneEditor` work.
    *   **Test Cases:**
        *   Navigate to `Canvas.tsx`, select project/scene.
        *   Modify text fields in `SceneEditor` (Script, Voiceover, Image Prompt, Description) and save.
        *   **Expected:** Changes reflected in UI and persisted in Supabase.
4.  **Direct Scene Data Updates (Multi-Agent Chat Page)**
    *   **Objective:** Verify direct field updates triggered from `MultiAgentChat.tsx` work.
    *   **Test Cases:**
        *   Navigate to `MultiAgentChat.tsx`.
        *   Trigger edit action from a message (e.g., `handleEditSceneScript`), enter new text.
        *   **Expected:** Success toast. Verify change persisted in Supabase and reflected on `Canvas.tsx`.
5.  **Scene Management (Canvas Page - Scene List)**
    *   **Objective:** Verify adding, deleting, and selecting scenes works.
    *   **Test Cases:**
        *   Navigate to `Canvas.tsx`, select project.
        *   In `CanvasWorkspaceAdapter`, click "Add Scene". **Expected:** New scene appears in list/DB.
        *   Select different scenes. **Expected:** Right panel updates.
        *   Delete a scene. **Expected:** Scene removed from list/DB.
6.  **Script Division Suggestion (Canvas Page - Scene List)**
    *   **Objective:** Verify `divide-script` suggests scenes without saving.
    *   **Test Cases:**
        *   Navigate to `Canvas.tsx`, select project.
        *   Trigger `divideScriptToScenes` from `CanvasWorkspaceAdapter`. Provide script.
        *   **Expected:** Suggested scenes/prompts displayed. Verify *no new scenes* added permanently to DB.
7.  **Multi-Agent Chat Attachments**
    *   **Objective:** Verify file attachments work in `MultiAgentChat.tsx`.
    *   **Test Cases:**
        *   Navigate to `MultiAgentChat.tsx`.
        *   Attach a file. **Expected:** Preview appears.
        *   Send message with attachment. **Expected:** Message sent; verify attachment handling.
        *   Remove pending attachment. **Expected:** Preview disappears.
8.  **UI & Data Synchronization**
    *   **Objective:** Verify UI reflects data accurately and updates in real-time across pages.
    *   **Test Cases:**
        *   Load `Canvas.tsx`, verify initial data.
        *   Manually change data in Supabase -> verify `Canvas.tsx` UI updates automatically.
        *   Trigger generation/edits on `Canvas.tsx` -> verify UI updates.
        *   Trigger edits from `MultiAgentChat.tsx` -> verify data updates in Supabase and reflects on `Canvas.tsx`.
9.  **Project Management**
    *   **Objective:** Verify creating, selecting, updating title, deleting projects.
    *   **Test Cases:**
        *   Use `CanvasProjectSelector` to create/select projects. **Expected:** Correct navigation.
        *   Use `CanvasHeaderAdapter` to update title. **Expected:** Title updates in UI/Supabase.
        *   Use `CanvasProjectSelector` to delete project. **Expected:** Project removed from list/DB.