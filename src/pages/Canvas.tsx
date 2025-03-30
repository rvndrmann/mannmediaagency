import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProjectContext } from "@/hooks/multi-agent/project-context";
import { CanvasWorkspace } from "@/components/canvas/CanvasWorkspace";
import { CanvasChat } from "@/components/canvas/CanvasChat";
import { generateInitialScenes } from "@/data/scene-templates";
import { toast } from "sonner";
import { useToast } from "@/components/ui/use-toast";
import { useChatSession } from "@/contexts/ChatSessionContext";

export default function Canvas() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    activeProject,
    projectDetails,
    scenes,
    scriptContent,
    loadProject,
    saveProject,
    createScene,
    updateScene,
    deleteScene,
    updateProjectDetails,
    deleteProject: deleteProjectContext,
  } = useProjectContext({ initialProjectId: projectId || undefined });
  
  const { getOrCreateChatSession } = useChatSession();

  const [isLoading, setIsLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (projectId) {
        await loadProject(projectId);
      } else {
        // If no projectId, create a new project
        const newProjectId = await handleCreateNewProject();
        if (newProjectId) {
          navigate(`/canvas/${newProjectId}`);
        }
      }
      setIsLoading(false);
    };

    init();
  }, [projectId, loadProject, navigate]);

  const handleSceneSelect = (sceneId: string) => {
    console.log("Selected scene:", sceneId);
  };

  const handleSceneCreate = async () => {
    if (!activeProject) {
      toast({
        title: "No project loaded",
        description: "Please create or load a project before creating scenes.",
      });
      return;
    }

    const newScene = await createScene({
      projectId: activeProject,
      sceneData: {
        title: `Scene ${scenes.length + 1}`,
        description: "Write a short description of the scene here.",
        script: "Write the script for the scene here.",
        imagePrompt: "Write an image prompt for the scene here.",
      },
    });

    if (newScene) {
      toast({
        title: "Scene created",
        description: `Scene "${newScene.title}" created successfully.`,
      });
    }
  };

  const handleContentSave = async (
    sceneId: string,
    contentType: string,
    content: string
  ) => {
    if (!activeProject) {
      toast({
        title: "No project loaded",
        description: "Please create or load a project before saving content.",
      });
      return;
    }

    const updatedSceneData = { ...scenes.find((s) => s.id === sceneId) };

    switch (contentType) {
      case "script":
        updatedSceneData.script = content;
        break;
      case "description":
        updatedSceneData.description = content;
        break;
      case "imagePrompt":
        updatedSceneData.imagePrompt = content;
        break;
      default:
        console.warn("Unknown content type:", contentType);
        return;
    }

    await updateScene({
      projectId: activeProject,
      sceneId: sceneId,
      sceneData: updatedSceneData,
    });

    toast({
      title: "Content saved",
      description: `Content saved to scene "${updatedSceneData.title}" successfully.`,
    });
  };

  const handleCreateNewProject = async (): Promise<string | undefined> => {
    setIsLoading(true);
    try {
      // Generate initial scenes
      const initialScenes = generateInitialScenes();

      // Create a new project with initial scenes
      const newProjectId = await saveProject({
        title: "New Project",
        description: "A new Canvas project",
        scenes: initialScenes,
      });

      if (newProjectId) {
        toast({
          title: "Project created",
          description: "New project created successfully.",
        });
        return newProjectId;
      } else {
        toast({
          title: "Error creating project",
          description: "Failed to create new project.",
          variant: "destructive",
        });
        return undefined;
      }
    } catch (error) {
      console.error("Error creating new project:", error);
      toast({
        title: "Error creating project",
        description: "Failed to create new project.",
        variant: "destructive",
      });
      return undefined;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!activeProject) {
      toast({
        title: "No project loaded",
        description: "Please load a project before deleting.",
      });
      return;
    }

    setIsLoading(true);
    try {
      await deleteProjectContext(activeProject);
      toast({
        title: "Project deleted",
        description: "Project deleted successfully.",
      });
      navigate("/canvas"); // Navigate to the projects list or a default page
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({
        title: "Error deleting project",
        description: "Failed to delete project.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAsNewProject = async () => {
    if (!activeProject) {
      toast({
        title: "No project loaded",
        description: "Please load a project before saving as new.",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Fetch the existing project details
      const existingProject = projectDetails;

      if (!existingProject) {
        toast({
          title: "Error saving project",
          description: "Could not retrieve existing project details.",
          variant: "destructive",
        });
        return;
      }

      // Create a new project with the existing project's data
      const newProjectId = await saveProject({
        ...existingProject,
        title: `${existingProject.title} (Copy)`,
      });

      if (newProjectId) {
        toast({
          title: "Project saved as new",
          description: "Project saved as a new project successfully.",
        });
        navigate(`/canvas/${newProjectId}`); // Navigate to the new project
      } else {
        toast({
          title: "Error saving project",
          description: "Failed to save project as new.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving project as new:", error);
      toast({
        title: "Error saving project",
        description: "Failed to save project as new.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleChatPanel = () => {
    setShowChat(!showChat);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex-1 flex flex-col">
        <main className="flex-1 overflow-auto">
          <CanvasWorkspace
            projectId={activeProject}
            scenes={scenes}
            scriptContent={scriptContent}
            onSceneSelect={handleSceneSelect}
            onSceneCreate={handleSceneCreate}
            onContentSave={handleContentSave}
            setIsLoading={setIsLoading}
            isLoading={isLoading}
            createNewProject={() => handleCreateNewProject().then(() => {})} // Convert Promise<string> to Promise<void>
            deleteProject={handleDeleteProject}
            saveAsNewProject={handleSaveAsNewProject}
            toggleChatPanel={toggleChatPanel}
            showChat={showChat}
          />
        </main>
      </div>
      {showChat && (
        <div className="w-96 flex-none overflow-hidden border-l">
          <CanvasChat projectId={activeProject} onClose={toggleChatPanel} />
        </div>
      )}
    </div>
  );
}
