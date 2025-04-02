# Prompt: Build Python Web App with OpenAI Assistants SDK

**Objective:**

Create a web application using Python for the backend and the OpenAI Assistants API (Python SDK) for the AI logic. The application should allow users to manage simple video projects (represented by scenes with scripts and image URLs) via a "Canvas" interface and interact with an AI assistant via a dedicated chat interface to discuss and modify these projects.

**Core Requirements:**

1.  **Technology Stack:**
    *   **Backend:** Python. Please choose and use either **Flask** or **FastAPI** as the web framework.
    *   **AI:** OpenAI Assistants API (using the official `openai` Python SDK).
    *   **Database:** PostgreSQL. Use **SQLAlchemy** as the ORM for database interactions. (Alternatively, suggest using Supabase which provides managed PostgreSQL, authentication, and storage if that simplifies setup).
    *   **Frontend:** Standard HTML, CSS, and JavaScript. Keep the frontend simple for this initial build; no complex JS framework is required unless you deem it essential.

2.  **User & Authentication Features:**
    *   **Database Model:** Create a `User` model (id, email, hashed_password, created_at).
    *   **Authentication:** Implement user registration (email/password) and login functionality. Use secure password hashing (e.g., Werkzeug's security helpers for Flask, passlib for FastAPI). Implement session management (e.g., using Flask-Login or JWT tokens).
    *   **Profile Page:** Create a simple `/profile` page accessible only to logged-in users, displaying their email address.
    *   **Plans & Billing Page:** Create a static placeholder page at `/billing` indicating where plan selection and billing management would reside. No functional integration is needed.
    *   **Protected Routes:** Ensure pages like Canvas, Chat, and Profile require user login.

3.  **Project Management (Canvas Interface):**
    *   **Database Models:**
        *   `Project` (id, user_id (FK to User), title, description, created_at).
        *   `Scene` (id, project_id (FK to Project), title, script, image_url, order, created_at).
    *   **Backend API:** Create RESTful API endpoints (using your chosen Python framework) for:
        *   `GET /api/projects`: List projects for the logged-in user.
        *   `POST /api/projects`: Create a new project for the logged-in user.
        *   `GET /api/projects/<project_id>`: Get details of a specific project (including its scenes, ordered by `order`).
        *   `PUT /api/projects/<project_id>`: Update project details (e.g., title).
        *   `DELETE /api/projects/<project_id>`: Delete a project.
        *   `POST /api/projects/<project_id>/scenes`: Create a new scene within a project.
        *   `PUT /api/scenes/<scene_id>`: Update scene details (e.g., title, script, image_url).
        *   `DELETE /api/scenes/<scene_id>`: Delete a scene.
        *   *(Ensure all endpoints check user ownership)*.
    *   **Frontend UI (`/canvas/<project_id>` page):**
        *   Display the project title (allow editing via the PUT endpoint).
        *   List scenes belonging to the project (fetched via `GET /api/projects/<project_id>`).
        *   Allow adding a new scene (using `POST /api/projects/<project_id>/scenes`).
        *   Allow deleting scenes (using `DELETE /api/scenes/<scene_id>`).
        *   Display details (title, script, image URL) for a selected scene. Allow editing these details (using `PUT /api/scenes/<scene_id>`).

4.  **AI Chat Interface:**
    *   **Database Model:** `ChatSession` (id, user_id (FK to User), project_id (FK to Project), openai_thread_id, created_at).
    *   **Frontend UI (`/chat/<project_id>` page):**
        *   Display chat messages (user messages on right, assistant on left).
        *   Provide a text input and send button.
        *   Fetch chat history associated with this `project_id` (via the backend).
    *   **Backend API (`POST /api/chat/<project_id>/send` endpoint):**
        *   Accepts `{ "message": "user input text" }`.
        *   Find or create a `ChatSession` record for the user and `project_id`. Retrieve the `openai_thread_id`.
        *   If no `openai_thread_id` exists, create a new thread using the OpenAI SDK and save the ID in the `ChatSession` record.
        *   Use the OpenAI Python SDK:
            *   Add the user's message to the thread.
            *   Create a Run on the thread using a pre-defined Assistant ID (you'll need to create this Assistant in the OpenAI platform beforehand). Pass the necessary tool definitions (see below).
            *   Poll the Run status until completion or `requires_action`.
            *   If `requires_action`:
                *   Parse the required tool calls.
                *   Execute the corresponding Python functions defined in your backend (see Tools below).
                *   Submit the tool outputs back to the Run.
                *   Continue polling.
            *   Once completed, retrieve the latest assistant message(s) from the thread.
            *   Store the user message and assistant response(s) in your database (e.g., a `ChatMessage` table linked to `ChatSession`).
            *   Return the assistant's response content to the frontend.
    *   **OpenAI Assistant & Tools:**
        *   Create an Assistant in the OpenAI platform. Provide instructions like: "You are an AI assistant helping users create video projects. You can fetch project details, update scene scripts, and create new scenes based on user requests. Use the available tools to interact with the application's data."
        *   Define **Python functions** in your backend to serve as tools:
            *   `get_project_details(project_id: str) -> str`: Fetches project title and a list of scene titles/IDs from the database. Returns JSON string.
            *   `update_scene_script(scene_id: str, script_content: str) -> str`: Updates the script for the specified scene ID in the database. Returns JSON confirmation.
            *   `create_scene(project_id: str, title: str) -> str`: Creates a new scene record for the project in the database. Returns JSON confirmation with the new scene ID.
            *   *(Define more tools as needed, e.g., `update_scene_image_url`)*.
        *   Ensure your backend API endpoint passes the correct JSON schemas for these tools when creating the Assistant Run.

**Implementation Guidance:**

1.  **Setup:** Initialize your chosen Python framework project, set up the database connection (SQLAlchemy), and install necessary libraries (`openai`, framework dependencies, etc.).
2.  **Auth:** Implement user models and authentication routes first.
3.  **Core Models & API:** Implement the `Project` and `Scene` models and their corresponding CRUD API endpoints.
4.  **Canvas UI:** Build the basic frontend for listing/managing projects and scenes, connecting it to the APIs.
5.  **OpenAI Setup:** Create your Assistant on the OpenAI platform and get its ID. Define the Python tool functions in your backend.
6.  **Chat Backend:** Implement the `/api/chat/<project_id>/send` endpoint, including the logic for managing threads, runs, and tool calls using the OpenAI SDK.
7.  **Chat Frontend:** Build the chat UI and connect it to the chat API endpoint.
8.  **Refinement:** Add error handling, loading states, and improve UI/UX.

Focus on getting the core loop working: User sends message -> Backend calls OpenAI -> Assistant potentially calls tool -> Backend executes tool -> Backend submits output -> Assistant responds -> Backend sends response to UI.