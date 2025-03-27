
import { CanvasProject, CanvasScene } from "@/types/canvas";
import { SceneTable } from "./SceneTable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface CanvasWorkspaceProps {
  project: CanvasProject;
  selectedScene: CanvasScene | null;
  selectedSceneId: string | null;
  setSelectedSceneId: (id: string) => void;
  addScene: () => Promise<string | undefined>;
  updateScene: (sceneId: string, type: 'script' | 'imagePrompt' | 'image' | 'video', value: string) => Promise<void>;
}

export function CanvasWorkspace({
  project,
  selectedScene,
  selectedSceneId,
  setSelectedSceneId,
  addScene,
  updateScene,
}: CanvasWorkspaceProps) {
  if (!project || project.scenes.length === 0) {
    return (
      <div className="flex-1 bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center">
        <p className="text-lg text-slate-500 dark:text-slate-400 mb-4">
          No scenes added yet
        </p>
        <Button onClick={addScene}>
          <Plus className="h-4 w-4 mr-2" />
          Add Scene
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-100 dark:bg-slate-950 overflow-hidden flex flex-col">
      <div className="p-4 border-b bg-background flex justify-between items-center">
        <h2 className="text-xl font-semibold">Project Timeline</h2>
        <Button onClick={addScene} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Scene
        </Button>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <SceneTable 
          scenes={project.scenes}
          selectedSceneId={selectedSceneId}
          setSelectedSceneId={setSelectedSceneId}
          updateScene={updateScene}
        />
      </ScrollArea>
    </div>
  );
}
