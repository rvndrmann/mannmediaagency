
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
import { useState } from "react";
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
  const [loadingSceneId, setLoadingSceneId] = useState<string | null>(null);
  const [isDeletingScene, setIsDeletingScene] = useState(false);
  
  const handleAddScene = async () => {
    if (isAddingScene) return; // Prevent multiple clicks
    
    setIsAddingScene(true);
    try {
      await onAddScene();
      // We don't need to select the new scene as the parent component will handle it
    } catch (error) {
      console.error("Error adding scene:", error);
    } finally {
      // Reduce the minimum loading time to improve perceived performance
      setTimeout(() => {
        setIsAddingScene(false);
      }, 300);
    }
  };
  
  const confirmDeleteScene = async () => {
    if (sceneToDelete && !isDeletingScene) {
      setIsDeletingScene(true);
      try {
        await onDeleteScene(sceneToDelete);
      } catch (error) {
        console.error("Error deleting scene:", error);
      } finally {
        // Reduce the minimum loading time to improve perceived performance
        setTimeout(() => {
          setIsDeletingScene(false);
          setSceneToDelete(null);
        }, 300);
      }
    }
  };
  
  const handleSelectScene = (id: string) => {
    if (id !== selectedSceneId && id !== loadingSceneId) {
      setLoadingSceneId(id);
      onSelectScene(id);
      // Reduce the minimum loading time to improve perceived performance
      setTimeout(() => {
        setLoadingSceneId(null);
      }, 300);
    }
  };
  
  return (
    <div className="w-72 border-r bg-background flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">Project Content</h3>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onCreateNewProject}
          >
            <PlusCircle className="h-4 w-4 mr-1" />
            New
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
              />
              {loadingSceneId === scene.id && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-md">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              )}
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
              disabled={isDeletingScene}
            >
              {isDeletingScene ? (
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
