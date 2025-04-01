
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProjectContext } from '@/hooks/multi-agent/project-context';
import { ProjectSelector } from '@/components/canvas/ProjectSelector';

export default function Canvas() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('projects');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  
  const { 
    projectDetails, 
    projectContent, 
    createProject,
    loadProject,
    getProjectScenes
  } = useProjectContext({});
  
  // useEffect to load project details if projectId is in the URL
  useEffect(() => {
    const { projectId } = router.query;
    if (projectId && typeof projectId === 'string') {
      setSelectedProjectId(projectId);
      loadProject(projectId).then(() => {
        setActiveTab('editor');
      });
    }
  }, [router.query, loadProject]);
  
  const handleCreateProject = async (title: string) => {
    try {
      const result = await createProject(title);
      if (result) {
        toast.success(`Project "${title}" created successfully!`);
        setSelectedProjectId(result.id);
        // Navigate to the editor tab
        setActiveTab('editor');
        // Update URL with project ID
        router.push(`/canvas?projectId=${result.id}`, undefined, { shallow: true });
        return result.id;
      }
    } catch (error) {
      toast.error(`Failed to create project: ${error}`);
    }
    return null;
  };
  
  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    loadProject(projectId).then(() => {
      setActiveTab('editor');
      // Update URL with project ID
      router.push(`/canvas?projectId=${projectId}`, undefined, { shallow: true });
    });
  };
  
  const handleBackToProjects = () => {
    setActiveTab('projects');
    router.push('/canvas', undefined, { shallow: true });
  };
  
  // Simplified wrapper functions that adapt return types
  const createSceneWrapper = async () => {
    const newScene = await createScene();
    return; // Void return to match expected type
  };
  
  const deleteSceneWrapper = async (id: string) => {
    await deleteScene(id);
    return; // Void return to match expected type
  };
  
  const updateSceneScriptsWrapper = async (sceneScripts: { id: string; content: string; voiceOverText?: string; }[]) => {
    // Convert array format to single script for compatibility
    if (sceneScripts && sceneScripts.length > 0) {
      await updateSceneScript(sceneScripts[0].id, sceneScripts[0].content);
    }
    return; // Void return to match expected type
  };
  
  const updateSceneScriptWrapper = async (script: string) => {
    if (selectedSceneId) {
      await updateSceneScript(selectedSceneId, script);
    }
    return; // Void return to match expected type
  };
  
  const updateProjectTitleWrapper = async (title: string) => {
    await updateProjectTitle(title);
    return; // Void return to match expected type
  };
  
  // Simulator functions for demo purposes
  const [scenes, setScenes] = useState<any[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  
  async function createScene() {
    const newScene = {
      id: `scene-${Date.now()}`,
      title: `Scene ${scenes.length + 1}`,
      script: '',
      created_at: new Date().toISOString()
    };
    setScenes(prev => [...prev, newScene]);
    return newScene;
  }
  
  async function deleteScene(sceneId: string) {
    setScenes(prev => prev.filter(scene => scene.id !== sceneId));
    if (selectedSceneId === sceneId) {
      setSelectedSceneId(null);
    }
    return true;
  }
  
  async function updateSceneScript(sceneId: string, script: string) {
    setScenes(prev => 
      prev.map(scene => 
        scene.id === sceneId ? { ...scene, script } : scene
      )
    );
    return true;
  }
  
  async function updateProjectTitle(title: string) {
    // This would update the project title in a real implementation
    toast.success(`Project title updated to: ${title}`);
    return true;
  }
  
  return (
    <PageLayout>
      <div className="mb-4">
        <h1 className="text-3xl font-bold">Canvas</h1>
        <p className="text-gray-500">Create, edit, and publish interactive video content</p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="editor" disabled={!selectedProjectId}>Editor</TabsTrigger>
        </TabsList>
        
        <TabsContent value="projects" className="mt-4">
          <ProjectSelector 
            projectId={selectedProjectId || undefined}
            onBack={() => router.push('/')} 
            onSelectProject={handleSelectProject}
          />
        </TabsContent>
        
        <TabsContent value="editor" className="mt-4">
          {selectedProjectId && projectDetails ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">{projectDetails.title || 'Untitled Project'}</h2>
                <Button variant="outline" onClick={handleBackToProjects}>
                  Back to Projects
                </Button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle>Scenes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {scenes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No scenes yet. Create your first scene to get started.</p>
                    ) : (
                      <div className="space-y-2">
                        {scenes.map(scene => (
                          <div 
                            key={scene.id}
                            className={`p-3 rounded-md cursor-pointer hover:bg-secondary ${selectedSceneId === scene.id ? 'bg-secondary' : ''}`}
                            onClick={() => setSelectedSceneId(scene.id)}
                          >
                            <div className="flex items-center justify-between">
                              <span>{scene.title}</span>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSceneWrapper(scene.id);
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button onClick={createSceneWrapper} className="w-full">
                      Add Scene
                    </Button>
                  </CardFooter>
                </Card>
                
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>
                      {selectedSceneId 
                        ? `Edit Scene: ${scenes.find(s => s.id === selectedSceneId)?.title || 'Untitled Scene'}`
                        : 'Scene Editor'
                      }
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedSceneId ? (
                      <div className="space-y-4">
                        <textarea
                          className="w-full min-h-[200px] p-3 border rounded-md"
                          placeholder="Enter your scene script here..."
                          value={scenes.find(s => s.id === selectedSceneId)?.script || ''}
                          onChange={(e) => updateSceneScriptWrapper(e.target.value)}
                        />
                        
                        <div className="flex gap-2">
                          <Button>Generate Voice-over</Button>
                          <Button>Generate Image</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center min-h-[200px] text-center">
                        <p className="text-muted-foreground mb-4">Select a scene to edit or create a new one</p>
                        <Button onClick={createSceneWrapper}>Create New Scene</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center">
              <h3 className="text-xl font-semibold mb-2">No Project Selected</h3>
              <p className="text-muted-foreground mb-4">Please select or create a project to continue</p>
              <Button onClick={() => setActiveTab('projects')}>
                Go to Projects
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
