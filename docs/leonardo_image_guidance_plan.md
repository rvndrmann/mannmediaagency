# Leonardo.ai Image Guidance Integration Plan (Admin UI)

**Goal:** Enable admin users to generate images within Canvas scenes using Leonardo.ai's Image Guidance features (Style Reference, Character Reference, Image-to-Image, etc.) via a direct UI integration, bypassing the multi-agent system.

**Revised Plan (Direct UI Integration for Admin):**

1.  **Database Schema Modification (Supabase):**
    *   **Action:** Create a migration to add `image_guidance_settings` (JSONB) to the `scenes` table.
    *   **Purpose:** Store the Leonardo.ai ControlNet settings per scene.

2.  **Backend Function Creation (Supabase Edge Function):**
    *   **Action:** Create a *new* Supabase Edge Function named `leonardo-image-generation`.
    *   **Purpose:** This function will be called *directly* from the frontend. It needs to:
        *   Accept parameters like `prompt`, `image_guidance_settings`, `width`, `height`, `modelId`, etc.
        *   Securely retrieve the Leonardo.ai API key.
        *   Construct the payload and call the Leonardo.ai `/v1/generations` API.
        *   Handle image uploads/IDs if reference images are passed directly.
        *   Return the result (image URL, status).

3.  **Frontend Type Update (`src/services/canvas/types.ts`):**
    *   **Action:** Update the `CanvasScene` interface to include `imageGuidanceSettings`.
    *   **Purpose:** Keep frontend types consistent with the database.

4.  **UI/UX Implementation (e.g., `src/components/canvas/SceneCard.tsx` or similar):**
    *   **Action:** Add UI elements directly within the Canvas scene management interface for admins.
    *   **Purpose:** Allow the admin user to:
        *   Input the image prompt.
        *   Upload or select reference images (using existing upload mechanisms if possible, e.g., `use-supabase-upload.ts`). Need to handle getting the `initImageId` for uploaded/generated images.
        *   Configure ControlNet settings (`strengthType`, `weight`, `influence`, `preprocessorId`) and Image-to-Image `init_strength`.
        *   Trigger the generation process via a button click.
    *   **Action:** Implement the logic within the UI component to:
        *   Gather all necessary data (prompt, settings, reference image IDs/data).
        *   Directly call the `leonardo-image-generation` Supabase function using `supabase.functions.invoke`.
        *   Handle the response (update the scene's `imageUrl`, save the `image_guidance_settings` back to the database for the scene).

5.  **API Key Management:**
    *   **Action:** Store the Leonardo.ai API key securely as an environment variable/secret for the new `leonardo-image-generation` function.

**Diagram (Mermaid Sequence - Conceptual):**

```mermaid
sequenceDiagram
    participant AdminUser
    participant CanvasAdminUI as Canvas Admin UI (Scene Editor)
    participant BackendFunc as leonardo-image-generation (Supabase Func)
    participant LeonardoAPI as Leonardo.ai API
    participant SupabaseDB as Supabase DB

    AdminUser->>CanvasAdminUI: Configures Prompt & Image Guidance Settings
    AdminUser->>CanvasAdminUI: Uploads/Selects Reference Image(s)
    AdminUser->>CanvasAdminUI: Clicks "Generate Guided Image"
    CanvasAdminUI->>BackendFunc: Invoke function (prompt, guidance settings, ref image data/IDs)
    BackendFunc->>SupabaseDB: Retrieve API Key (Securely)
    BackendFunc->>LeonardoAPI: POST /v1/generations (payload with prompt & guidance)
    LeonardoAPI-->>BackendFunc: Returns generation ID/status/URL
    BackendFunc-->>CanvasAdminUI: Returns result
    CanvasAdminUI->>SupabaseDB: Saves guidance settings & new image URL to Scene record
    CanvasAdminUI->>AdminUser: Displays new image / status update