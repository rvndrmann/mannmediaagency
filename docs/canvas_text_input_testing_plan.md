# Canvas Page Text Input Testing Plan

## 1. Introduction & Scope

This document outlines the testing plan for functionalities involving user text input within the main Canvas page (`/canvas/:projectId`) structure. The focus is on how text input interacts with project and scene data management, including creation, editing, and saving of text-based content like titles and scripts.

**Note:** This plan specifically covers interactions managed through the components orchestrated by `src/pages/Canvas.tsx` (e.g., Header, Workspace, Detail Panel, Script Panel adapters). Direct text-to-visual element manipulation via chat commands is handled in the Multi-Agent Chat interface and is outside the scope of this plan.

## 2. Testing Areas

### 2.1. Project Creation & Naming

**Objective:** Verify that users can successfully create new projects with valid titles via the mechanisms available on the Canvas page (e.g., Empty State, Project Selector).

**Preconditions:**
*   User is authenticated.
*   User is on the Canvas page (`/canvas`) or interacting with the `CanvasProjectSelector`.
*   No project is currently selected OR user explicitly chooses to create a new project.

**Test Cases:**

| # | Test Steps                                                                 | Expected Results                                                                                                |
|---|----------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------|
| 1 | Navigate to `/canvas`. If no projects exist, enter a valid title ("Test Project 1") in the empty state prompt and confirm. | A new project is created with the title "Test Project 1". User is navigated to `/canvas/<new_project_id>`. |
| 2 | Navigate to `/canvas`. If projects exist, click "Create New" in the selector. Enter a valid title ("Test Project 2") and confirm. | A new project is created with the title "Test Project 2". User is navigated to `/canvas/<new_project_id>`. |
| 3 | Attempt to create a project with an empty title.                           | Project creation should fail. An appropriate error message should be displayed. No new project is created.      |
| 4 | Attempt to create a project with a very long title (e.g., 200+ characters). | Project creation might succeed (depending on validation rules) or fail gracefully with a message. Verify limits. |
| 5 | Attempt to create a project with special characters in the title (`~!@#$%^&*()_+`). | Project creation should succeed. Verify the title is displayed correctly without issues.                     |
| 6 | Attempt to create a project with leading/trailing whitespace in the title. | Project should be created, ideally with whitespace trimmed. Verify the final title.                             |

### 2.2. Project Title Editing

**Objective:** Verify that users can successfully edit the title of an existing project via the Canvas Header.

**Preconditions:**
*   User is authenticated.
*   User is on the Canvas page for a specific project (`/canvas/:projectId`).
*   The `CanvasHeaderAdapter` component is visible and allows title editing.

**Test Cases:**

| # | Test Steps                                                                      | Expected Results                                                                                                   |
|---|---------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------|
| 1 | Click to edit the project title in the header. Enter a new valid title ("Updated Title") and save. | The project title is updated successfully. The header displays "Updated Title". Changes persist after refresh. |
| 2 | Attempt to save an empty title.                                                 | Saving should fail. An appropriate error message should be displayed. The original title should remain.            |
| 3 | Attempt to save a very long title (e.g., 200+ characters).                      | Saving might succeed or fail gracefully. Verify limits and behavior.                                               |
| 4 | Attempt to save a title with special characters (`~!@#$%^&*()_+`).              | Saving should succeed. Verify the title is displayed correctly.                                                    |
| 5 | Edit the title, then cancel the edit without saving.                            | The original project title should remain unchanged.                                                                |
| 6 | Edit the title with leading/trailing whitespace.                                | Title should be saved, ideally with whitespace trimmed. Verify the final title.                                  |

### 2.3. Full Script Management (via Script Panel)

**Objective:** Verify that users can save and update the project's full script using the `CanvasScriptPanelAdapter`.

**Preconditions:**
*   User is authenticated.
*   User is on the Canvas page for a specific project (`/canvas/:projectId`).
*   The Script Panel is opened (`showScriptPanel` is true).

**Test Cases:**

