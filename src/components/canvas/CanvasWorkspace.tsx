
import { CanvasProject, CanvasScene } from "@/types/canvas";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectScriptEditor } from "./ProjectScriptEditor";
import { ScenesList } from "./ScenesList";
import { SceneEditor } from "./SceneEditor";
import { SceneDetailPanel } from "./SceneDetailPanel";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle } from "lucide-react";
import { useState } from "react";

interface CanvasWorkspaceProps {
  project: CanvasProject | null;
  selectedScene: CanvasScene | null;
  selectedSceneId: string | null;
  setSelectedSceneId: (id: string | null) => void;
  addScene: () => Promise<void>;
  deleteScene: (id: string) => Promise<void>;
  updateScene: (id: string, type: 'script' | 'imagePrompt' | 'description' | 'image' | 'productImage' | 'video' | 'voiceOver' | 'backgroundMusic', value: string) => Promise<void>;
  divideScriptToScenes: (script: string) => Promise<void>;
  saveFullScript: (script: string) => Promise<void>;
  createNewProject: (title: string, description?: string) => Promise<string>;
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
  const [detailPanelCollapsed, setDetailPanelCollapsed] = useState(false);

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">No Project Selected</h2>
          <p className="text-muted-foreground mb-4">
            Create a new project to get started or select an existing project.
          </p>
          <Button 
            onClick={() => createNewProject("New Project").then(() => {})}
            size="lg"
          >
            Create New Project
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Tabs defaultValue="script" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-4 w-auto justify-start">
          <TabsTrigger value="script">Script</TabsTrigger>
          <TabsTrigger value="scenes">Scenes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="script" className="flex-1 p-4 overflow-hidden">
          <ProjectScriptEditor 
            project={project}
            saveFullScript={saveFullScript}
            divideScriptToScenes={divideScriptToScenes}
          />
        </TabsContent>
        
        <TabsContent value="scenes" className="flex-1 p-0 overflow-hidden flex">
          <div className="w-64 border-r flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-medium">Scenes</h3>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={addScene}
              >
                <PlusCircle className="h-5 w-5" />
              </Button>
            </div>
            
            <ScrollArea className="flex-1">
              <ScenesList 
                scenes={project.scenes || []}
                selectedSceneId={selectedSceneId}
                onSelectScene={setSelectedSceneId}
                onDeleteScene={deleteScene}
              />
            </ScrollArea>
          </div>
          
          <div className="flex-1 overflow-hidden flex">
            {selectedScene ? (
              <div className="flex-1 overflow-auto">
                <SceneEditor 
                  scene={selectedScene}
                  onUpdate={updateScene}
                />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Select a scene to edit
              </div>
            )}
            
            <SceneDetailPanel 
              scene={selectedScene}
              projectId={project.id}
              updateScene={updateScene}
              collapsed={detailPanelCollapsed}
              setCollapsed={setDetailPanelCollapsed}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
