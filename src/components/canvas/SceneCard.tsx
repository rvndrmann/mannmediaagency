
import { CanvasScene } from "@/types/canvas";
import { cn } from "@/lib/utils";
import { FileText, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface SceneCardProps {
  scene: CanvasScene;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function SceneCard({ scene, isSelected, onSelect, onDelete }: SceneCardProps) {
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
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 shrink-0" />
        <span className="font-medium truncate">{scene.title || `Scene ${scene.order || ''}`}</span>
      </div>
      
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              className="text-destructive flex items-center"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
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
