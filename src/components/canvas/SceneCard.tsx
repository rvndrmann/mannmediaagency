
import { CanvasScene } from "@/types/canvas";
import { Check, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SceneCardProps {
  scene: CanvasScene;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  isPending?: boolean;
}

export function SceneCard({ 
  scene, 
  isSelected, 
  onSelect, 
  onDelete,
  isPending = false
}: SceneCardProps) {
  return (
    <div 
      className={`border rounded-md p-3 cursor-pointer transition-colors ${
        isSelected 
          ? 'bg-primary/10 border-primary/50' 
          : 'bg-card hover:bg-accent/50'
      } ${isPending ? 'opacity-60' : ''}`}
      onClick={onSelect}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          {isPending ? (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          ) : isSelected ? (
            <Check className="h-4 w-4 text-primary" />
          ) : (
            <div className="h-4 w-4 rounded-full border border-muted-foreground/30"></div>
          )}
          <span className="font-medium">{scene.title}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          disabled={isPending}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      
      {scene.description && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
          {scene.description}
        </p>
      )}
      
      <div className="flex mt-2 gap-1 flex-wrap">
        {scene.script && (
          <span className="text-[10px] bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded">Script</span>
        )}
        {scene.imagePrompt && (
          <span className="text-[10px] bg-purple-500/10 text-purple-500 px-1.5 py-0.5 rounded">Image</span>
        )}
        {scene.imageUrl && (
          <span className="text-[10px] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded">Generated</span>
        )}
        {scene.voiceOverText && (
          <span className="text-[10px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded">Voice</span>
        )}
      </div>
    </div>
  );
}
