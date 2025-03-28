
import { CanvasScene } from "@/types/canvas";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus,
  FileText,
  Layers,
  PlusCircle,
  Trash2
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
  onAddScene: () => Promise<string | undefined>;
  onDeleteScene: (id: string) => Promise<void>;
  onSwitchView: () => void;
  currentView: "scenes" | "script";
  onCreateNewProject: () => Promise<void>;
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
  
  const handleAddScene = async () => {
    setIsAddingScene(true);
    try {
      const newSceneId = await onAddScene();
      if (newSceneId) {
        onSelectScene(newSceneId);
      }
    } finally {
      setIsAddingScene(false);
    }
  };
  
  const confirmDeleteScene = async () => {
    if (sceneToDelete) {
      await onDeleteScene(sceneToDelete);
      setSceneToDelete(null);
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
            <SceneCard 
              key={scene.id} 
              scene={scene} 
              isSelected={scene.id === selectedSceneId}
              onClick={() => onSelectScene(scene.id)}
              onDelete={() => setSceneToDelete(scene.id)}
            />
          ))}
          
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={handleAddScene}
            disabled={isAddingScene}
          >
            <Plus className="h-4 w-4 mr-2" />
            {isAddingScene ? "Adding..." : "Add Scene"}
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
}
