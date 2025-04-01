import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
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
import { toast } from 'sonner';
import { useProjectContext } from '@/hooks/multi-agent/project-context';
import { CanvasChat } from '@/components/canvas/CanvasChat';
import { CanvasScene, SceneUpdateType } from '@/types/canvas';

export default function Canvas() {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const [showScriptPanel, setShowScriptPanel] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(true);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const { setActiveProject, setActiveScene } = useProjectContext();

  const {
    project,
    projects,
    scenes,
    selectedScene,
    selectedSceneId,
    setSelectedSceneId,
    createProject,
    updateProject,
    deleteProject,
    createScene,
    updateScene,
    deleteScene,
    loading,
    projectId,
    fetchProject
  } = useCanvasProjects();
  
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
    projectId: projectId || '',
    sceneId: selectedSceneId,
    updateScene
  });
  
  const addScene = useCallback(async (projectId: string, data: any = {}): Promise<any> => {
    if (!project) return null;
    
    try {
      const newScene = await createScene({
        ...data,
        projectId: projectId || project.id,
        project_id: projectId || project.id,
        scene_order: scenes.length + 1
      });
      
      return newScene || null;
    } catch (error) {
      console.error("Error adding scene:", error);
      return null;
    }
  }, [project, createScene, scenes.length]);
  
  const saveFullScript = useCallback(async (script: string): Promise<void> => {
    if (!project) return;
    
    try {
      await updateProject(project.id, { 
        full_script: script,
        fullScript: script // update both for compatibility
      });
      toast.success("Script saved successfully");
    } catch (error) {
      console.error('Error saving full script:', error);
      toast.error('Failed to save script');
    }
  }, [project, updateProject]);
  
  const divideScriptToScenes = useCallback(async (
    sceneScripts: Array<{ id: string; content: string; voiceOverText?: string }>
  ): Promise<void> => {
    for (const sceneScript of sceneScripts) {
      if (sceneScript.id) {
        await updateScene(sceneScript.id, 'script', sceneScript.content || '');
        if (sceneScript.voiceOverText) {
          await updateScene(sceneScript.id, 'voiceOverText', sceneScript.voiceOverText);
        }
      }
    }
    toast.success("Script divided into scenes successfully");
  }, [updateScene]);
  
  const createNewProject = useCallback(async (title: string, description?: string): Promise<string> => {
    try {
      const newProject = await createProject(title, description);
      if (newProject && typeof newProject === 'object' && 'id' in newProject) {
        return newProject.id;
      }
      return "";
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Failed to create project");
      return "";
    }
  }, [createProject]);
  
  const updateProjectTitle = useCallback(async (title: string): Promise<void> => {
    if (project && project.id) {
      try {
        await updateProject(project.id, { title });
        toast.success("Project title updated successfully");
      } catch (error) {
        console.error("Error updating project title:", error);
        toast.error("Failed to update project title");
      }
    }
  }, [project, updateProject]);
  
  const handleDeleteScene = useCallback(async (sceneId: string): Promise<void> => {
    await deleteScene(sceneId);
  }, [deleteScene]);
  
  useEffect(() => {
    if (routeProjectId) {
      fetchProject(routeProjectId);
    }
  }, [routeProjectId, fetchProject]);
  
  useEffect(() => {
    if (projectId) {
      setActiveProject(projectId);
    } else if (routeProjectId) {
      setActiveProject(routeProjectId);
    }
  }, [projectId, routeProjectId, setActiveProject]);
  
  useEffect(() => {
    if (selectedSceneId) {
      setActiveScene(selectedSceneId);
    } else {
      setActiveScene(null);
    }
  }, [selectedSceneId, setActiveScene]);
  
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
  
  const toggleScriptPanel = () => setShowScriptPanel(!showScriptPanel);
  const toggleDetailPanel = () => setShowDetailPanel(!showDetailPanel);
  const toggleChatPanel = () => setShowChatPanel(!showChatPanel);
  
  if (!project && !routeProjectId && !loading) {
    return <CanvasEmptyStateAdapter createProject={createNewProject} />;
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">Loading project...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-screen">
      <CanvasHeaderAdapter 
        project={project}
        updateProject={updateProject}
        onToggleScriptPanel={toggleScriptPanel}
        onToggleDetailPanel={toggleDetailPanel}
        onToggleChatPanel={toggleChatPanel}
        showScriptPanel={showScriptPanel}
        showDetailPanel={showDetailPanel}
        showChatButton={true}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <CanvasSidebarAdapter 
          project={project}
          scenes={scenes}
          selectedScene={selectedScene}
          selectedSceneId={selectedSceneId}
          setSelectedSceneId={setSelectedSceneId}
          createScene={createScene}
          deleteScene={handleDeleteScene}
          loading={loading}
        />
        
        <main className="flex-1 overflow-hidden flex flex-col bg-[#1a1a1a]">
          <CanvasWorkspaceAdapter 
            project={project}
            selectedScene={selectedScene}
            selectedSceneId={selectedSceneId}
            setSelectedSceneId={setSelectedSceneId}
            addScene={addScene}
            updateScene={updateScene}
            deleteScene={handleDeleteScene}
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
            selectedScene={selectedScene}
            project={project}
            projectId={project?.id || ''}
            updateScene={updateScene}
            onClose={() => setShowScriptPanel(false)}
            saveFullScript={saveFullScript}
            divideScriptToScenes={divideScriptToScenes}
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
