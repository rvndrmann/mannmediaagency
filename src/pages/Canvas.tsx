
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CanvasWorkspace } from "@/components/canvas/CanvasWorkspace";
import { CanvasHeader } from "@/components/canvas/CanvasHeader";
import { CanvasEmptyState } from "@/components/canvas/CanvasEmptyState";
import { CanvasChat } from "@/components/canvas/CanvasChat";
import { ProjectHistory } from "@/components/canvas/ProjectHistory";
import { useCanvas } from "@/hooks/use-canvas";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useProjectContext } from "@/hooks/multi-agent/project-context";
import { useChatSession } from "@/contexts/ChatSessionContext";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function Canvas() {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const navigate = useNavigate();
  
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [shouldCreateProject, setShouldCreateProject] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Get project context
  const { 
    fetchAvailableProjects, 
    availableProjects, 
    hasLoadedProjects,
    setActiveProject 
  } = useProjectContext();
  
  // Get chat session context for shared history
  const { getOrCreateChatSession } = useChatSession();
  
  // Check if user is authenticated
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
          navigate("/auth");
        }
      } catch (err: any) {
        console.error("Auth error:", err);
        setAuthError(err.message || "Authentication error");
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();
  }, [navigate]);
  
  // Fetch available projects once we know user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchAvailableProjects();
    }
  }, [isAuthenticated, fetchAvailableProjects]);
  
  // Set active project in project context to ensure shared state
  useEffect(() => {
    if (projectId) {
      setActiveProject(projectId);
      
      // Also ensure a chat session exists for this project (for history syncing)
      getOrCreateChatSession(projectId);
    }
  }, [projectId, setActiveProject, getOrCreateChatSession]);
  
  // Redirect to latest project if no project ID is specified and we have projects
  useEffect(() => {
    if (
      !projectId && 
      isAuthenticated && 
      hasLoadedProjects && 
      availableProjects.length > 0
    ) {
      // Navigate to the most recent project
      navigate(`/canvas?projectId=${availableProjects[0].id}`);
    } else if (
      !projectId && 
      isAuthenticated && 
      hasLoadedProjects && 
      availableProjects.length === 0
    ) {
      // Show empty state to create a new project
      setShouldCreateProject(true);
    }
  }, [projectId, isAuthenticated, hasLoadedProjects, availableProjects, navigate]);

  const {
    project,
    loading,
    error,
    retryLoading,
    isRetrying,
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

  const handleCreateNewProject = async (title: string, description?: string) => {
    try {
      const newProjectId = await createProject(title, description);
      if (newProjectId) {
        navigate(`/canvas?projectId=${newProjectId}`);
        return newProjectId; // Return the ID to match expected return type
      }
      return ""; // Return empty string if creation failed
    } catch (err) {
      console.error("Failed to create new project:", err);
      toast.error("Failed to create new project");
      return ""; // Return empty string on error
    }
  };

  const toggleChat = () => {
    setShowChat(!showChat);
  };
  
  const toggleHistory = () => {
    setShowHistory(!showHistory);
  };
  
  const handleNavigateToChat = () => {
    // Navigate to the multi-agent chat page with project context
    navigate(`/multi-agent-chat?projectId=${projectId}`);
  };

  // Show authentication loading state
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-2 text-xl">Checking authentication...</p>
      </div>
    );
  }

  // Show authentication error
  if (authError && !isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Alert variant="destructive" className="mb-4 max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Error</AlertTitle>
          <AlertDescription>{authError}</AlertDescription>
        </Alert>
        <Button 
          onClick={() => navigate("/auth")}
          className="mt-4"
        >
          Go to Login
        </Button>
      </div>
    );
  }

  // Show loading state
  if (loading && !error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary mr-2" />
        <p className="text-xl">Loading canvas{isRetrying ? " (retrying)" : ""}...</p>
      </div>
    );
  }

  // Handle error state with retry option
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Alert variant="destructive" className="mb-4 max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Project</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="flex gap-4 mt-4">
          <Button 
            onClick={retryLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry Loading
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate("/")}
          >
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  // Show empty state if no project and shouldCreateProject is true
  if (shouldCreateProject && !project && isAuthenticated) {
    return <CanvasEmptyState onCreateProject={handleCreateNewProject} />;
  }
  
  // Show project history if no project ID and we're not explicitly creating one
  if (!projectId && !shouldCreateProject && isAuthenticated) {
    return (
      <ProjectHistory 
        projectId="" 
        onBack={() => setShouldCreateProject(true)}
        onSelectProject={(id) => navigate(`/canvas?projectId=${id}`)}
      />
    );
  }

  // Show project history view if toggled
  if (showHistory && project) {
    return (
      <ProjectHistory 
        projectId={project.id} 
        onBack={toggleHistory}
        onSelectProject={(id) => navigate(`/canvas?projectId=${id}`)}
      />
    );
  }

  // Main canvas UI
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
            createNewProject={handleCreateNewProject}
            updateProjectTitle={updateProjectTitle}
            onRetryLoading={retryLoading}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
