
import { CanvasProject, CanvasScene } from "@/types/canvas";
import { SceneCard } from "./SceneCard";
import { EmptySceneCard } from "./EmptySceneCard";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CanvasWorkspaceProps {
  project: CanvasProject;
  selectedScene: CanvasScene | null;
  updateScene: (sceneId: string, type: 'script' | 'imagePrompt' | 'image' | 'video', value: string) => Promise<void>;
}

export function CanvasWorkspace({
  project,
  selectedScene,
  updateScene,
}: CanvasWorkspaceProps) {
  if (!selectedScene) {
    return (
      <div className="flex-1 bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
        <p className="text-lg text-slate-500 dark:text-slate-400">
          Select a scene to view and edit
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-100 dark:bg-slate-950 overflow-hidden flex flex-col">
      <div className="p-4 border-b bg-background">
        <h2 className="text-xl font-semibold">{selectedScene.title}</h2>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {selectedScene ? (
            <>
              <SceneCard
                title="Script"
                content={selectedScene.script || ""}
                onUpdate={(value) => updateScene(selectedScene.id, 'script', value)}
                type="text"
                scene={selectedScene}
              />
              
              <SceneCard
                title="Image Prompt"
                content={selectedScene.imagePrompt || ""}
                onUpdate={(value) => updateScene(selectedScene.id, 'imagePrompt', value)}
                type="text"
                scene={selectedScene}
              />
              
              {selectedScene.imageUrl ? (
                <SceneCard
                  title="Scene Image"
                  imageUrl={selectedScene.imageUrl}
                  onUpdate={(value) => updateScene(selectedScene.id, 'image', value)}
                  type="image"
                  scene={selectedScene}
                />
              ) : (
                <EmptySceneCard
                  title="Scene Image"
                  onGenerate={() => {}}
                  onUpload={(imageUrl) => updateScene(selectedScene.id, 'image', imageUrl)}
                  type="image"
                />
              )}
              
              {selectedScene.videoUrl ? (
                <SceneCard
                  title="Scene Video"
                  videoUrl={selectedScene.videoUrl}
                  onUpdate={(value) => updateScene(selectedScene.id, 'video', value)}
                  type="video"
                  scene={selectedScene}
                />
              ) : (
                <EmptySceneCard
                  title="Scene Video"
                  onGenerate={() => {}}
                  onUpload={(videoUrl) => updateScene(selectedScene.id, 'video', videoUrl)}
                  type="video"
                />
              )}
            </>
          ) : (
            <p>Select a scene to view and edit</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
