
import { CanvasScene } from "@/types/canvas";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2 } from "lucide-react";
import { SceneCard } from "./SceneCard";

interface CanvasTimelineProps {
  scenes: CanvasScene[];
  selectedSceneId: string | null;
  onSceneSelect: (id: string) => void;
  onAddScene: () => Promise<string | undefined>;
  onDeleteScene: (id: string) => Promise<void>;
}

export function CanvasTimeline({
  scenes,
  selectedSceneId,
  onSceneSelect,
  onAddScene,
  onDeleteScene
}: CanvasTimelineProps) {
  return (
    <div className="border-t p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium">Timeline</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onAddScene}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Scene
        </Button>
      </div>
      
      <ScrollArea className="max-h-[150px]">
        <div className="flex gap-2 pb-2">
          {scenes.map((scene) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              isSelected={scene.id === selectedSceneId}
              onSelect={() => onSceneSelect(scene.id)}
              onDelete={() => onDeleteScene(scene.id)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
