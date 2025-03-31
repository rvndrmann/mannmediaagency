
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
import { MCPProvider } from "@/contexts/MCPContext";
import { CanvasErrorBoundary } from "@/components/canvas/CanvasErrorBoundary";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function Canvas() {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const navigate = useNavigate();
  
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [shouldCreateProject, setShouldCreateProject] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const { 
    fetchAvailableProjects, 
    availableProjects, 
    hasLoadedProjects,
    setActiveProject 
  } = useProjectContext();
  
  const { getOrCreateChatSession } = useChatSession();
  
  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        setIsAuthenticated(!!data.session);
        
        if (!data.session) {
          setAuthError("Please log in to access the Canvas");
          toast.error("Please log in to access the Canvas");
        }
      } catch (err) {
        console.error("Auth check error:", err);
        setAuthError("Authentication error. Please try refreshing the page.");
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();
  }, [navigate]);
  
  // Fetch projects when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      try {
        fetchAvailableProjects();
      } catch (error) {
        console.error("Error fetching projects:", error);
        toast.error("Failed to load your projects");
      }
    }
  }, [isAuthenticated, fetchAvailableProjects]);
  
  // Set active project when projectId changes
  useEffect(() => {
    if (projectId) {
      setActiveProject(projectId);
      
      // Create or get chat session for this project
      try {
        getOrCreateChatSession(projectId);
      } catch (error) {
        console.error("Error setting up chat session:", error);
      }
    }
  }, [projectId, setActiveProject, getOrCreateChatSession]);
  
  // Handle project selection logic
  useEffect(() => {
    if (
      !projectId && 
      isAuthenticated && 
      hasLoadedProjects && 
      availableProjects.length > 0
    ) {
      // Navigate to first project if no project is selected
      navigate(`/canvas?projectId=${availableProjects[0].id}`);
    } else if (
      !projectId && 
      isAuthenticated && 
      hasLoadedProjects && 
      availableProjects.length === 0
    ) {
      setShouldCreateProject(true);
    }
  }, [projectId, isAuthenticated, hasLoadedProjects, availableProjects, navigate]);

  const {
    project,
    loading: canvasLoading,
    error: canvasError,
    selectedScene,
    selectedSceneId,
    setSelectedSceneId,
    createProject,
    addScene,
    deleteScene,
    updateScene,
    divideScriptToScenes,
    saveFullScript,
    updateProjectTitle
  } = useCanvas(projectId || undefined);

  const handleCreateNewProject = useCallback(async (title: string, description?: string) => {
    try {
      const newProjectId = await createProject(title, description);
      if (newProjectId) {
        navigate(`/canvas?projectId=${newProjectId}`);
        return newProjectId;
      }
      return "";
    } catch (err) {
      console.error("Failed to create new project:", err);
      toast.error("Failed to create new project");
      return "";
    }
  }, [createProject, navigate]);

  const toggleChat = useCallback(() => {
    setShowChat(!showChat);
  }, [showChat]);
  
  const toggleHistory = useCallback(() => {
    setShowHistory(!showHistory);
  }, [showHistory]);
  
  const handleNavigateToChat = useCallback(() => {
    navigate(`/multi-agent-chat?projectId=${projectId}`);
  }, [navigate, projectId]);

  // Show loading state
  if (canvasLoading || isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-2 text-xl">Loading canvas...</p>
      </div>
    );
  }

  // Show authentication error
  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Alert variant="destructive" className="max-w-md mb-4">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertTitle>Authentication Error</AlertTitle>
          <AlertDescription>{authError}</AlertDescription>
        </Alert>
        <Button 
          onClick={() => navigate("/auth/login")}
          className="mr-2"
        >
          Log In
        </Button>
        <Button 
          variant="outline"
          onClick={() => navigate("/")}
        >
          Return to Home
        </Button>
      </div>
    );
  }

  // Show canvas error
  if (canvasError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Alert variant="destructive" className="max-w-md mb-4">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertTitle>Canvas Error</AlertTitle>
          <AlertDescription>{canvasError}</AlertDescription>
        </Alert>
        <Button 
          onClick={() => navigate("/")}
        >
          Return to Home
        </Button>
      </div>
    );
  }

  // Show empty state or project history
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

  // Main canvas view
  return (
    <TooltipProvider>
      <MCPProvider projectId={projectId || undefined}>
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
                <CanvasErrorBoundary>
                  <CanvasChat onClose={toggleChat} projectId={project.id} />
                </CanvasErrorBoundary>
              </div>
            )}
            
            <CanvasErrorBoundary>
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
                createNewProject={handleCreateNewProject}
                updateProjectTitle={updateProjectTitle}
              />
            </CanvasErrorBoundary>
          </div>
        </div>
      </MCPProvider>
    </TooltipProvider>
  );
}
