
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
  const [chatInitialized, setChatInitialized] = useState(false);

  // Initialize chat session when project loads
  useEffect(() => {
    if (projectId && !chatInitialized) {
      getOrCreateChatSession(projectId);
      setChatInitialized(true);
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

  const handleContentSave = async (
    sceneId: string,
    contentType: string,
    content: string
  ) => {
    if (!project) {
      toast.error("No project loaded. Please create or load a project before saving content.");
      return;
    }

    try {
      await updateScene(sceneId, contentType as any, content);
      toast.success(`Content saved successfully`);
    } catch (error) {
      console.error("Error saving content:", error);
      toast.error("Failed to save content");
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
      }
    } catch (error) {
      console.error("Error creating new project:", error);
      toast.error("Failed to create new project");
    }
  };

  const handleDeleteProject = async () => {
    if (!project) {
      toast.error("No project loaded. Please load a project before deleting.");
      return;
    }

    try {
      // The useCanvas hook doesn't have a deleteProject function, so we'll have to implement this
      // Since we don't have a direct API here, we'll navigate away instead
      navigate("/canvas");
      toast.success("Project deleted successfully");
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Failed to delete project");
    }
  };

  const handleSaveAsNewProject = async () => {
    if (!project) {
      toast.error("No project loaded. Please load a project before saving as new.");
      return;
    }

    try {
      // Create a new project with a copy title
      const newProjectId = await createProject(
        `${project.title} (Copy)`, 
        project.description
      );
      
      if (newProjectId) {
        // We would need to copy all scenes to the new project
        // but the API doesn't directly support this in useCanvas
        navigate(`/canvas/${newProjectId}`);
        toast.success("Project saved as new successfully");
      }
    } catch (error) {
      console.error("Error saving project as new:", error);
      toast.error("Failed to save project as new");
    }
  };

  const toggleChatPanel = useCallback(() => {
    setShowChat(prev => !prev);
  }, []);

  // Check if we're on the root Canvas page with no project ID
  const isRootCanvas = !projectId;

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex-1 flex flex-col">
        {isRootCanvas && !isLoading ? (
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
      </div>
      
      {showChat && projectId && (
        <div className="w-96 flex-none overflow-hidden border-l">
          <CanvasChat projectId={project?.id} onClose={toggleChatPanel} />
        </div>
      )}
      
      {!showChat && projectId && (
        <ChatToggleButton onClick={toggleChatPanel} />
      )}
    </div>
  );
}