| # | Test Steps                                                                      | Expected Results                                                                                                                               |
|---|---------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------|
| 1 | Open the Script Panel. Enter a multi-line script into the full script text area. Click "Save Script". | The script is saved successfully. A success toast message appears. The script content persists after closing and reopening the panel or refreshing. |
| 2 | Edit the existing full script. Click "Save Script".                             | The script is updated successfully. Changes persist.                                                                                           |
| 3 | Enter a very large script (e.g., thousands of lines/characters). Click "Save Script". | The script should save successfully (verify performance/limits).                                                                               |
| 4 | Clear the entire script content. Click "Save Script".                           | The script is saved as empty. Verify this state persists.                                                                                      |
| 5 | Enter script content with various formatting (newlines, tabs, special chars). Click "Save Script". | The script is saved correctly, preserving formatting where appropriate.                                                        |
| 6 | Close the panel without saving changes made to the script.                      | Changes are discarded. The previously saved script content remains.                                                                            |

### 2.4. Scene Script & Detail Editing (via Detail Panel)

**Objective:** Verify that users can edit scene-specific text fields (like script, voiceover text) using the `CanvasDetailPanelAdapter`.

**Preconditions:**
*   User is authenticated.
*   User is on the Canvas page for a specific project (`/canvas/:projectId`).
*   At least one scene exists and is selected (`selectedScene` is not null).
*   The Detail Panel is open (`showDetailPanel` is true).

**Test Cases:**

| # | Test Steps                                                                                             | Expected Results                                                                                                                            |
|---|--------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------|
| 1 | Select a scene. In the Detail Panel, edit the scene's script text area. Changes should save (verify mechanism - auto-save or manual button). | The scene's script is updated successfully. Changes persist after selecting another scene and coming back, or after refresh. |
| 2 | Edit other text fields available in the Detail Panel (e.g., Voiceover Text, Notes if applicable). Save. | The corresponding scene data is updated successfully. Changes persist.                                                                      |
| 3 | Enter very long text into a scene field. Save.                                                         | Saving should succeed (verify limits). Text should display correctly (e.g., wrap or scroll).                                                |
| 4 | Clear the content of a text field. Save.                                                               | The field is saved as empty. Verify persistence.                                                                                            |
| 5 | Enter text with special characters and formatting into a field. Save.                                  | Text is saved and displayed correctly.                                                                                                      |
| 6 | Rapidly edit multiple fields in the detail panel (if auto-save is enabled).                            | All changes should be saved correctly without race conditions or data loss. Verify final state.                                             |

### 2.5. Script Division into Scenes (via Script Panel)

**Objective:** Verify that the "Divide Script to Scenes" functionality in the `CanvasScriptPanelAdapter` correctly updates individual scene scripts based on the full script.

**Preconditions:**
*   User is authenticated.
*   User is on the Canvas page for a specific project (`/canvas/:projectId`).
*   The Script Panel is opened.
*   The project has a full script entered.
*   Multiple scenes exist.

**Test Cases:**

| # | Test Steps                                                                                                                               | Expected Results                                                                                                                                                                                             |
|---|------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1 | Enter a full script with clear scene markers (e.g., "Scene 1:", "Scene 2:"). Click "Divide Script to Scenes".                             | The script content is distributed to the corresponding scenes based on the markers. Verify scene scripts in the Detail Panel or Workspace. A success message appears.                                        |
| 2 | Use the divide function when the number of scenes doesn't match the script divisions (e.g., more scenes than markers, or vice-versa). | Verify the behavior: Does it create/delete scenes? Does it assign script partially? Does it show an error? (Define expected behavior based on implementation).                                                |
| 3 | Use the divide function with an empty full script.                                                                                       | Scene scripts should likely be cleared or remain unchanged (verify implementation). No errors should occur.                                                                                                    |
| 4 | Use the divide function when scenes already have scripts.                                                                                | Existing scene scripts should be overwritten by the content from the full script division.                                                                                                                   |
| 5 | Enter a full script without clear markers. Click "Divide Script to Scenes".                                                              | Verify behavior: Does it attempt a best guess? Does it put everything in the first scene? Does it show an error/warning? (Define expected behavior).                                                          |

## 3. General Considerations

*   **Input Validation:** Test fields for any specific validation rules (e.g., character limits, forbidden characters).
*   **Error Handling:** Ensure appropriate, user-friendly error messages are displayed for failed operations (e.g., network errors during save, validation failures).
*   **Data Persistence:** Verify that all saved text changes persist across browser refreshes, closing/reopening panels, and navigating away from and back to the project.
*   **UI Feedback:** Confirm that clear feedback is provided for successful actions (e.g., toast messages like "Script saved", "Project updated").
*   **Responsiveness:** Check how text input fields behave on different screen sizes if applicable.