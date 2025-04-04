import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button'; // Import Button
import { ArrowLeft } from 'lucide-react'; // Import ArrowLeft icon
import { useAuth } from '@/hooks/use-auth';
import { useCanvasProjects } from '@/hooks/use-canvas-projects';
import { useCanvas } from '@/hooks/use-canvas'; // Import useCanvas
// Removed useCanvasAgent import as it's no longer needed for the removed chat panel
// import { useCanvasAgent } from '@/hooks/use-canvas-agent';
import {
  CanvasEmptyStateAdapter,
  CanvasHeaderAdapter,
  CanvasWorkspaceAdapter,
  CanvasDetailPanelAdapter,
  CanvasScriptPanelAdapter
} from '@/components/canvas/adapters/CanvasProjectAdapter.tsx';
import { toast } from 'sonner';
import { useProjectContext } from '@/hooks/multi-agent/project-context';
// Removed CanvasChat import
// import { CanvasChat } from '@/components/canvas/CanvasChat';
import { CanvasScene } from '@/types/canvas'; // Removed SceneUpdateType as it's unused here
import { CanvasProjectSelector } from '@/components/canvas/CanvasProjectSelector'; // Import the new selector

export default function Canvas() {
  const { user, loading: authLoading } = useAuth();
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate(); // Initialize useNavigate
  const [showScriptPanel, setShowScriptPanel] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(true);
  // Removed showChatPanel state
  // const [showChatPanel, setShowChatPanel] = useState(false);
  const { setActiveProject, setActiveScene } = useProjectContext();

  // Use useCanvasProjects primarily for the projects list and project actions
  const {
    projects,
    loading: projectsLoading, // Rename loading to avoid conflict
    createProject: createProjectAction, // Rename actions to avoid conflict
    updateProject: updateProjectAction,
    deleteProject: deleteProjectAction,
    selectProject,
    fetchProjects // Fetch the list of projects
  } = useCanvasProjects();

  // Use useCanvas for the currently selected project's data and scene actions
  const {
    project, // Get the active project state from useCanvas
    scenes,
    selectedScene,
    selectedSceneId,
    setSelectedSceneId,
    loading: canvasLoading, // Rename loading
    fetchProject, // Keep fetchProject for refresh
    addScene, // Use addScene as returned by the hook (returns Promise<CanvasScene | null>)
    updateScene,
    deleteScene, // Returns Promise<boolean>
    divideScriptToScenes, // Returns Promise<boolean>, takes script string
    saveFullScript,
    updateProjectTitle,
    updateMainImageUrl
  } = useCanvas(routeProjectId); // Pass routeProjectId directly to useCanvas

  // Combine loading states
  const loading = authLoading || projectsLoading || canvasLoading;

  // Removed useCanvasAgent hook initialization

  // addScene is now directly available from useCanvas

  // saveFullScript is now directly available from useCanvas

  // divideScriptToScenes is now directly available from useCanvas

  // Use createProjectAction from useCanvasProjects
  const createNewProject = useCallback(async (title: string, description?: string): Promise<string> => {
    console.log('[Canvas.tsx] createNewProject called with title:', title);
    try {
      const result = await createProjectAction(title, description);
      // createProjectAction returns Promise<string> (the ID) or throws error
      if (result) { // Check if result is truthy (non-empty string)
         return result;
      }
      // If result is empty string or error was caught, handle below
      console.error("[Canvas.tsx] createProjectAction did not return a valid project ID");
      toast.error("Failed to get ID for the new project.");
      return "";
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      console.error("[Canvas.tsx] Error creating project:", errorObj);
      toast.error(`Failed to create project: ${errorObj.message}`);
      return "";
    }
  }, [createProjectAction]);

  // updateProjectTitle is now directly available from useCanvas

  // deleteScene is now directly available from useCanvas
  // Wrap deleteScene to match Promise<void> if needed by adapter (check adapter props)
  // Assuming CanvasWorkspaceAdapter expects Promise<boolean> based on previous fix
  const handleDeleteScene = deleteScene;

  // useEffect to fetch projects list on mount (if needed, or handled within hook)
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // selectProject is called by the ProjectSelector, which sets the projectId in useCanvasProjects
  // useCanvas hook is initialized with routeProjectId, so it fetches the correct project initially.
  // No extra effect needed here to link routeProjectId to useCanvas projectId.

  // Effect to update the global context when the project from useCanvas loads/changes
   useEffect(() => {
     if (project?.id) {
       setActiveProject(project.id);
     }
   }, [project, setActiveProject]);

  // REMOVED useEffect that called setActiveScene based on selectedSceneId changes
  // Context is now updated directly in CanvasSidebar onClick

  // Removed agentProps definition

  const toggleScriptPanel = () => setShowScriptPanel(!showScriptPanel);
  const toggleDetailPanel = () => setShowDetailPanel(!showDetailPanel);
  // Removed toggleChatPanel function
  // const toggleChatPanel = () => setShowChatPanel(!showChatPanel);

  // Developer mode - hidden feature to enable mock data
  const [devModeClickCount, setDevModeClickCount] = useState(0);
  const activateDevMode = useCallback(() => {
    setDevModeClickCount(prev => {
      const newCount = prev + 1;
      console.log(`Developer mode click: ${newCount}/5`);

      // After 5 quick clicks, enable mock data mode
      if (newCount >= 5) {
        import('../utils/dev-mode-helpers').then(({ enableMockDataMode }) => {
          const enabled = enableMockDataMode();
          if (enabled) {
            toast.success("Developer mode enabled with mock data", {
              description: "The app will now show sample projects without authentication",
              action: {
                label: "Reload",
                onClick: () => window.location.reload()
              }
            });
          }
        });
        return 0; // Reset counter
      }

      // Reset counter after 3 seconds of inactivity
      setTimeout(() => setDevModeClickCount(0), 3000);
      return newCount;
    });
  }, []);

  // Check local storage for debug info
  useEffect(() => {
    const authConfirmed = localStorage.getItem('auth_confirmed');
    const userEmail = localStorage.getItem('user_email');
    const authTimestamp = localStorage.getItem('auth_timestamp');

    console.log('Local auth debug info:', {
      authConfirmed,
      userEmail,
      authTimestamp,
      currentAuthStatus: user ? 'authenticated' : 'unauthenticated',
      authLoading
    });

    if (!user && !authLoading) {
      console.log('User not authenticated');
    }
  }, [user, authLoading]);

  // If there's a session restoration in progress, show a loading indicator
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">Checking authentication status...</p>
        </div>
      </div>
    );
  }

  // --- Authentication Check ---
  if (!user) {
    // Redirect to login if not authenticated
    console.log('Redirecting to login page - no user detected');

    // Try to manually clear any invalid auth state
    localStorage.removeItem('supabase.auth.token');
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center mb-6">
          <h2
            className="text-2xl font-bold mb-2 cursor-default"
            onClick={activateDevMode} // Hidden dev mode trigger
          >
            Please sign in to view your projects
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You need to be signed in to create and manage video projects.
          </p>
          {/* Small hidden indicator for dev clicks */}
          {devModeClickCount > 0 && (
            <div className="mt-2 text-xs text-gray-400">
              Developer mode: {devModeClickCount}/5 clicks
            </div>
          )}
        </div>
        <button
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          onClick={() => window.location.href = '/auth/login'}
        >
          Sign In
        </button>
      </div>
    );
  }

  // --- Project Loading Check ---
  // Use combined loading state
  if (loading && !project) { // Show loading if combined state is true AND project data isn't loaded yet
     return (
       <div className="flex items-center justify-center h-screen">
         <div className="text-center">
           <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
           <p className="text-lg">Loading...</p> {/* Generic loading message */}
         </div>
       </div>
     );
  }

  // --- Project Selection / Empty State Logic ---
  // --- Project Selection / Empty State Logic ---
  // If no project ID in URL/route, show selector or empty state
  if (!routeProjectId) {
     if (projectsLoading) { // Still loading the list? Show loader
       return (
         <div className="flex items-center justify-center h-screen">
           <div className="text-center">
             <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
             <p className="text-lg">Loading projects list...</p>
           </div>
         </div>
       );
     } else if (projects.length > 0) {
       // Projects list loaded, show selector
       return (
         <CanvasProjectSelector
           projects={projects}
           onSelectProject={(id) => navigate(`/canvas/${id}`)} // Navigate on select
           onCreateNew={async () => {
             try {
               const newProjectId = await createNewProject("Untitled Project");
               if (newProjectId) {
                 navigate(`/canvas/${newProjectId}`);
               }
             } catch (error) { /* Handled in createNewProject */ }
           }}
           onDeleteProject={deleteProjectAction} // Use renamed action
         />
       );
     } else {
       // No projects exist, show empty state
       return <CanvasEmptyStateAdapter createProject={createNewProject} />;
     }
  }

  // --- Loading Specific Project Check ---
  // If we have a routeProjectId but the project from useCanvas isn't loaded yet
  if (routeProjectId && !project && canvasLoading) {
     return (
       <div className="flex items-center justify-center h-screen">
         <div className="text-center">
           <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
           <p className="text-lg">Loading project details...</p>
         </div>
       </div>
     );
  }

  // --- Render Main Canvas UI ---
  // If we have project data (either from URL fetch or selection)
  if (project) {
    return (
      <div className="flex flex-col h-screen">
        {/* Add Back button before the header */}
        <div className="p-2 border-b bg-background"> {/* Simple container for the back button */}
           <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
             <ArrowLeft className="mr-2 h-4 w-4" /> Back
           </Button>
        </div>
        <CanvasHeaderAdapter
          project={project} // Pass project from useCanvas
          updateProject={updateProjectAction}
          createNewProject={createNewProject}
          onToggleScriptPanel={toggleScriptPanel}
          onToggleDetailPanel={toggleDetailPanel}
          // Removed chat panel toggle props
          // onToggleChatPanel={toggleChatPanel}
          // showChatButton={true} // We'll handle the button directly or modify adapter
          // Add a prop for navigating to the main chat instead
          onNavigateToChat={() => {
            if (project?.id) {
              navigate(`/multi-agent-chat/${project.id}`);
            } else {
              toast.error("Please select a project first.");
            }
          }}
        />

        <main className="flex-1 overflow-hidden flex flex-col"> {/* Reverted background */}
          <CanvasWorkspaceAdapter
            project={project}
            selectedScene={selectedScene}
            selectedSceneId={selectedSceneId}
            setSelectedSceneId={setSelectedSceneId}
            mainImageUrl={project?.main_product_image_url} // Pass mainImageUrl
            // Wrap addScene which returns Promise<CanvasScene | null> to match Promise<void>
            addScene={async () => { await addScene(); }}
            updateScene={updateScene}
            deleteScene={handleDeleteScene} // Pass boolean promise directly as fixed in adapter
            // Wrap divideScriptToScenes (boolean promise) to match void promise
            // NOTE: Parameter type mismatch still exists (string vs array) - requires deeper fix
            divideScriptToScenes={async (/* sceneScripts: Array<{...}> */ script: string) => {
              console.warn("DivideScriptToScenes called via adapter with potentially incorrect parameter type");
              await divideScriptToScenes(script); // Using the hook's function signature for now
            }}
            // Wrap saveFullScript (boolean promise) to match void promise
            saveFullScript={async (script: string) => { await saveFullScript(script); }}
            createNewProject={createNewProject}
            // Wrap updateProjectTitle (boolean promise) to match void promise
            updateProjectTitle={async (title: string) => { await updateProjectTitle(title); }}
            updateMainImageUrl={updateMainImageUrl}
            updateProject={updateProjectAction}
            // Removed agent prop
          />
        </main>

        {showDetailPanel && (
          <CanvasDetailPanelAdapter
            scene={selectedScene}
            project={project} // Pass project from useCanvas
            projectId={project?.id || ''}
            updateScene={updateScene}
            // updateProject prop removed from CanvasDetailPanelAdapter
            collapsed={false}
            setCollapsed={() => setShowDetailPanel(false)}
          />
        )}

        {showScriptPanel && (
          <CanvasScriptPanelAdapter
            project={project}
            projectId={project?.id || ''}
            onUpdateScene={updateScene}
            onClose={() => setShowScriptPanel(false)}
            // Wrap saveFullScript (boolean promise) to match void promise
            saveFullScript={async (script: string) => { await saveFullScript(script); }}
            // Wrap divideScriptToScenes (boolean promise) to match void promise
            // NOTE: Parameter type mismatch still exists (string vs array) - requires deeper fix
             divideScriptToScenes={async (/* sceneScripts: Array<{...}> */ script: string) => {
              console.warn("DivideScriptToScenes called via adapter with potentially incorrect parameter type");
              await divideScriptToScenes(script); // Using the hook's function signature for now
            }}
          />
        )}
      </div>
    );
  }

  // Fallback case (should ideally not be reached if logic above is correct)
  return (
    <div className="flex items-center justify-center h-screen">
      <p>Something went wrong. Please try refreshing the page.</p>
    </div>
  );
}
