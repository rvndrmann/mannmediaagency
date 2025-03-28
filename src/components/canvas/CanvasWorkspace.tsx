
import { useState } from "react";
import { CanvasProject, CanvasScene } from "@/types/canvas";
import { CanvasTimeline } from "./CanvasTimeline";
import { CanvasDetailPanel } from "./CanvasDetailPanel";
import { CanvasPreview } from "./CanvasPreview";
import { CanvasScriptPanel } from "./CanvasScriptPanel";

interface CanvasWorkspaceProps {
  project: CanvasProject | null;
  selectedScene: CanvasScene | null;
  selectedSceneId: string | null;
  setSelectedSceneId: (id: string | null) => void;
  addScene: () => Promise<string | undefined>;
  deleteScene: (id: string) => Promise<void>;
  updateScene: (
    sceneId: string,
    type: 'script' | 'imagePrompt' | 'description' | 'image' | 'productImage' | 'video' | 'voiceOver' | 'backgroundMusic',
    value: string
  ) => Promise<void>;
  divideScriptToScenes: (sceneScripts: Array<{ id: string; content: string }>) => Promise<void>;
  saveFullScript: (script: string) => Promise<void>;
  createNewProject: () => Promise<void>;
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
  createNewProject
}: CanvasWorkspaceProps) {
  const [showScript, setShowScript] = useState(false);
  const [detailsPanelCollapsed, setDetailsPanelCollapsed] = useState(false);

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-4">No Project Selected</h3>
          <p className="text-muted-foreground mb-6">Create a new project to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className={`flex flex-col flex-1 ${detailsPanelCollapsed ? "" : "mr-80"}`}>
        <div className="flex-1 flex flex-col overflow-hidden">
          {showScript ? (
            <CanvasScriptPanel
              project={project}
              onClose={() => setShowScript(false)}
              saveFullScript={saveFullScript}
              divideScriptToScenes={divideScriptToScenes}
            />
          ) : (
            <CanvasPreview
              scene={selectedScene}
              onShowScript={() => setShowScript(true)}
            />
          )}
          
          <CanvasTimeline
            scenes={project.scenes}
            selectedSceneId={selectedSceneId}
            onSceneSelect={setSelectedSceneId}
            onAddScene={addScene}
            onDeleteScene={deleteScene}
          />
        </div>
      </div>
      
      <CanvasDetailPanel
        scene={selectedScene}
        projectId={project.id}
        updateScene={updateScene}
        collapsed={detailsPanelCollapsed}
        setCollapsed={setDetailsPanelCollapsed}
      />
    </div>
  );
}
