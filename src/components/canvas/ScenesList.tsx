
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
import { useState, useCallback, memo } from "react";
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

// Memoize the component to prevent unnecessary rerenders
export const ScenesList = memo(function ScenesList({
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
  
  // Handle adding a scene with immediate visual feedback
  const handleAddScene = useCallback(async () => {
    if (isAddingScene) return; // Prevent multiple clicks
    
    setIsAddingScene(true);
    
    try {
      await onAddScene();
    } catch (err: any) {
      console.error("Error adding scene:", err);
    } finally {
      setIsAddingScene(false);
    }
  }, [isAddingScene, onAddScene]);
  
  // Optimized scene deletion
  const confirmDeleteScene = useCallback(async () => {
    if (!sceneToDelete) return;
    
    try {
      // Close dialog immediately for better UX
      const sceneId = sceneToDelete;
      setSceneToDelete(null);
      
      // Perform actual deletion
      await onDeleteScene(sceneId);
    } catch (error) {
      console.error("Error deleting scene:", error);
    }
  }, [sceneToDelete, onDeleteScene]);
  
  // Handle scene selection with no delay
  const handleSelectScene = useCallback((id: string) => {
    if (id === selectedSceneId) return;
    onSelectScene(id);
  }, [selectedSceneId, onSelectScene]);
  
  const handleCreateNewProject = useCallback(async () => {
    if (creatingProject) return;
    
    setCreatingProject(true);
    
    try {
      const newProjectId = await onCreateNewProject();
      return newProjectId;
    } catch (error) {
      console.error("Error creating project:", error);
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
            <SceneCard 
              key={scene.id}
              scene={scene} 
              isSelected={scene.id === selectedSceneId}
              onSelect={() => handleSelectScene(scene.id)}
              onDelete={() => setSceneToDelete(scene.id)}
              isPending={pendingOperations[scene.id] || false}
            />
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
            <AlertDialogAction onClick={confirmDeleteScene}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});
