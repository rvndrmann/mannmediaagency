
import { CanvasScene } from "@/types/canvas";
import { cn } from "@/lib/utils";
import { FileText, MoreVertical, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export interface SceneCardProps {
  scene: CanvasScene;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function SceneCard({ scene, isSelected, onSelect, onDelete }: SceneCardProps) {
  // Format a short preview of the content
  const getContentPreview = (content?: string) => {
    if (!content) return "No content";
    return content.length > 40 ? content.substring(0, 40) + "..." : content;
  };
  
  return (
    <div 
      className={cn(
        "p-3 border rounded-md cursor-pointer transition-colors group relative",
        isSelected 
          ? "bg-primary/10 border-primary/40 text-primary" 
          : "hover:bg-background/80 border-border"
      )}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 mb-1">
        <FileText className="h-4 w-4 shrink-0" />
        <span className="font-medium truncate">{scene.title || `Scene ${scene.scene_order || scene.sceneOrder || ''}`}</span>
      </div>
      
      <p className="text-xs opacity-80 truncate">
        {getContentPreview(scene.voice_over_text || scene.voiceOverText || scene.script)}
      </p>
      
      <div className="flex justify-between items-center mt-2 text-xs">
        <span className={cn(
          "px-1.5 py-0.5 rounded-sm text-xs",
          (scene.image_prompt || scene.imagePrompt) ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : 
                             "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400"
        )}>
          {(scene.image_prompt || scene.imagePrompt) ? "Has image prompt" : "No image prompt"}
        </span>
      </div>
      
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-600 dark:text-red-400"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this scene?')) {
                  onDelete();
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
