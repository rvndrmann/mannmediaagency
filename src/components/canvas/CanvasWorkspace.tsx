
import { useState } from "react";
import { CanvasProject, CanvasScene } from "@/types/canvas";
import { ScenesList } from "./ScenesList";
import { SceneEditor } from "./SceneEditor";
import { SceneDetailPanel } from "./SceneDetailPanel";
import { Empty } from "@/components/ui/empty";
import { CanvasScriptPanel } from "./CanvasScriptPanel";
import { Loader2 } from "lucide-react";

interface CanvasWorkspaceProps {
  project: CanvasProject | null;
  selectedScene: CanvasScene | null;
  selectedSceneId: string | null;
  setSelectedSceneId: (id: string) => void;
  addScene: () => Promise<void>;
  deleteScene: (id: string) => Promise<void>;
  updateScene: (sceneId: string, type: 'script' | 'imagePrompt' | 'description' | 'voiceOverText' | 'image' | 'productImage' | 'video' | 'voiceOver' | 'backgroundMusic', value: string) => Promise<void>;
  divideScriptToScenes: (scenes: Array<{ id: string; content: string; voiceOverText?: string }>) => Promise<void>;
  saveFullScript: (script: string) => Promise<void>;
  createNewProject: (title: string, description?: string) => Promise<string>;
  updateProjectTitle: (title: string) => Promise<void>;
  sceneLoading?: boolean;
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
  updateProjectTitle,
  sceneLoading = false
}: CanvasWorkspaceProps) {
  const [currentView, setCurrentView] = useState<"scenes" | "script">("scenes");
  const [showDetailPanel, setShowDetailPanel] = useState(true);

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Empty
          title="No Project Selected"
          description="Select a project from the sidebar or create a new one"
        />
      </div>
    );
  }

  // Fix promise mismatch by wrapping the function
  const handleCreateNewProject = async () => {
    const newProjectId = await createNewProject("New Project");
    return newProjectId;
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      <ScenesList
        scenes={project.scenes}
        selectedSceneId={selectedSceneId}
        onSelectScene={setSelectedSceneId}
        onAddScene={addScene}
        onDeleteScene={deleteScene}
        onSwitchView={() => setCurrentView(currentView === "scenes" ? "script" : "scenes")}
        currentView={currentView}
        onCreateNewProject={handleCreateNewProject}
      />

      <div className="flex-1 overflow-hidden flex relative">
        {sceneLoading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-50">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2">Loading scene...</span>
          </div>
        )}
        
        {currentView === "scenes" ? (
          selectedScene ? (
            <SceneEditor
              scene={selectedScene}
              onUpdate={updateScene}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <Empty
                title="No Scene Selected"
                description="Select a scene from the sidebar or create a new one"
              />
            </div>
          )
        ) : (
          <CanvasScriptPanel
            project={project}
            scenes={project.scenes}
            currentScript={project.fullScript}
            onSaveScript={saveFullScript}
            onDivideScriptToScenes={divideScriptToScenes}
          />
        )}

        {currentView === "scenes" && showDetailPanel && (
          <SceneDetailPanel
            scene={selectedScene}
            projectId={project.id}
            updateScene={updateScene}
            collapsed={!showDetailPanel}
            setCollapsed={(collapsed) => setShowDetailPanel(!collapsed)}
          />
        )}
      </div>
    </div>
  );
}
