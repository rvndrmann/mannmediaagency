
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CanvasWorkspace } from "@/components/canvas/CanvasWorkspace";
import { CanvasHeader } from "@/components/canvas/CanvasHeader";
import { CanvasEmptyState } from "@/components/canvas/CanvasEmptyState";
import { CanvasChat } from "@/components/canvas/CanvasChat";
import { useCanvas } from "@/hooks/use-canvas";
import { Loader2, MessageSquare } from "lucide-react";
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
    saveFullScript
  } = useCanvas(projectId || undefined);

  // Create a new project if none is provided
  useEffect(() => {
    if (!loading && !projectId && isAuthenticated) {
      const createNewProject = async () => {
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
      
      createNewProject();
    }
  }, [loading, projectId, createProject, navigate, isAuthenticated]);

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

  // Show empty state if no project
  if (!project && isAuthenticated) {
    return <CanvasEmptyState onCreateProject={createProject} />;
  }

  // Main canvas UI
  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen overflow-hidden">
        <CanvasHeader 
          project={project}
          onChatToggle={toggleChat}
          showChatButton={true}
        />
        
        <div className="flex flex-1 overflow-hidden">
          {showChat && (
            <div className="w-[350px] flex-shrink-0">
              <CanvasChat onClose={toggleChat} />
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
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
