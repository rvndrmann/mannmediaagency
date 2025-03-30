
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CanvasWorkspace } from "@/components/canvas/CanvasWorkspace";
import { CanvasChat, ChatToggleButton } from "@/components/canvas/CanvasChat";
import { generateInitialScenes } from "@/data/scene-templates";
import { toast } from "sonner";
import { useChatSession } from "@/contexts/ChatSessionContext";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ProjectHistory } from "@/components/canvas/ProjectHistory";
import { CanvasHeader } from "@/components/canvas/CanvasHeader";
import { supabase } from "@/integrations/supabase/client";
import { CanvasProvider, useCanvas } from "@/contexts/CanvasContext";
import { ErrorBoundary } from "@/components/integration/ErrorBoundary";
import { AgentCanvasIntegration } from "@/components/integration/AgentCanvasIntegration";

function CanvasContent() {
  const { 
    project, 
    scenes, 
    selectedScene, 
    selectedSceneId, 
    setSelectedSceneId, 
    loading: isLoading, 
    error: canvasError, 
    sceneLoading,
    createProject,
    addScene,
    deleteScene,
    updateScene,
    divideScriptToScenes,
    saveFullScript,
    updateProjectTitle,
    fetchProjectAndScenes
  } = useCanvas();
  
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { getOrCreateChatSession } = useChatSession();
  const [showChat, setShowChat] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [chatInitialized, setChatInitialized] = useState(false);
  const [hasProjects, setHasProjects] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [recoveryMode, setRecoveryMode] = useState(false);

  // Check if user has any projects
  useEffect(() => {
    const checkForProjects = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          setHasProjects(false);
          return;
        }
        
        const { data, error, count } = await supabase
          .from("canvas_projects")
          .select("id", { count: 'exact' })
          .eq("user_id", userData.user.id)
          .limit(1);
          
        if (error) throw error;
        
        setHasProjects(count ? count > 0 : false);
      } catch (error) {
        console.error("Error checking for projects:", error);
        setHasProjects(false);
      }
    };
    
    if (hasProjects === null && !projectId) {
      checkForProjects();
    }
  }, [projectId, hasProjects]);

  // Initialize chat session when project loads - only once when project changes
  useEffect(() => {
    if (projectId && !chatInitialized && project) {
      try {
        getOrCreateChatSession(projectId);
        setChatInitialized(true);
      } catch (error) {
        console.error("Error initializing chat session:", error);
      }
    }
  }, [projectId, getOrCreateChatSession, chatInitialized, project]);

  // Effect to handle errors and project loading
  useEffect(() => {
    if (canvasError) {
      setLoadError(canvasError);
      toast.error(`Error: ${canvasError}`);
    } else {
      setLoadError(null);
    }
    
    // If projectId changes, ensure we reset the chat session
    if (projectId) {
      setChatInitialized(false);
    }
  }, [projectId, canvasError]);

  // Manual refresh function for when we need to force reload the project data
  const handleRefreshProject = useCallback(() => {
    if (projectId) {
      fetchProjectAndScenes();
    }
  }, [projectId, fetchProjectAndScenes]);

  // Enter recovery mode 
  const enterRecoveryMode = useCallback(() => {
    setRecoveryMode(true);
    toast.info("Entered recovery mode - some features may be disabled for stability");
  }, []);

  const handleSceneSelect = useCallback((sceneId: string) => {
    setSelectedSceneId(sceneId);
  }, [setSelectedSceneId]);

  const handleSceneCreate = useCallback(async () => {
    try {
      await addScene();
      toast.success("Scene created successfully");
    } catch (error) {
      console.error("Error creating scene:", error);
      toast.error("Failed to create scene");
    }
  }, [addScene]);

  const handleToggleChat = useCallback(() => {
    setShowChat(prev => !prev);
  }, []);

  const handleToggleHistory = useCallback(() => {
    setShowHistory(prev => !prev);
  }, []);

  const handleSelectProject = useCallback((selectedProjectId: string) => {
    if (!selectedProjectId) {
      navigate('/canvas');
      return;
    }
    
    // Only navigate if different from current
    if (selectedProjectId !== projectId) {
      // Use navigate with replace to avoid adding to history stack
      navigate(`/canvas/${selectedProjectId}`, { replace: true });
      
      // Reset states to prevent UI inconsistencies
      setShowHistory(false);
      setShowChat(false);
      setChatInitialized(false);
      setLoadError(null);
      setRecoveryMode(false);
    }
  }, [navigate, projectId]);

  const handleUpdateTitle = useCallback(async (title: string) => {
    if (!project) return;
    try {
      await updateProjectTitle(title);
      toast.success("Project title updated successfully");
    } catch (error) {
      console.error("Error updating project title:", error);
      toast.error("Failed to update project title");
    }
  }, [project, updateProjectTitle]);

  // Create a new project with initial scenes
  const handleCreateNewProject = useCallback(async (): Promise<void> => {
    try {
      toast.info("Creating new project...");
      
      // Create a new project with initial scenes
      const newProjectId = await createProject(
        "New Project", 
        "A new Canvas project"
      );
      
      toast.success("New project created successfully");
      
      // Navigate to the new project if created
      if (newProjectId) {
        navigate(`/canvas/${newProjectId}`, { replace: true });
        setHasProjects(true);
        setShowHistory(false);
        
        // Add initial scenes to the project after navigation
        setTimeout(async () => {
          try {
            const initialScenes = generateInitialScenes();
            for (const scene of initialScenes) {
              await updateScene(scene.id, "script", scene.script);
              await updateScene(scene.id, "description", scene.description);
              await updateScene(scene.id, "imagePrompt", scene.imagePrompt);
            }
            // Refetch project data after adding scenes
            fetchProjectAndScenes();
          } catch (error) {
            console.error("Error setting up initial scenes:", error);
            toast.error("Could not set up initial scenes");
          }
        }, 500);
      }
    } catch (error) {
      console.error("Error creating new project:", error);
      toast.error("Failed to create new project");
      
      if (!recoveryMode) {
        enterRecoveryMode();
      }
    }
  }, [createProject, navigate, updateScene, fetchProjectAndScenes, recoveryMode, enterRecoveryMode]);

  // Check if we're on the root Canvas page with no project ID
  const isRootCanvas = !projectId;

  // If we have a project ID but project is not loaded yet, show loading indicator
  const isLoadingProject = !!projectId && isLoading;

  // Improved error handling for project not found
  const projectNotFound = !!projectId && !isLoading && !project && !canvasError;
  
  if (projectNotFound) {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-6 max-w-md p-6">
            <h1 className="text-3xl font-bold">Project Not Found</h1>
            <p className="text-muted-foreground">
              The project you're looking for doesn't exist or may have been deleted.
            </p>
            <div className="flex flex-col gap-2">
              <Button 
                size="lg" 
                onClick={handleCreateNewProject}
                className="flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Create New Project
              </Button>
              {hasProjects && (
                <Button
                  variant="outline"
                  onClick={handleToggleHistory}
                >
                  View Existing Projects
                </Button>
              )}
              <Button
                variant="link"
                onClick={() => navigate('/canvas')}
              >
                Go to Canvas Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {!isRootCanvas && (
        <CanvasHeader 
          project={project}
          onChatToggle={handleToggleChat}
          showChatButton={!showChat}
          onFullChatOpen={() => navigate('/multi-agent-chat')}
          onShowHistory={handleToggleHistory}
          onUpdateTitle={handleUpdateTitle}
        />
      )}
      
      {recoveryMode && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-amber-800 text-sm">
          Running in recovery mode - some features may be limited for stability.
          <Button 
            variant="link" 
            size="sm" 
            className="ml-2 text-amber-900" 
            onClick={() => setRecoveryMode(false)}
          >
            Exit Recovery Mode
          </Button>
        </div>
      )}
      
      <div className="flex-1 flex overflow-hidden">
        {showHistory ? (
          <ProjectHistory 
            projectId={projectId || ''}
            onBack={() => setShowHistory(false)}
            onSelectProject={handleSelectProject}
          />
        ) : isRootCanvas && !isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-6 max-w-md p-6">
              <h1 className="text-3xl font-bold">Welcome to Canvas</h1>
              <p className="text-muted-foreground">
                Create, manage, and visualize your video projects with Canvas. Start by creating a new project.
              </p>
              <Button 
                size="lg" 
                onClick={handleCreateNewProject}
                className="flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Create New Project
              </Button>
              {hasProjects && (
                <Button
                  variant="outline"
                  onClick={handleToggleHistory}
                  className="mt-2"
                >
                  View Existing Projects
                </Button>
              )}
            </div>
          </div>
        ) : isLoadingProject ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">Loading project...</p>
            </div>
          </div>
        ) : loadError ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md p-6">
              <h2 className="text-2xl font-bold text-red-500">Error Loading Project</h2>
              <p className="text-muted-foreground">{loadError}</p>
              <div className="flex flex-col gap-2">
                <Button onClick={handleRefreshProject}>Try Again</Button>
                <Button variant="outline" onClick={enterRecoveryMode}>
                  Enter Recovery Mode
                </Button>
                <Button variant="outline" onClick={() => setShowHistory(true)}>
                  Select Another Project
                </Button>
                <Button variant="link" onClick={() => navigate('/canvas')}>
                  Go to Canvas Home
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <main className="flex-1 overflow-auto">
            <CanvasWorkspace
              project={project}
              selectedScene={selectedScene}
              selectedSceneId={selectedSceneId}
              setSelectedSceneId={handleSceneSelect}
              addScene={handleSceneCreate}
              deleteScene={deleteScene}
              updateScene={updateScene}
              divideScriptToScenes={divideScriptToScenes}
              saveFullScript={saveFullScript}
              createNewProject={handleCreateNewProject}
              updateProjectTitle={updateProjectTitle}
              sceneLoading={sceneLoading}
            />
          </main>
        )}
        
        {showChat && projectId && (
          <div className="w-96 flex-none overflow-hidden border-l">
            <CanvasChat projectId={projectId} onClose={handleToggleChat} />
          </div>
        )}
        
        {!showChat && projectId && !showHistory && project && (
          <ChatToggleButton onClick={handleToggleChat} />
        )}
      </div>
      
      {/* Canvas-MultiAgent integration (invisible component) */}
      {projectId && selectedSceneId && (
        <AgentCanvasIntegration 
          projectId={projectId}
          sceneId={selectedSceneId}
        />
      )}
    </div>
  );
}

export default function Canvas() {
  const { projectId } = useParams();
  
  return (
    <ErrorBoundary
      fallback={
        <div className="p-6 space-y-4">
          <h2 className="text-xl font-bold text-red-500">Canvas encountered an error</h2>
          <p>We're sorry, but something went wrong while loading the Canvas editor.</p>
          <Button onClick={() => window.location.reload()}>Reload Page</Button>
        </div>
      }
    >
      <CanvasProvider projectId={projectId}>
        <CanvasContent />
      </CanvasProvider>
    </ErrorBoundary>
  );
}
