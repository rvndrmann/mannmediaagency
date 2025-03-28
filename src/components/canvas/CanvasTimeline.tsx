
import { useState } from "react";
import { CanvasScene } from "@/types/canvas";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2, ChevronRight } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  onDeleteScene,
}: CanvasTimelineProps) {
  const [isAdding, setIsAdding] = useState(false);
  
  const handleAddScene = async () => {
    setIsAdding(true);
    try {
      await onAddScene();
    } finally {
      setIsAdding(false);
    }
  };
  
  const handleDeleteScene = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this scene?")) {
      await onDeleteScene(id);
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 p-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">Timeline</h3>
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={handleAddScene}
          disabled={isAdding}
          className="h-8 w-8 p-0"
        >
          <PlusCircle className="h-4 w-4" />
          <span className="sr-only">Add scene</span>
        </Button>
      </div>
      
      <ScrollArea className="h-24">
        <div className="flex space-x-2">
          {scenes.map((scene) => (
            <Tooltip key={scene.id}>
              <TooltipTrigger asChild>
                <div
                  className={`
                    flex-shrink-0 w-20 h-16 rounded-md overflow-hidden cursor-pointer
                    border-2 transition-all
                    ${selectedSceneId === scene.id 
                      ? "border-primary ring-2 ring-primary/20" 
                      : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"}
                  `}
                  onClick={() => onSceneSelect(scene.id)}
                >
                  {scene.imageUrl ? (
                    <img
                      src={scene.imageUrl}
                      alt={scene.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {scene.title}
                      </span>
                    </div>
                  )}
                  
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-0 right-0 h-5 w-5 p-0 opacity-0 hover:opacity-100"
                    onClick={(e) => handleDeleteScene(scene.id, e)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                {scene.title}
              </TooltipContent>
            </Tooltip>
          ))}
          
          <Button
            variant="outline"
            className="flex-shrink-0 w-20 h-16 flex items-center justify-center border-dashed"
            onClick={handleAddScene}
            disabled={isAdding}
          >
            <PlusCircle className="h-5 w-5 mr-1" />
            <span className="text-xs">Add</span>
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}
