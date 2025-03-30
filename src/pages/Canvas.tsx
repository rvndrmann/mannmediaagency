
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCanvas } from "@/hooks/use-canvas";
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

export default function Canvas() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const {
    project,
    scenes,
    selectedScene,
    selectedSceneId,
    setSelectedSceneId,
    loading: isLoading,
    sceneLoading,
    createProject,
    addScene,
    deleteScene,
    updateScene,
    divideScriptToScenes,
    saveFullScript,
    updateProjectTitle
  } = useCanvas(projectId);
  
  const { getOrCreateChatSession } = useChatSession();
  const [showChat, setShowChat] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [chatInitialized, setChatInitialized] = useState(false);
  const [hasProjects, setHasProjects] = useState<boolean | null>(null);

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

  // Initialize chat session when project loads
  useEffect(() => {
    if (projectId && !chatInitialized) {
      try {
        getOrCreateChatSession(projectId);
        setChatInitialized(true);
      } catch (error) {
        console.error("Error initializing chat session:", error);
      }
    }
  }, [projectId, getOrCreateChatSession, chatInitialized]);

  const handleSceneSelect = useCallback((sceneId: string) => {
    console.log("Selected scene:", sceneId);
    setSelectedSceneId(sceneId);
  }, [setSelectedSceneId]);

  const handleSceneCreate = async () => {
    try {
      await addScene();
      toast.success("Scene created successfully");
    } catch (error) {
      console.error("Error creating scene:", error);
      toast.error("Failed to create scene");
    }
  };

  const handleToggleChat = useCallback(() => {
    setShowChat(prev => !prev);
  }, []);

  const handleToggleHistory = useCallback(() => {
    setShowHistory(prev => !prev);
  }, []);

  const handleSelectProject = useCallback((selectedProjectId: string) => {
    navigate(`/canvas/${selectedProjectId}`);
    setShowHistory(false);
  }, [navigate]);

  const handleUpdateTitle = async (title: string) => {
    if (!project) return;
    try {
      await updateProjectTitle(title);
      toast.success("Project title updated successfully");
    } catch (error) {
      console.error("Error updating project title:", error);
      toast.error("Failed to update project title");
    }
  };

  // Wrapper for createProject that doesn't return anything
  const handleCreateNewProject = async (): Promise<void> => {
    try {
      // Create a new project with initial scenes
      const newProjectId = await createProject(
        "New Project", 
        "A new Canvas project"
      );
      
      // Add initial scenes to the project
      const initialScenes = generateInitialScenes();
      for (const scene of initialScenes) {
        await updateScene(scene.id, "script", scene.script);
        await updateScene(scene.id, "description", scene.description);
        await updateScene(scene.id, "imagePrompt", scene.imagePrompt);
      }
      
      toast.success("New project created successfully");
      
      // Navigate to the new project if created
      if (newProjectId) {
        navigate(`/canvas/${newProjectId}`);
        setHasProjects(true);
      }
    } catch (error) {
      console.error("Error creating new project:", error);
      toast.error("Failed to create new project");
    }
  };

  // Check if we're on the root Canvas page with no project ID
  const isRootCanvas = !projectId;

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
        
        {!showChat && projectId && !showHistory && (
          <ChatToggleButton onClick={handleToggleChat} />
        )}
      </div>
    </div>
  );
}
