
import React, { useEffect, useState } from 'react';
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
import { CanvasScene } from '@/types/canvas';
import { toast } from 'sonner';

export default function Canvas() {
  const [showScriptPanel, setShowScriptPanel] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(true);
  const [project, setProject] = useState(null);
  const [scenes, setScenes] = useState([]);
  const [selectedScene, setSelectedScene] = useState(null);
  const [selectedSceneId, setSelectedSceneId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState(null);
  
  // Get canvas projects and related data/methods
  const {
    projects,
    isLoading,
    createProject,
    updateProject,
    deleteProject
  } = useCanvasProjects();
  
  // Define updateScene here, before it's used in useCanvasAgent
  const updateScene = async (sceneId, type, value) => {
    console.log('Updating scene', sceneId, type, value);
    // Mock implementation - update scene in local state
    setScenes(prevScenes => {
      return prevScenes.map(scene => {
        if (scene.id === sceneId) {
          return { ...scene, [type]: value };
        }
        return scene;
      });
    });
    
    // If the selected scene is being updated, also update that state
    if (selectedScene && selectedScene.id === sceneId) {
      setSelectedScene(prevScene => ({
        ...prevScene,
        [type]: value
      }));
    }
  };
  
  // Get canvas agent for AI functionality
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
  
  // Simulate the missing methods that would be in useCanvasProjects
  const createScene = async (projectId, data) => {
    console.log('Creating scene for project', projectId, data);
    // Mock implementation
    const newSceneId = `scene-${Date.now()}`;
    const newScene = { 
      id: newSceneId, 
      title: data.title || 'New Scene', 
      projectId,
      ...data 
    };
    
    // Add to local state
    setScenes(prev => [...prev, newScene]);
    
    return newScene;
  };
  
  const deleteScene = async (sceneId) => {
    console.log('Deleting scene', sceneId);
    // Mock implementation - remove from local state
    setScenes(prev => prev.filter(scene => scene.id !== sceneId));
    
    // If the deleted scene was selected, clear selection
    if (selectedSceneId === sceneId) {
      setSelectedSceneId(null);
      setSelectedScene(null);
    }
  };
  
  const fetchProject = async (id) => {
    setLoading(true);
    console.log('Fetching project', id);
    // Mock implementation - create a dummy project
    const dummyProject = {
      id,
      title: 'Project ' + id,
      user_id: 'user-1',
      scenes: []
    };
    
    setProject(dummyProject);
    setScenes([]);
    setLoading(false);
  };
  
  const addScene = async () => {
    if (!project) return;
    
    const newScene = await createScene(project.id, { title: 'New Scene' });
    return newScene.id;
  };
  
  const saveFullScript = async (script) => {
    console.log('Saving full script', script);
    if (project) {
      setProject(prev => ({...prev, fullScript: script}));
      toast.success("Script saved successfully");
    }
  };
  
  const divideScriptToScenes = async (sceneScripts) => {
    console.log('Dividing script to scenes', sceneScripts);
    // Mock implementation
    for (const sceneScript of sceneScripts) {
      if (sceneScript.id) {
        await updateScene(sceneScript.id, 'script', sceneScript.content || '');
        await updateScene(sceneScript.id, 'voiceOverText', sceneScript.voiceOverText || '');
      }
    }
    toast.success("Script divided into scenes successfully");
  };
  
  // Initialize agent context with additional properties for the adapter
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
  
  // Effect to load project data on mount
  useEffect(() => {
    if (projectId) {
      fetchProject(projectId);
    } else {
      // If no projectId, use a default one for testing
      setProjectId('project-123');
    }
  }, [projectId]);
  
  // Effect to update project.scenes when scenes state changes
  useEffect(() => {
    if (project) {
      setProject(prev => ({...prev, scenes}));
    }
  }, [scenes]);
  
  // Effect to update selectedScene when selectedSceneId changes
  useEffect(() => {
    if (selectedSceneId) {
      const scene = scenes.find(s => s.id === selectedSceneId);
      setSelectedScene(scene || null);
    } else {
      setSelectedScene(null);
    }
  }, [selectedSceneId, scenes]);
  
  // Toggle panels
  const toggleScriptPanel = () => setShowScriptPanel(!showScriptPanel);
  const toggleDetailPanel = () => setShowDetailPanel(!showDetailPanel);
  
  // Project creation if no project exists
  if (!project && !loading) {
    return <CanvasEmptyStateAdapter createProject={createProject} />;
  }
  
  return (
    <div className="flex flex-col h-screen">
      <CanvasHeaderAdapter 
        project={project}
        updateProject={updateProject}
        onToggleScriptPanel={toggleScriptPanel}
        onToggleDetailPanel={toggleDetailPanel}
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
            saveFullScript={saveFullScript}
            divideScriptToScenes={divideScriptToScenes}
          />
        )}
      </div>
    </div>
  );
}
