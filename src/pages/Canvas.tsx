
import React, { useEffect, useState, useCallback } from 'react';
import { useCanvasProjects } from '@/hooks/use-canvas-projects';
import { useCanvasAgent } from '@/hooks/use-canvas-agent';
import {
  CanvasEmptyStateAdapter,
  CanvasHeaderAdapter,
  CanvasSidebarAdapter,
  CanvasWorkspaceAdapter,
  CanvasDetailPanelAdapter,
  CanvasScriptPanelAdapter
} from '@/components/canvas/adapters/CanvasProjectAdapter';
import { CanvasScene, CanvasProject } from '@/types/canvas';
import { toast } from 'sonner';
import { useProjectContext } from '@/hooks/multi-agent/project-context';
import { CanvasChat } from '@/components/canvas/CanvasChat';

export default function Canvas() {
  const [showScriptPanel, setShowScriptPanel] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(true);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [project, setProject] = useState<CanvasProject | null>(null);
  const [scenes, setScenes] = useState<CanvasScene[]>([]);
  const [selectedScene, setSelectedScene] = useState<CanvasScene | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState<string | null>(null);
  const { setActiveProject, setActiveScene } = useProjectContext();

  const {
    projects,
    isLoading,
    createProject,
    updateProject,
    deleteProject
  } = useCanvasProjects();
  
  const updateScene = useCallback(async (sceneId: string, type: string, value: string) => {
    console.log('Updating scene', sceneId, type, value);
    setScenes(prevScenes => {
      return prevScenes.map(scene => {
        if (scene.id === sceneId) {
          return { ...scene, [type]: value };
        }
        return scene;
      });
    });
    
    if (selectedScene && selectedScene.id === sceneId) {
      setSelectedScene(prevScene => ({
        ...prevScene!,
        [type]: value
      }));
    }
  }, [selectedScene]);
  
  const {
    generateSceneScript,
    generateSceneDescription,
    generateImagePrompt,
    generateSceneImage,
    generateSceneVideo,
    isLoading: isAgentLoading,
    messages,
    addUserMessage,
    addAgentMessage,
    addSystemMessage,
    activeAgent
  } = useCanvasAgent({
    projectId,
    sceneId: selectedSceneId,
    updateScene
  });
  
  const createScene = useCallback(async (projectId: string, data: any) => {
    console.log('Creating scene for project', projectId, data);
    const newSceneId = `scene-${Date.now()}`;
    const newScene = { 
      id: newSceneId, 
      title: data.title || 'New Scene', 
      projectId: projectId,
      project_id: projectId,
      description: '',
      script: '',
      image_prompt: '',
      image_url: '',
      voice_over_text: '',
      duration: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...data 
    };
    
    setScenes(prev => [...prev, newScene]);
    
    return newSceneId;
  }, []);
  
  const deleteScene = useCallback(async (sceneId: string) => {
    console.log('Deleting scene', sceneId);
    setScenes(prev => prev.filter(scene => scene.id !== sceneId));
    
    if (selectedSceneId === sceneId) {
      setSelectedSceneId(null);
      setSelectedScene(null);
    }
  }, [selectedSceneId]);
  
  const fetchProject = useCallback(async (id: string) => {
    setLoading(true);
    console.log('Fetching project', id);
    const dummyProject = {
      id,
      title: 'Project ' + id,
      description: '',
      user_id: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      full_script: '',
      scenes: []
    };
    
    setProject(dummyProject);
    setScenes([]);
    setLoading(false);
  }, []);
  
  const addScene = useCallback(async () => {
    if (!project) return '';
    
    const newSceneId = await createScene(project.id, { title: 'New Scene' });
    return newSceneId;
  }, [project, createScene]);
  
  const saveFullScript = useCallback(async (script: string) => {
    console.log('Saving full script', script);
    if (project) {
      setProject(prev => prev ? {...prev, full_script: script} : null);
      toast.success("Script saved successfully");
    }
  }, [project]);
  
  const divideScriptToScenes = useCallback(async (sceneScripts: Array<{ id: string; content: string; voiceOverText?: string }>) => {
    console.log('Dividing script to scenes', sceneScripts);
    for (const sceneScript of sceneScripts) {
      if (sceneScript.id) {
        await updateScene(sceneScript.id, 'script', sceneScript.content || '');
        await updateScene(sceneScript.id, 'voiceOverText', sceneScript.voiceOverText || '');
      }
    }
    toast.success("Script divided into scenes successfully");
  }, [updateScene]);
  
  const createNewProject = useCallback(async (title: string, description?: string) => {
    console.log('Creating new project', title, description);
    try {
      const newProjectData = await createProject(title, description);
      if (newProjectData && newProjectData.id) {
        setProjectId(newProjectData.id);
        return newProjectData.id;
      }
      return "";
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Failed to create project");
      return "";
    }
  }, [createProject]);
  
  const updateProjectTitle = useCallback(async (title: string) => {
    console.log('Updating project title', title);
    if (project && project.id) {
      try {
        await updateProject(project.id, { title });
        setProject(prev => prev ? {...prev, title} : null);
        toast.success("Project title updated successfully");
      } catch (error) {
        console.error("Error updating project title:", error);
        toast.error("Failed to update project title");
      }
    }
  }, [project, updateProject]);
  
  const agentProps = {
    isLoading: isAgentLoading,
    messages,
    generateSceneScript,
    generateSceneDescription,
    generateImagePrompt,
    generateSceneImage,
    generateSceneVideo,
    addUserMessage,
    addAgentMessage,
    addSystemMessage,
    activeAgent,
    isMcpEnabled: true,
    isMcpConnected: true,
    toggleMcp: () => {},
    isGeneratingDescription: false,
    isGeneratingImagePrompt: false,
    isGeneratingImage: false,
    isGeneratingVideo: false,
    isGeneratingScript: false,
    isGenerating: isAgentLoading
  };
  
  useEffect(() => {
    if (projectId) {
      fetchProject(projectId);
      setActiveProject(projectId);
    } else {
      setProjectId('project-123');
    }
  }, [projectId, fetchProject, setActiveProject]);
  
  useEffect(() => {
    if (project) {
      setProject(prev => prev ? {...prev, scenes} : null);
    }
  }, [scenes]);
  
  useEffect(() => {
    if (selectedSceneId) {
      const scene = scenes.find(s => s.id === selectedSceneId);
      setSelectedScene(scene || null);
      setActiveScene(selectedSceneId);
    } else {
      setSelectedScene(null);
      setActiveScene(null);
    }
  }, [selectedSceneId, scenes, setActiveScene]);
  
  const toggleScriptPanel = () => setShowScriptPanel(!showScriptPanel);
  const toggleDetailPanel = () => setShowDetailPanel(!showDetailPanel);
  const toggleChatPanel = () => setShowChatPanel(!showChatPanel);
  
  if (!project && !loading) {
    return <CanvasEmptyStateAdapter createProject={createNewProject} />;
  }
  
  return (
    <div className="flex flex-col h-screen">
      <CanvasHeaderAdapter 
        project={project}
        updateProject={updateProject}
        onToggleScriptPanel={toggleScriptPanel}
        onToggleDetailPanel={toggleDetailPanel}
        onToggleChatPanel={toggleChatPanel}
        showChatButton={true}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <CanvasSidebarAdapter 
          project={project}
          selectedSceneId={selectedSceneId}
          setSelectedSceneId={setSelectedSceneId}
          createScene={createScene}
          deleteScene={deleteScene}
          loading={loading}
        />
        
        <main className="flex-1 overflow-hidden flex flex-col bg-[#1a1a1a]">
          <CanvasWorkspaceAdapter 
            project={project}
            selectedScene={selectedScene}
            selectedSceneId={selectedSceneId}
            setSelectedSceneId={setSelectedSceneId}
            updateScene={updateScene}
            addScene={addScene}
            deleteScene={deleteScene}
            divideScriptToScenes={divideScriptToScenes}
            saveFullScript={saveFullScript}
            createNewProject={createNewProject}
            updateProjectTitle={updateProjectTitle}
            agent={agentProps}
          />
        </main>
        
        {showDetailPanel && (
          <CanvasDetailPanelAdapter 
            scene={selectedScene}
            projectId={project?.id || ''}
            updateScene={updateScene}
            collapsed={false}
            setCollapsed={() => setShowDetailPanel(false)}
          />
        )}
        
        {showScriptPanel && (
          <CanvasScriptPanelAdapter 
            project={project}
            projectId={project?.id || ''}
            onUpdateScene={updateScene}
            onClose={() => setShowScriptPanel(false)}
            onSaveFullScript={saveFullScript}
            onDivideScriptToScenes={divideScriptToScenes}
          />
        )}
        
        {showChatPanel && (
          <div className="w-80 bg-[#111827] text-white">
            <CanvasChat
              projectId={project?.id}
              sceneId={selectedSceneId}
              onClose={() => setShowChatPanel(false)}
              updateScene={updateScene}
            />
          </div>
        )}
      </div>
    </div>
  );
}
