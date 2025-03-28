
import { CanvasProject, CanvasScene } from "@/types/canvas";
import { ScenesList } from "./ScenesList";
import { SceneEditor } from "./SceneEditor";
import { ProjectScriptEditor } from "./ProjectScriptEditor";
import { useState } from "react";

interface CanvasWorkspaceProps {
  project: CanvasProject | null;
  selectedScene: CanvasScene | null;
  selectedSceneId: string | null;
  setSelectedSceneId: (id: string | null) => void;
  addScene: () => Promise<string | undefined>;
  deleteScene: (id: string) => Promise<void>;
  updateScene: (id: string, type: "script" | "imagePrompt" | "description" | "image" | "productImage" | "video" | "voiceOver" | "backgroundMusic", value: string) => Promise<void>;
  divideScriptToScenes: (sceneScripts: Array<{ id: string; content: string }>) => Promise<void>;
  saveFullScript: (script: string) => Promise<void>;
  createNewProject: () => Promise<void>;
  updateProjectTitle: (title: string) => Promise<void>;
}

export function CanvasWorkspace({
  project,
  selectedScene,
  selectedSceneId,
  setSelectedSceneId,
  addScene,
  deleteScene,
  updateScene,
  divideScriptToScenes,
  saveFullScript,
  createNewProject,
  updateProjectTitle
}: CanvasWorkspaceProps) {
  const [view, setView] = useState<"scenes" | "script">("scenes");
  
  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p>No project selected</p>
      </div>
    );
  }
  
  return (
    <div className="flex-1 flex overflow-hidden">
      <ScenesList
        scenes={project.scenes}
        selectedSceneId={selectedSceneId}
        onSelectScene={setSelectedSceneId}
        onAddScene={addScene}
        onDeleteScene={deleteScene}
        onSwitchView={() => setView(view === "scenes" ? "script" : "scenes")}
        currentView={view}
        onCreateNewProject={createNewProject}
      />
      
      <div className="flex-1 overflow-auto">
        {view === "scenes" ? (
          selectedScene ? (
            <SceneEditor 
              scene={selectedScene} 
              onUpdate={updateScene} 
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground">Select a scene to edit</p>
            </div>
          )
        ) : (
          <ProjectScriptEditor 
            project={project}
            scenes={project.scenes}
            saveFullScript={saveFullScript}
            divideScriptToScenes={divideScriptToScenes}
            updateProjectTitle={updateProjectTitle}
          />
        )}
      </div>
    </div>
  );
}
