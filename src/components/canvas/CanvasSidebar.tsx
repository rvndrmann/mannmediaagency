
import { CanvasProject } from "@/types/canvas";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  ChevronRight,
  ChevronDown,
  Video,
  MoreVertical,
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from "@/components/ui/tooltip";
import clsx from "clsx";

interface CanvasSidebarProps {
  project: CanvasProject;
  selectedSceneId: string | null;
  setSelectedSceneId: (id: string) => void;
  addScene: () => Promise<string | undefined>;
  deleteScene: (id: string) => Promise<void>;
  collapsed: boolean;
}

export function CanvasSidebar({
  project,
  selectedSceneId,
  setSelectedSceneId,
  addScene,
  deleteScene,
  collapsed,
}: CanvasSidebarProps) {
  const handleAddScene = async () => {
    await addScene();
  };

  const handleDeleteScene = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteScene(id);
  };

  if (collapsed) {
    return (
      <div className="w-14 border-r bg-slate-50 dark:bg-slate-900 flex flex-col">
        <div className="p-2 border-b">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-full"
                  onClick={handleAddScene}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Add new scene</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {project.scenes.map((scene) => (
              <TooltipProvider key={scene.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={selectedSceneId === scene.id ? "secondary" : "ghost"}
                      size="icon"
                      className="w-full"
                      onClick={() => setSelectedSceneId(scene.id)}
                    >
                      <Video className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{scene.title}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="w-64 border-r bg-slate-50 dark:bg-slate-900 flex flex-col">
      <div className="p-2 border-b flex justify-between items-center">
        <h3 className="font-medium">Scenes</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleAddScene}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {project.scenes.map((scene) => (
            <div
              key={scene.id}
              className={clsx(
                "flex items-center justify-between p-2 rounded-md cursor-pointer group",
                selectedSceneId === scene.id
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-slate-200 dark:hover:bg-slate-800"
              )}
              onClick={() => setSelectedSceneId(scene.id)}
            >
              <div className="flex items-center">
                {selectedSceneId === scene.id ? (
                  <ChevronDown className="h-4 w-4 mr-2 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 mr-2 shrink-0" />
                )}
                <span className="truncate">{scene.title}</span>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Rename</DropdownMenuItem>
                  <DropdownMenuItem>Duplicate</DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={(e) => handleDeleteScene(scene.id, e)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
