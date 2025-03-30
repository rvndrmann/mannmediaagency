
import { CanvasProject, CanvasScene } from "@/types/canvas";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { ProjectScriptEditor } from "./ProjectScriptEditor";
import { SceneEditor } from "./SceneEditor";
import { SceneDetailPanel } from "./SceneDetailPanel";

interface CanvasWorkspaceProps {
  project: CanvasProject | null;
  selectedScene: CanvasScene | null;
  selectedSceneId: string | null;
  setSelectedSceneId: (id: string | null) => void;
  addScene: () => Promise<void>;
  deleteScene: (id: string) => Promise<void>;
  updateScene: (id: string, type: 'script' | 'imagePrompt' | 'description' | 'image' | 'productImage' | 'video' | 'voiceOver' | 'backgroundMusic' | 'voiceOverText', value: string) => Promise<void>;
  divideScriptToScenes: (sceneScripts: Array<{ id: string; content: string; voiceOverText?: string }>) => Promise<void>;
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
  const [activeTab, setActiveTab] = useState("script");
  
  useEffect(() => {
    if (selectedSceneId) {
      setActiveTab("scenes");
    }
  }, [selectedSceneId]);

  const handleCreateNewProject = async () => {
    await createNewProject("Untitled Project");
  };

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">No Project Selected</h2>
          <p className="text-muted-foreground mb-4">
            Create a new project to get started or select an existing project.
          </p>
          <Button 
            onClick={handleCreateNewProject}
            size="lg"
            className="flex items-center gap-2"
          >
            <PlusCircle className="h-5 w-5" />
            Create New Project
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-xl font-semibold">{project.title}</h2>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleCreateNewProject}
          className="flex items-center gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          New Project
        </Button>
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList className="mx-4 mt-4 w-auto justify-start">
          <TabsTrigger value="script">Script</TabsTrigger>
          <TabsTrigger value="scenes">Scenes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="script" className="flex-1 p-4 overflow-hidden">
          <ProjectScriptEditor 
            project={project}
            saveFullScript={saveFullScript}
            divideScriptToScenes={divideScriptToScenes}
            updateProjectTitle={updateProjectTitle}
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
              <div className="p-4 space-y-2">
                {project.scenes.map((scene) => (
                  <div 
                    key={scene.id}
                    className={`p-3 border rounded-md cursor-pointer transition-colors ${
                      scene.id === selectedSceneId 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedSceneId(scene.id)}
                  >
                    <div className="font-medium">{scene.title}</div>
                    <div className="text-xs truncate">
                      {scene.voiceOverText 
                        ? scene.voiceOverText.substring(0, 60) + (scene.voiceOverText.length > 60 ? '...' : '')
                        : 'No content'}
                    </div>
                    <div className="flex justify-between items-center mt-2 text-xs">
                      <span>{scene.imagePrompt ? '✓ Image prompt' : '✗ No image prompt'}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={`h-6 w-6 ${scene.id === selectedSceneId ? 'text-primary-foreground' : 'text-muted-foreground'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Are you sure you want to delete this scene?')) {
                            deleteScene(scene.id);
                          }
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18"></path>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                      </Button>
                    </div>
                  </div>
                ))}
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={addScene}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M12 5v14M5 12h14"></path>
                  </svg>
                  Add Scene
                </Button>
              </div>
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
