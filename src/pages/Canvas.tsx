
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProjectContext } from '@/hooks/multi-agent/project-context';
import { ProjectSelector } from '@/components/canvas/ProjectSelector';
import { useCanvas } from '@/hooks/use-canvas';

export default function Canvas() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('projects');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  
  const { 
    project, 
    scenes, 
    selectedScene,
    selectedSceneId,
    setSelectedSceneId,
    createProject,
    addScene,
    deleteScene,
    updateScene,
    divideScriptToScenes,
    saveFullScript,
    updateProjectTitle,
    loading
  } = useCanvas(selectedProjectId);
  
  // useEffect to load project details if projectId is in the URL
  useEffect(() => {
    // Use URLSearchParams to extract the query parameters
    const searchParams = new URLSearchParams(location.search);
    const projectId = searchParams.get('projectId');
    
    if (projectId) {
      setSelectedProjectId(projectId);
      setActiveTab('editor');
    }
  }, [location.search]);
  
  const handleCreateProject = async (title: string) => {
    try {
      const projectId = await createProject(title);
      
      if (projectId) {
        toast.success(`Project "${title}" created successfully!`);
        setSelectedProjectId(projectId);
        // Navigate to the editor tab
        setActiveTab('editor');
        // Update URL with project ID
        navigate(`/canvas?projectId=${projectId}`, { replace: true });
        return projectId;
      }
    } catch (error) {
      toast.error(`Failed to create project: ${error}`);
    }
    return null;
  };
  
  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    // Navigate to the editor tab
    setActiveTab('editor');
    // Update URL with project ID
    navigate(`/canvas?projectId=${projectId}`, { replace: true });
  };
  
  const handleBackToProjects = () => {
    setActiveTab('projects');
    navigate('/canvas', { replace: true });
  };
  
  // Wrapper functions to adapt return types
  const createSceneWrapper = async () => {
    await addScene();
  };
  
  const deleteSceneWrapper = async (id: string) => {
    await deleteScene(id);
  };
  
  const updateSceneScriptsWrapper = async (sceneScripts: { id: string; content: string; voiceOverText?: string; }[]) => {
    // If there's content and it's just a string, save it as the full script
    if (sceneScripts && sceneScripts.length > 0) {
      await updateScene(sceneScripts[0].id, 'script', sceneScripts[0].content);
    }
  };
  
  const updateSceneScriptWrapper = async (script: string) => {
    if (selectedSceneId) {
      await updateScene(selectedSceneId, 'script', script);
    }
  };
  
  const updateProjectTitleWrapper = async (title: string) => {
    await updateProjectTitle(title);
  };

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
          <div className="project-selector-container">
            <ProjectSelector 
              onBack={() => navigate('/')} 
              onSelectProject={handleSelectProject}
              onCreateProject={handleCreateProject}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="editor" className="mt-4">
          {selectedProjectId && project ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">{project.title || 'Untitled Project'}</h2>
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
