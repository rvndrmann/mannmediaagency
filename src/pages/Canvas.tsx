
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
import { CanvasDetailPanel } from '@/components/canvas/CanvasDetailPanel';
import { CanvasChat } from '@/components/canvas/CanvasChat';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, MessageSquare, X } from 'lucide-react';

export default function Canvas() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('projects');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  
  const { 
    project, 
    scenes, 
    selectedScene,
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
      const newProject = await createProject(title);
      if (newProject) {
        toast.success(`Project "${title}" created successfully!`);
        setSelectedProjectId(newProject);
        // Navigate to the editor tab
        setActiveTab('editor');
        // Update URL with project ID
        navigate(`/canvas?projectId=${newProject}`, { replace: true });
        return newProject;
      }
    } catch (error) {
      toast.error(`Failed to create project: ${error}`);
    }
    return '';
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
  
  const handleSceneSelect = (sceneId: string) => {
    setSelectedSceneId(sceneId);
  };
  
  const handleToggleChat = () => {
    setShowChat(!showChat);
  };
  
  const handleAddScene = async () => {
    await addScene();
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
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={handleToggleChat} className="gap-2">
                    <MessageSquare size={16} />
                    {showChat ? 'Hide Chat' : 'Show Chat'}
                  </Button>
                  <Button variant="outline" onClick={handleBackToProjects}>
                    Back to Projects
                  </Button>
                </div>
              </div>
              
              <div className="flex h-[calc(100vh-250px)]">
                <div className={`flex-1 flex flex-col ${showChat ? 'w-2/3' : 'w-full'}`}>
                  <Tabs defaultValue="scenes" className="w-full h-full flex flex-col">
                    <TabsList>
                      <TabsTrigger value="scenes">Scenes</TabsTrigger>
                      <TabsTrigger value="script">Full Script</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="scenes" className="flex-1 flex flex-col overflow-hidden">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium">Scenes</h3>
                        <Button onClick={handleAddScene} size="sm" className="gap-2">
                          <PlusCircle size={16} />
                          Add Scene
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-2">
                        {scenes.length === 0 ? (
                          <div className="col-span-full text-center py-8">
                            <p className="text-muted-foreground mb-4">No scenes yet. Create your first scene to get started.</p>
                            <Button onClick={handleAddScene}>
                              Create First Scene
                            </Button>
                          </div>
                        ) : (
                          scenes.map(scene => (
                            <Card 
                              key={scene.id} 
                              className={`cursor-pointer transition-all ${selectedSceneId === scene.id ? 'ring-2 ring-primary' : ''}`}
                              onClick={() => handleSceneSelect(scene.id)}
                            >
                              <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-md flex justify-between items-center">
                                  <span>{scene.title || `Scene ${scenes.indexOf(scene) + 1}`}</span>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteScene(scene.id);
                                    }}
                                  >
                                    <X size={16} />
                                  </Button>
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="p-4 pt-0">
                                <div className="h-32 overflow-hidden text-ellipsis">
                                  <p className="text-sm text-muted-foreground line-clamp-5">
                                    {scene.script || scene.description || 'No content yet'}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="script" className="flex-1">
                      <div className="flex flex-col h-full">
                        <textarea
                          className="w-full h-full min-h-[300px] p-4 border rounded-md mb-4"
                          placeholder="Enter your full script here..."
                          value={project.fullScript || ''}
                          onChange={(e) => saveFullScript(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                          <Button onClick={() => divideScriptToScenes()} disabled={!project.fullScript}>
                            Divide Into Scenes
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
                
                {showChat && (
                  <div className="w-1/3 ml-4 border rounded-md overflow-hidden">
                    <CanvasChat 
                      projectId={selectedProjectId}
                      sceneId={selectedSceneId}
                      onClose={handleToggleChat}
                      updateScene={updateScene}
                    />
                  </div>
                )}
                
                {selectedSceneId && (
                  <CanvasDetailPanel 
                    scene={scenes.find(s => s.id === selectedSceneId) || null}
                    projectId={selectedProjectId}
                    updateScene={updateScene}
                    collapsed={panelCollapsed}
                    setCollapsed={setPanelCollapsed}
                  />
                )}
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
