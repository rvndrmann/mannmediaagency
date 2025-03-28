
import { CanvasScene } from "@/types/canvas";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SceneCardProps {
  scene: CanvasScene;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function SceneCard({ scene, isSelected, onSelect, onDelete }: SceneCardProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <div
      className={cn(
        "relative group cursor-pointer h-24 w-32 rounded-md overflow-hidden border border-border flex flex-col",
        isSelected && "ring-2 ring-primary"
      )}
      onClick={onSelect}
    >
      {scene.imageUrl ? (
        <div className="relative h-16 bg-muted">
          <img
            src={scene.imageUrl}
            alt={scene.title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="h-16 bg-muted flex items-center justify-center text-muted-foreground text-xs">
          No image
        </div>
      )}
      
      <div className="p-1 text-xs truncate bg-background flex-1 flex items-center">
        <span className="truncate">{scene.title}</span>
      </div>
      
      <Button
        variant="destructive"
        size="icon"
        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleDelete}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}
