
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  FolderOpen, 
  Video, 
  Image as ImageIcon, 
  Music, 
  FileText,
  Calendar,
  User,
  Settings,
  MoreVertical,
  Trash2,
  Edit
} from "lucide-react";
import { SceneCard } from "./SceneCard";
import { CanvasProject, CanvasScene } from "@/types/canvas";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CanvasSidebarProps {
  project: CanvasProject;
  scenes: CanvasScene[];
  selectedScene: CanvasScene | null;
  onSceneSelect: (scene: CanvasScene) => void;
  onSceneDelete: (sceneId: string) => void;
  onAddScene: () => void;
  onProjectUpdate: (projectId: string, updates: Partial<CanvasProject>) => void;
}

export function CanvasSidebar({
  project,
  scenes,
  selectedScene,
  onSceneSelect,
  onSceneDelete,
  onAddScene,
  onProjectUpdate
}: CanvasSidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [projectTitle, setProjectTitle] = useState(project.title);

  const filteredScenes = scenes.filter(scene =>
    scene.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    scene.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    scene.script?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTitleSave = async () => {
    if (projectTitle.trim() && projectTitle !== project.title) {
      onProjectUpdate(project.id, { title: projectTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setProjectTitle(project.title);
    setIsEditingTitle(false);
  };

  // Calculate project stats
  const totalScenes = scenes.length;
  const completedScenes = scenes.filter(scene => 
    scene.script && scene.image_url && scene.video_url
  ).length;
  const scenesWithImages = scenes.filter(scene => scene.image_url).length;
  const scenesWithVideos = scenes.filter(scene => scene.video_url).length;

  return (
    <div className="w-80 border-r bg-background flex flex-col h-full">
      {/* Project Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          {isEditingTitle ? (
            <div className="flex-1 flex gap-2">
              <Input
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSave();
                  if (e.key === 'Escape') handleTitleCancel();
                }}
                className="text-lg font-semibold"
                autoFocus
              />
              <Button size="sm" onClick={handleTitleSave}>
                Save
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-semibold truncate flex-1">
                {project.title}
              </h1>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditingTitle(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Title
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
        
        {project.description && (
          <p className="text-sm text-muted-foreground mb-3">
            {project.description}
          </p>
        )}

        {/* Project Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span>{totalScenes} scenes</span>
          </div>
          <div className="flex items-center gap-1">
            <ImageIcon className="h-3 w-3" />
            <span>{scenesWithImages} images</span>
          </div>
          <div className="flex items-center gap-1">
            <Video className="h-3 w-3" />
            <span>{scenesWithVideos} videos</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{completedScenes} complete</span>
          </div>
        </div>

        <Badge 
          variant={completedScenes === totalScenes && totalScenes > 0 ? "default" : "secondary"}
          className="mt-2"
        >
          {completedScenes === totalScenes && totalScenes > 0 ? "Complete" : "In Progress"}
        </Badge>
      </div>

      {/* Search */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search scenes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Scenes List */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium">Scenes</h2>
            <Button onClick={onAddScene} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Scene
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-2 pb-4">
            {filteredScenes.length > 0 ? (
              filteredScenes.map((scene) => (
                <SceneCard
                  key={scene.id}
                  scene={scene}
                  isSelected={selectedScene?.id === scene.id}
                  onSelect={() => onSceneSelect(scene)}
                  onDelete={() => onSceneDelete(scene.id)}
                />
              ))
            ) : (
              <div className="text-center py-8">
                <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? "No scenes match your search" : "No scenes yet"}
                </p>
                {!searchTerm && (
                  <Button onClick={onAddScene} variant="outline" className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Scene
                  </Button>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <Separator />

      {/* Footer */}
      <div className="p-4">
        <div className="flex items-center text-xs text-muted-foreground">
          <User className="h-3 w-3 mr-1" />
          <span className="truncate">Project by {project.user_id}</span>
        </div>
      </div>
    </div>
  );
}
