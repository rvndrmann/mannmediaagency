# Canvas Content Generator MCP Plan

## 1. Goal

Create a new MCP server focused on generating content (scripts, descriptions, image prompts, images, videos) based on the context of a canvas project and its scenes. This server will be integrated into the application via a backend proxy API, allowing the frontend (and potentially AI agents) to invoke its tools.

## 2. New MCP Server ("Canvas Content Generator")

*   **Location:** `/Users/apple/Documents/Cline/MCP/canvas-content-generator` (To be created using `npx @modelcontextprotocol/create-server`)
*   **Technology:** Node.js / TypeScript
*   **Type:** Local Stdio Server
*   **Tools to Implement:**
    *   `generate_scene_script(projectId: string, sceneId: string, context?: string, projectContext?: object)`
    *   `generate_scene_description(projectId: string, sceneId: string, context?: string, projectContext?: object)`
    *   `generate_image_prompt(projectId: string, sceneId: string, context?: string, projectContext?: object)`
    *   `generate_scene_image(projectId: string, sceneId: string, imagePrompt?: string, projectContext?: object)` - *Note: This tool will likely call an external image generation API (e.g., Bria, Fal).*
    *   `generate_scene_video(projectId: string, sceneId: string, description?: string, projectContext?: object)` - *Note: This tool will likely call an external video generation API (e.g., Fal).*
*   **Core Functionality:**
    *   Receive tool calls with parameters (including project/scene IDs and context).
    *   (Optional but Recommended) Fetch additional context from Supabase using provided IDs.
    *   Call relevant external AI service APIs (e.g., OpenAI, Bria, Fal) for content generation.
    *   Return the generated content in the standard MCP format (e.g., `{ success: true, data: { script: "..." } }`).
    *   **Important:** This server will *not* directly update the database. Updates will be handled by the frontend via the `updateScene` callback after receiving the result, maintaining the existing pattern.
*   **Configuration (`mcp_settings.json`):**
    *   Define as a local stdio server.
    *   Requires environment variables passed via the `env` key:
        *   `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (if reading context from DB)
        *   `OPENAI_API_KEY` (or keys for other text generation models)
        *   API keys/credentials for image/video generation services (Bria, Fal, etc.)

## 3. Backend Proxy API

*   **Location:** Extend the existing Python backend (`backend/app/main.py`).
*   **Endpoint:** `POST /api/mcp/call`
    *   **Request Body:** `{ "toolName": string, "arguments": object }`
    *   **Response Body:** The result object returned by the invoked MCP tool.
*   **Logic:**
    1.  Receive the request from the frontend.
    2.  Identify which globally configured MCP server provides the requested `toolName`. (Requires backend logic to map tools to servers, potentially by reading `mcp_settings.json` or querying the MCP host system).
    3.  Invoke the tool on the target MCP server using the appropriate communication method (stdio for local servers like this one and Playwright, HTTP/SSE for potential future remote servers).
    4.  Return the MCP server's response to the frontend.
*   **(Optional Endpoint):** `GET /api/mcp/tools` - Lists tools available across all configured MCP servers.

## 4. Frontend Modifications

*   Modify `src/contexts/MCPContext.tsx`:
    *   Change the `callTool` function implementation. Instead of POSTing directly to `http://localhost:8931/tool`, it should POST to the new backend endpoint `/api/mcp/call`.
    *   The rest of the frontend logic (e.g., in `use-canvas-agent-mcp.ts`) that uses `callTool` should work as is, now communicating via the backend proxy.

## 5. Integration Flow Diagram

```mermaid
graph LR
    subgraph Frontend (Browser)
        A[React Component e.g., CanvasSidebar] -- Calls --> B(useCanvasAgentMCP Hook);
        B -- Calls --> C(MCPContext.callTool);
        C -- HTTP POST --> D[/api/mcp/call];
    end

    subgraph Backend (Python/FastAPI)
        D -- Receives Request --> E{Tool Router};
        E -- Determines Target Server --> F[Invoke Stdio MCP];
        F -- stdin/stdout --> G((Canvas Content Gen MCP));
        F -- stdin/stdout --> H((Playwright MCP));
        G -- Returns Result --> F;
        H -- Returns Result --> F;
        F -- Returns Result --> E;
        E -- Sends Response --> D;
    end

    subgraph MCP Servers (Local Processes)
        G -- Uses --> I(AI APIs e.g., OpenAI);
        G -- Uses --> J(Supabase DB - Optional Read);
        H -- Controls --> K(Browser);
    end

    style Frontend fill:#lightblue
    style Backend fill:#lightgreen
    style G fill:#orange
    style H fill:#orange