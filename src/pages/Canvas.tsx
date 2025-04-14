import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useCanvasProjects } from '@/hooks/use-canvas-projects';
import { useCanvas } from '@/hooks/use-canvas';
import {
  CanvasEmptyStateAdapter,
  CanvasHeaderAdapter,
  CanvasWorkspaceAdapter, // Keep for Scene List/Selection
  CanvasDetailPanelAdapter // Keep for Scene Details
  // Removed CanvasScriptPanelAdapter as it's no longer directly used in this layout
} from '@/components/canvas/adapters/CanvasProjectAdapter.tsx';
import { toast } from 'sonner';
import { useProjectContext } from '@/hooks/multi-agent/project-context';
import { CanvasScene } from '@/types/canvas';
import { CanvasProjectSelector } from '@/components/canvas/CanvasProjectSelector';
// Removed Tabs imports

export default function Canvas() {
  const { user, loading: authLoading } = useAuth();
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { setActiveProject, setActiveScene } = useProjectContext();

  const {
    projects,
    loading: projectsLoading,
    createProject: createProjectAction,
    updateProject: updateProjectAction,
    deleteProject: deleteProjectAction,
    selectProject,
    fetchProjects
  } = useCanvasProjects();

  const {
    project,
    scenes, // Keep scenes if CanvasWorkspaceAdapter needs it directly (it might)
    selectedScene,
    selectedSceneId,
    setSelectedSceneId, // Crucial for linking list selection to detail panel
    loading: canvasLoading,
    fetchProject,
    addScene,
    updateScene,
    deleteScene,
    divideScriptToScenes,
    saveFullScript,
    updateProjectTitle,
    updateMainImageUrl,
    updateProjectAssets // Get the new function from the hook
  } = useCanvas(routeProjectId);

  const loading = authLoading || projectsLoading || canvasLoading;

  const createNewProject = useCallback(async (title: string, description?: string): Promise<string> => {
    console.log('[Canvas.tsx] createNewProject called with title:', title);
    try {
      const result = await createProjectAction(title, description);
      if (result) {
         return result;
      }
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

  const handleDeleteScene = deleteScene; // Assuming adapter expects Promise<boolean>

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

   useEffect(() => {
     if (project?.id) {
       setActiveProject(project.id);
     }
   }, [project, setActiveProject]);

   // Update context when selected scene changes locally
   useEffect(() => {
     setActiveScene(selectedSceneId);
   }, [selectedSceneId, setActiveScene]);


  // Developer mode logic (unchanged)
  const [devModeClickCount, setDevModeClickCount] = useState(0);
  const activateDevMode = useCallback(() => {
    setDevModeClickCount(prev => {
      const newCount = prev + 1;
      console.log(`Developer mode click: ${newCount}/5`);
      if (newCount >= 5) {
        import('../utils/dev-mode-helpers').then(({ enableMockDataMode }) => {
          const enabled = enableMockDataMode();
          if (enabled) {
            toast.success("Developer mode enabled with mock data", {
              description: "The app will now show sample projects without authentication",
              action: { label: "Reload", onClick: () => window.location.reload() }
            });
          }
        });
        return 0;
      }
      setTimeout(() => setDevModeClickCount(0), 3000);
      return newCount;
    });
  }, []);

  // Local storage debug info (unchanged)
  useEffect(() => {
    const authConfirmed = localStorage.getItem('auth_confirmed');
    const userEmail = localStorage.getItem('user_email');
    const authTimestamp = localStorage.getItem('auth_timestamp');
    console.log('Local auth debug info:', { authConfirmed, userEmail, authTimestamp, currentAuthStatus: user ? 'authenticated' : 'unauthenticated', authLoading });
    if (!user && !authLoading) console.log('User not authenticated');
  }, [user, authLoading]);

  // Auth loading state (unchanged)
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

  // Authentication check (unchanged)
  if (!user) {
    localStorage.removeItem('supabase.auth.token');
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2 cursor-default" onClick={activateDevMode}>
            Please sign in to view your projects
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You need to be signed in to create and manage video projects.
          </p>
          {devModeClickCount > 0 && (
            <div className="mt-2 text-xs text-gray-400">Developer mode: {devModeClickCount}/5 clicks</div>
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

  // Project list loading state (unchanged)
  if (!routeProjectId) {
     if (projectsLoading) {
       return (
         <div className="flex items-center justify-center h-screen">
           <div className="text-center">
             <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
             <p className="text-lg">Loading projects list...</p>
           </div>
         </div>
       );
     } else if (projects.length > 0) {
       return (
         <CanvasProjectSelector
           projects={projects}
           onSelectProject={(id) => navigate(`/canvas/${id}`)}
           onCreateNew={async () => {
             try {
               const newProjectId = await createNewProject("Untitled Project");
               if (newProjectId) navigate(`/canvas/${newProjectId}`);
             } catch (error) { /* Handled in createNewProject */ }
           }}
           onDeleteProject={deleteProjectAction}
         />
       );
     } else {
       return <CanvasEmptyStateAdapter createProject={createNewProject} />;
     }
  }

  // Specific project loading state (unchanged)
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

  // --- Render Main Canvas UI (Modified) ---
  if (project) {
    return (
      <div className="flex flex-col h-screen bg-background">
        {/* Back button */}
        <div className="p-2 border-b flex-shrink-0 bg-background"> {/* Ensure bg matches */}
           <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
             <ArrowLeft className="mr-2 h-4 w-4" /> Back
           </Button>
        </div>
        {/* Header */}
        <CanvasHeaderAdapter
          project={project}
          updateProject={updateProjectAction}
          createNewProject={createNewProject}
          onNavigateToChat={() => {
            if (project?.id) {
              navigate(`/multi-agent-chat/${project.id}`);
            } else {
              toast.error("Please select a project first.");
            }
          }}
        />

        {/* Main content area - Side-by-side layout */}
        <main className="flex flex-col md:flex-row flex-1 overflow-hidden border-t">

          {/* Left Panel: Scene List (using CanvasWorkspaceAdapter) */}
          <div className="md:w-1/3 border-r flex flex-col overflow-hidden">
             <div className="flex-1 overflow-y-auto">
               <CanvasWorkspaceAdapter
                 scenes={scenes}
                 project={project}
                 selectedScene={selectedScene}
                 selectedSceneId={selectedSceneId}
                 setSelectedSceneId={setSelectedSceneId}
                 mainImageUrl={project?.main_product_image_url}
                 addScene={async () => { await addScene(); }}
                 updateScene={updateScene}
                 deleteScene={handleDeleteScene}
                 divideScriptToScenes={async (script: string) => { await divideScriptToScenes(script); }}
                 saveFullScript={async (script: string) => { await saveFullScript(script); }}
                 createNewProject={createNewProject}
                 updateProjectTitle={async (title: string) => { await updateProjectTitle(title); }}
                 updateMainImageUrl={(imageUrl: string) => { updateMainImageUrl(imageUrl); }}
                 updateProject={updateProjectAction}
                 updateProjectAssets={updateProjectAssets}
               />
             </div>
          </div>

          {/* Right Panel: Scene Details / Media */}
          <div className="flex-1 flex flex-col overflow-hidden bg-muted/30">
            {selectedScene ? (
              <CanvasDetailPanelAdapter
                scene={selectedScene}
                project={project}
                projects={projects}
                projectId={project?.id || ''}
                updateScene={updateScene}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground p-4 text-center">
                <p>Select a scene from the list to view details and edit assets.</p>
              </div>
            )}
          </div>

        </main>
      </div>
    );
  }

  // Fallback case (unchanged)
  return (
    <div className="flex items-center justify-center h-screen">
      <p>Something went wrong. Please try refreshing the page.</p>
    </div>
  );
}
