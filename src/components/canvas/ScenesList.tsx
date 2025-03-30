
import { CanvasScene } from "@/types/canvas";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus,
  FileText,
  Layers,
  PlusCircle,
  Trash2,
  Loader2
} from "lucide-react";
import { SceneCard } from "./SceneCard";
import { useState, useCallback } from "react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface ScenesListProps {
  scenes: CanvasScene[];
  selectedSceneId: string | null;
  onSelectScene: (id: string) => void;
  onAddScene: () => Promise<void>;
  onDeleteScene: (id: string) => Promise<void>;
  onSwitchView: () => void;
  currentView: "scenes" | "script";
  onCreateNewProject: () => Promise<string>;
}

export function ScenesList({
  scenes,
  selectedSceneId,
  onSelectScene,
  onAddScene,
  onDeleteScene,
  onSwitchView,
  currentView,
  onCreateNewProject
}: ScenesListProps) {
  const [sceneToDelete, setSceneToDelete] = useState<string | null>(null);
  const [isAddingScene, setIsAddingScene] = useState(false);
  const [pendingOperations, setPendingOperations] = useState<Record<string, boolean>>({});
  const [creatingProject, setCreatingProject] = useState(false);
  
  // Optimized scene addition
  const handleAddScene = useCallback(async () => {
    if (isAddingScene) return; // Prevent multiple clicks
    
    setIsAddingScene(true);
    // Show immediate feedback to user
    toast.loading("Adding new scene...", { id: "add-scene" });
    
    try {
      // Optimistic UI update - add a temporary scene
      const tempId = `temp-${Date.now()}`;
      const tempScene: CanvasScene = {
        id: tempId,
        title: `Scene ${scenes.length + 1}`,
        script: "",
        imagePrompt: "",
        description: "",
        imageUrl: "",
        videoUrl: "",
        productImageUrl: "",
        voiceOverUrl: "",
        backgroundMusicUrl: "",
        voiceOverText: "",
        order: scenes.length + 1,
        projectId: scenes[0]?.projectId || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        duration: null
      };
      
      // Call the actual function
      await onAddScene();
      toast.success("Scene added successfully", { id: "add-scene" });
    } catch (error) {
      console.error("Error adding scene:", error);
      toast.error("Failed to add scene", { id: "add-scene" });
    } finally {
      // Minimal loading feedback (200ms) to avoid UI flicker
      setTimeout(() => {
        setIsAddingScene(false);
      }, 200);
    }
  }, [isAddingScene, onAddScene, scenes]);
  
  // Optimized scene deletion
  const confirmDeleteScene = useCallback(async () => {
    if (!sceneToDelete || pendingOperations[sceneToDelete]) return;
    
    // Mark this scene as being deleted
    setPendingOperations(prev => ({ ...prev, [sceneToDelete]: true }));
    
    // Show instant feedback
    toast.loading("Deleting scene...", { id: `delete-${sceneToDelete}` });
    
    try {
      // Close dialog immediately for better UX
      setSceneToDelete(null);
      
      // Perform actual deletion
      await onDeleteScene(sceneToDelete);
      toast.success("Scene deleted", { id: `delete-${sceneToDelete}` });
    } catch (error) {
      console.error("Error deleting scene:", error);
      toast.error("Failed to delete scene", { id: `delete-${sceneToDelete}` });
    } finally {
      // Remove from pending operations
      setPendingOperations(prev => {
        const updated = { ...prev };
        delete updated[sceneToDelete];
        return updated;
      });
    }
  }, [sceneToDelete, pendingOperations, onDeleteScene]);
  
  // Optimized scene selection 
  const handleSelectScene = useCallback((id: string) => {
    if (id === selectedSceneId || pendingOperations[id]) return;
    
    // Mark this scene as pending selection
    setPendingOperations(prev => ({ ...prev, [id]: true }));
    
    // Show minimal loading feedback
    onSelectScene(id);
    
    // Clear pending status after a short delay
    setTimeout(() => {
      setPendingOperations(prev => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    }, 200);
  }, [selectedSceneId, pendingOperations, onSelectScene]);
  
  // Handle new project creation with optimistic feedback
  const handleCreateNewProject = useCallback(async () => {
    if (creatingProject) return;
    
    setCreatingProject(true);
    toast.loading("Creating new project...", { id: "create-project" });
    
    try {
      const newProjectId = await onCreateNewProject();
      toast.success("Project created successfully", { id: "create-project" });
      return newProjectId;
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Failed to create project", { id: "create-project" });
    } finally {
      setCreatingProject(false);
    }
  }, [creatingProject, onCreateNewProject]);
  
  return (
    <div className="w-72 border-r bg-background flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">Project Content</h3>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleCreateNewProject}
            disabled={creatingProject}
          >
            {creatingProject ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <PlusCircle className="h-4 w-4 mr-1" />
                New
              </>
            )}
          </Button>
        </div>
        <div className="flex space-x-1">
          <Button 
            variant={currentView === "scenes" ? "default" : "outline"} 
            size="sm" 
            className="flex-1"
            onClick={() => currentView !== "scenes" && onSwitchView()}
          >
            <Layers className="h-4 w-4 mr-2" />
            Scenes
          </Button>
          <Button 
            variant={currentView === "script" ? "default" : "outline"} 
            size="sm" 
            className="flex-1"
            onClick={() => currentView !== "script" && onSwitchView()}
          >
            <FileText className="h-4 w-4 mr-2" />
            Script
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {scenes.map((scene) => (
            <div key={scene.id} className="relative">
              <SceneCard 
                scene={scene} 
                isSelected={scene.id === selectedSceneId}
                onSelect={() => handleSelectScene(scene.id)}
                onDelete={() => setSceneToDelete(scene.id)}
                isPending={pendingOperations[scene.id] || false}
              />
            </div>
          ))}
          
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={handleAddScene}
            disabled={isAddingScene}
          >
            {isAddingScene ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Scene
              </>
            )}
          </Button>
        </div>
      </ScrollArea>
      
      <AlertDialog open={!!sceneToDelete} onOpenChange={(open) => !open && setSceneToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the scene and all its content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteScene}
              disabled={!!sceneToDelete && pendingOperations[sceneToDelete]}
            >
              {!!sceneToDelete && pendingOperations[sceneToDelete] ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
