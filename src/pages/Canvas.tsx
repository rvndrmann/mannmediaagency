
import { useState, useEffect } from "react";
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

export default function Canvas() {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const navigate = useNavigate();
  
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [shouldCreateProject, setShouldCreateProject] = useState(false);
  
  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!data.session);
      
      if (!data.session) {
        toast.error("Please log in to access the Canvas");
        navigate("/auth");
      }
    };
    
    checkAuth();
  }, [navigate]);
  
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
    updateProjectTitle
  } = useCanvas(projectId || undefined);

  // Do not auto-create project, just set the shouldCreateProject flag to true
  // if we don't have a projectId and we're authenticated
  useEffect(() => {
    if (!loading && !projectId && isAuthenticated) {
      setShouldCreateProject(true);
    }
  }, [loading, projectId, isAuthenticated]);

  const handleCreateNewProject = async () => {
    try {
      const newProjectId = await createProject("New Video Project");
      if (newProjectId) {
        navigate(`/canvas?projectId=${newProjectId}`);
      }
    } catch (err) {
      console.error("Failed to create new project:", err);
      toast.error("Failed to create new project");
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

  // Show loading state
  if (loading || isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-2 text-xl">Loading canvas...</p>
      </div>
    );
  }

  // Handle error state
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

  // Show empty state if no project and shouldCreateProject is true
  if (shouldCreateProject && !project && isAuthenticated) {
    return <CanvasEmptyState onCreateProject={createProject} />;
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
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
