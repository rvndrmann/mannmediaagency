
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CanvasWorkspace } from "@/components/canvas/CanvasWorkspace";
import { CanvasHeader } from "@/components/canvas/CanvasHeader";
import { CanvasEmptyState } from "@/components/canvas/CanvasEmptyState";
import { CanvasChat } from "@/components/canvas/CanvasChat";
import { ProjectHistory } from "@/components/canvas/ProjectHistory";
import { useCanvas } from "@/hooks/use-canvas";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useProjectContext } from "@/hooks/multi-agent/project-context";
import { useChatSession } from "@/contexts/ChatSessionContext";

export default function Canvas() {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const navigate = useNavigate();
  
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [shouldCreateProject, setShouldCreateProject] = useState(false);
  
  const { 
    fetchAvailableProjects, 
    availableProjects, 
    hasLoadedProjects,
    setActiveProject 
  } = useProjectContext();
  
  const { getOrCreateChatSession } = useChatSession();
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setIsAuthenticated(!!data.session);
        
        if (!data.session) {
          toast.error("Please log in to access the Canvas");
          navigate("/auth");
        }
      } catch (error) {
        console.error("Auth error:", error);
        setIsAuthenticated(false);
        navigate("/auth");
      }
    };
    
    checkAuth();
  }, [navigate]);
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchAvailableProjects();
    }
  }, [isAuthenticated, fetchAvailableProjects]);
  
  useEffect(() => {
    if (projectId) {
      setActiveProject(projectId);
      getOrCreateChatSession(projectId);
    }
  }, [projectId, setActiveProject, getOrCreateChatSession]);
  
  useEffect(() => {
    if (
      !projectId && 
      isAuthenticated && 
      hasLoadedProjects
    ) {
      if (availableProjects.length > 0) {
        navigate(`/canvas?projectId=${availableProjects[0].id}`);
      } else {
        setShouldCreateProject(true);
      }
    }
  }, [projectId, isAuthenticated, hasLoadedProjects, availableProjects, navigate]);

  const {
    project,
    loading,
    error,
    selectedScene,
    selectedSceneId,
    setSelectedSceneId,
    createProject,
    addScene,
    deleteScene,
    updateScene,
    divideScriptToScenes,
    saveFullScript,
    updateProjectTitle,
    sceneLoading
  } = useCanvas(projectId || undefined);

  const handleCreateNewProject = useCallback(async (title: string, description?: string) => {
    try {
      const newProjectId = await createProject(title, description);
      if (newProjectId) {
        navigate(`/canvas?projectId=${newProjectId}`);
      }
      return newProjectId || "";
    } catch (err) {
      console.error("Failed to create new project:", err);
      toast.error("Failed to create new project");
      return "";
    }
  }, [createProject, navigate]);

  const handleSaveProject = async (): Promise<void> => {
    try {
      // Just save the current state of the project - no special behavior needed
      toast.success("Project saved");
    } catch (error) {
      console.error("Error saving project:", error);
      toast.error("Failed to save project");
    }
  };

  const toggleChat = useCallback(() => {
    setShowChat(prev => !prev);
  }, []);
  
  const toggleHistory = useCallback(() => {
    setShowHistory(prev => !prev);
  }, []);
  
  const handleNavigateToChat = useCallback(() => {
    navigate(`/multi-agent-chat?projectId=${projectId}`);
  }, [navigate, projectId]);

  if (loading || isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-2 text-xl">Loading canvas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-xl text-red-500 mb-4">{error}</p>
        <Button 
          onClick={() => navigate("/")}
        >
          Return to Home
        </Button>
      </div>
    );
  }

  if (shouldCreateProject && !project && isAuthenticated) {
    return <CanvasEmptyState onCreateProject={handleCreateNewProject} />;
  }
  
  if (!projectId && !shouldCreateProject && isAuthenticated) {
    return (
      <ProjectHistory 
        projectId="" 
        onBack={() => setShouldCreateProject(true)}
        onSelectProject={(id) => navigate(`/canvas?projectId=${id}`)}
      />
    );
  }

  if (showHistory && project) {
    return (
      <ProjectHistory 
        projectId={project.id} 
        onBack={toggleHistory}
        onSelectProject={(id) => navigate(`/canvas?projectId=${id}`)}
      />
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen overflow-hidden">
        <CanvasHeader 
          project={project}
          onChatToggle={toggleChat}
          showChatButton={true}
          onFullChatOpen={handleNavigateToChat}
          onShowHistory={toggleHistory}
          onUpdateTitle={updateProjectTitle}
        />
        
        <div className="flex flex-1 overflow-hidden">
          {showChat && project && (
            <div className="w-[450px] flex-shrink-0 border-r">
              <CanvasChat onClose={toggleChat} projectId={project.id} />
            </div>
          )}
          
          <CanvasWorkspace 
            project={project}
            selectedScene={selectedScene}
            selectedSceneId={selectedSceneId}
            setSelectedSceneId={setSelectedSceneId}
            addScene={addScene}
            deleteScene={deleteScene}
            updateScene={updateScene}
            divideScriptToScenes={divideScriptToScenes}
            saveFullScript={saveFullScript}
            createNewProject={async (title: string, description?: string) => {
              // Convert the Promise<string> to Promise<void>
              await handleCreateNewProject(title, description);
            }}
            updateProjectTitle={updateProjectTitle}
            sceneLoading={sceneLoading}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
