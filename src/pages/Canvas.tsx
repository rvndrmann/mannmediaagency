import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { useCanvasProjects } from '@/hooks/use-canvas-projects';
import { useCanvasAgent } from '@/hooks/use-canvas-agent';
import {
  CanvasEmptyStateAdapter,
  CanvasHeaderAdapter,
  CanvasSidebarAdapter,
  CanvasWorkspaceAdapter,
  CanvasDetailPanelAdapter,
  CanvasScriptPanelAdapter
} from '@/components/canvas/adapters/CanvasProjectAdapter.tsx';
import { toast } from 'sonner';
import { useProjectContext } from '@/hooks/multi-agent/project-context';
import { CanvasChat } from '@/components/canvas/CanvasChat';
import { CanvasScene } from '@/types/canvas'; // Removed SceneUpdateType as it's unused here
import { CanvasProjectSelector } from '@/components/canvas/CanvasProjectSelector'; // Import the new selector

export default function Canvas() {
  const { user, loading: authLoading } = useAuth();
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const [showScriptPanel, setShowScriptPanel] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(true);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const { setActiveProject, setActiveScene } = useProjectContext();

  const {
    project,
    projects,
    scenes,
    selectedScene,
    selectedSceneId,
    setSelectedSceneId,
    createProject,
    updateProject,
    deleteProject,
    createScene,
    updateScene,
    deleteScene,
    loading,
    projectId,
    fetchProject,
    selectProject // Add selectProject here
  } = useCanvasProjects();

  const {
    generateSceneScript,
    generateSceneDescription,
    generateImagePrompt,
    generateSceneImage,
    generateSceneVideo,
    isLoading: isAgentLoading,
    messages,
    addUserMessage,
    addAgentMessage,
    addSystemMessage,
    activeAgent
  } = useCanvasAgent({
    projectId: projectId || '',
    sceneId: selectedSceneId,
    updateScene
  });

  const addScene = useCallback(async (): Promise<void> => {
    if (!project) return;

    try {
      await createScene({
        projectId: project.id,
        project_id: project.id,
        scene_order: scenes.length + 1
      });
    } catch (error) {
      console.error("Error adding scene:", error);
    }
  }, [project, createScene, scenes.length]);

  const saveFullScript = useCallback(async (script: string): Promise<void> => {
    if (!project) return;

    try {
      await updateProject(project.id, {
        full_script: script,
        fullScript: script // update both for compatibility
      });
      toast.success("Script saved successfully");
    } catch (error) {
      console.error('Error saving full script:', error);
      toast.error('Failed to save script');
    }
  }, [project, updateProject]);

  const divideScriptToScenes = useCallback(async (
    sceneScripts: Array<{ id: string; content: string; voiceOverText?: string }>
  ): Promise<void> => {
    for (const sceneScript of sceneScripts) {
      if (sceneScript.id) {
        await updateScene(sceneScript.id, 'script', sceneScript.content || '');
        if (sceneScript.voiceOverText) {
          await updateScene(sceneScript.id, 'voiceOverText', sceneScript.voiceOverText);
        }
      }
    }
    toast.success("Script divided into scenes successfully");
  }, [updateScene]);

  const createNewProject = useCallback(async (title: string, description?: string): Promise<string> => {
    try {
      const result = await createProject(title, description);

      // Use a type assertion with a simpler condition TypeScript can understand
      if (result && typeof result === 'object') {
        const projectWithId = result as { id: string };
        if ('id' in projectWithId) {
          return projectWithId.id;
        }
      }
      return "";
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Failed to create project");
      return "";
    }
  }, [createProject]);

  const updateProjectTitle = useCallback(async (title: string): Promise<void> => {
    if (project && project.id) {
      try {
        await updateProject(project.id, { title });
        toast.success("Project title updated successfully");
      } catch (error) {
        console.error("Error updating project title:", error);
        toast.error("Failed to update project title");
      }
    }
  }, [project, updateProject]);

  const handleDeleteScene = useCallback(async (sceneId: string): Promise<void> => {
    await deleteScene(sceneId);
  }, [deleteScene]);

  useEffect(() => {
    if (routeProjectId) {
      fetchProject();
    }
  }, [routeProjectId, fetchProject]);

  useEffect(() => {
    if (projectId) {
      setActiveProject(projectId);
    } else if (routeProjectId) {
      setActiveProject(routeProjectId);
    }
  }, [projectId, routeProjectId, setActiveProject]);

  // REMOVED useEffect that called setActiveScene based on selectedSceneId changes
  // Context is now updated directly in CanvasSidebar onClick

  const agentProps = {
    isLoading: isAgentLoading,
    messages,
    generateSceneScript,
    generateSceneDescription,
    generateImagePrompt,
    generateSceneImage,
    generateSceneVideo,
    addUserMessage,
    addAgentMessage,
    addSystemMessage,
    activeAgent,
    isMcpEnabled: true,
    isMcpConnected: true,
    toggleMcp: () => {},
    isGeneratingDescription: false,
    isGeneratingImagePrompt: false,
    isGeneratingImage: false,
    isGeneratingVideo: false,
    isGeneratingScript: false,
    isGenerating: isAgentLoading
  };

  const toggleScriptPanel = () => setShowScriptPanel(!showScriptPanel);
  const toggleDetailPanel = () => setShowDetailPanel(!showDetailPanel);
  const toggleChatPanel = () => setShowChatPanel(!showChatPanel);

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
  // Show loader while projects list is loading, but only if no specific project is requested
  if (loading && !routeProjectId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">Loading projects...</p>
        </div>
      </div>
    );
  }

  // --- Project Selection / Empty State Logic ---
  // If no project ID in URL and no project selected yet
  if (!projectId && !routeProjectId) {
    if (projects.length > 0) {
      // If projects exist, show the selector
      return (
        <CanvasProjectSelector
          projects={projects}
          onSelectProject={selectProject} // Use selectProject from useCanvasProjects
          onCreateNew={() => { /* Navigate or set state to show create form */
            // For now, creating a new project will likely navigate,
            // but this callback could be used to show the empty state form inline
            // We might need state like `showCreateForm` if we want inline switching.
            // Let's start with the empty state component directly for the 0 project case.
            // If needed, we can add state later.
            console.log("Create New clicked from selector - showing empty state for now");
            // To show the form inline, we'd need state:
            // setShowCreateForm(true);
            // And then render the empty state based on that state.
            // For simplicity, let's assume clicking "Create New" on the selector
            // might eventually navigate to a dedicated create page or modal.
            // Or, we render the EmptyState here if a state flag is set.
            // Let's render the empty state directly for the 0 project case first.
          }}
        />
      );
    } else {
      // If no projects exist, show the empty state to create one
      return <CanvasEmptyStateAdapter createProject={createNewProject} />;
    }
  }

  // --- Loading Specific Project Check ---
  // If we have a projectId (from URL or selection) but the project data isn't loaded yet
  if (!project && (projectId || routeProjectId)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">Loading selected project...</p>
        </div>
      </div>
    );
  }

  // --- Render Main Canvas UI ---
  // If we have project data (either from URL fetch or selection)
  if (project) {
    return (
      <div className="flex flex-col h-screen"> {/* Reverted background */}
        <CanvasHeaderAdapter
          project={project}
          updateProject={updateProject}
          onToggleScriptPanel={toggleScriptPanel}
          onToggleDetailPanel={toggleDetailPanel}
          onToggleChatPanel={toggleChatPanel}
          showChatButton={true}
        />

        <div className="flex flex-1 overflow-hidden"> {/* Reverted background */}
          <CanvasSidebarAdapter
            project={project}
            selectedSceneId={selectedSceneId}
            setSelectedSceneId={setSelectedSceneId}
            createScene={createScene}
            deleteScene={handleDeleteScene}
            loading={loading} // Pass down loading state for sidebar indicators if needed
            setActiveScene={setActiveScene} // Pass down context setter
          />

          <main className="flex-1 overflow-hidden flex flex-col"> {/* Reverted background */}
            <CanvasWorkspaceAdapter
              project={project}
              selectedScene={selectedScene}
              selectedSceneId={selectedSceneId}
              setSelectedSceneId={setSelectedSceneId}
              addScene={addScene}
              updateScene={updateScene}
              deleteScene={handleDeleteScene}
              divideScriptToScenes={divideScriptToScenes}
              saveFullScript={saveFullScript}
              createNewProject={createNewProject}
              updateProjectTitle={updateProjectTitle}
              agent={agentProps}
            />
          </main>

          {showDetailPanel && (
            <CanvasDetailPanelAdapter
              scene={selectedScene}
              projectId={project?.id || ''}
              updateScene={updateScene}
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
              saveFullScript={saveFullScript}
              divideScriptToScenes={divideScriptToScenes}
            />
          )}

          {showChatPanel && (
            <div className="w-80 bg-[#111827] text-white">
              <CanvasChat
                projectId={project?.id}
                sceneId={selectedSceneId}
                onClose={() => setShowChatPanel(false)}
                updateScene={updateScene}
              />
            </div>
          )}
        </div>
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
