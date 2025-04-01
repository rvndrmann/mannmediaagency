
import React, { useEffect, useState } from 'react';
import { CanvasWorkspace } from '@/components/canvas/CanvasWorkspace';
import { CanvasSidebar } from '@/components/canvas/CanvasSidebar';
import { CanvasDetailPanel } from '@/components/canvas/CanvasDetailPanel';
import { CanvasHeader } from '@/components/canvas/CanvasHeader';
import { CanvasScriptPanel } from '@/components/canvas/CanvasScriptPanel';
import { useCanvasProjects } from '@/hooks/use-canvas-projects';
import { useCanvasAgent } from '@/hooks/use-canvas-agent';
import { useCanvasMessages } from '@/hooks/use-canvas-messages';
import { CanvasEmptyState } from '@/components/canvas/CanvasEmptyState';
import { CanvasProject, CanvasScene } from '@/types/canvas';

export default function Canvas() {
  const [showScriptPanel, setShowScriptPanel] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(true);
  
  // Get projects instead of project
  const {
    projects,
    createProject,
    updateProject,
    deleteProject,
    isLoading,
    // These properties need to be fixed in the hook
    project,
    scenes,
    selectedScene,
    selectedSceneId,
    setSelectedSceneId,
    createScene,
    updateScene,
    deleteScene,
    loading,
    projectId,
    fetchProject
  } = useCanvasProjects();
  
  // Add fetchProjects method
  const fetchProjects = async () => {
    if (projectId) {
      await fetchProject(projectId);
    }
  };
  
  // Initialize agent context
  const {
    isLoading: agentLoading,
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
    isMcpEnabled,
    isMcpConnected,
    toggleMcp,
    isGeneratingDescription,
    isGeneratingImagePrompt,
    isGeneratingImage,
    isGeneratingVideo,
    isGeneratingScript
  } = useCanvasAgent({
    projectId,
    sceneId: selectedSceneId,
    updateScene
  });
  
  // Effect to load project data on mount
  useEffect(() => {
    if (projectId) {
      fetchProject(projectId);
    }
  }, [projectId]);
  
  // Toggle panels
  const toggleScriptPanel = () => setShowScriptPanel(!showScriptPanel);
  const toggleDetailPanel = () => setShowDetailPanel(!showDetailPanel);
  
  // Project creation if no project exists
  if (!project && !loading) {
    return <CanvasEmptyState createProject={createProject} />;
  }
  
  // Create agent props object
  const agentProps = {
    isLoading: agentLoading,
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
    isMcpEnabled,
    isMcpConnected,
    toggleMcp,
    isGenerating: isGeneratingScript || isGeneratingDescription || isGeneratingImagePrompt || isGeneratingImage || isGeneratingVideo
  };
  
  return (
    <div className="flex flex-col h-screen">
      <CanvasHeader 
        project={project}
        updateProject={updateProject}
        showScriptPanel={showScriptPanel}
        showDetailPanel={showDetailPanel}
        onToggleScriptPanel={toggleScriptPanel}
        onToggleDetailPanel={toggleDetailPanel}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <CanvasSidebar 
          project={project}
          projects={projects}
          scenes={scenes}
          selectedScene={selectedScene}
          selectedSceneId={selectedSceneId}
          setSelectedSceneId={setSelectedSceneId}
          createScene={createScene}
          deleteScene={deleteScene}
          loading={loading}
        />
        
        <main className="flex-1 overflow-hidden flex flex-col bg-[#1a1a1a]">
          <CanvasWorkspace 
            project={project}
            scenes={scenes}
            selectedScene={selectedScene}
            selectedSceneId={selectedSceneId}
            setSelectedSceneId={setSelectedSceneId}
            createScene={createScene}
            updateScene={updateScene}
            agent={agentProps}
          />
        </main>
        
        {showDetailPanel && (
          <CanvasDetailPanel 
            scene={selectedScene}
            projectId={projectId || ''}
            updateScene={updateScene}
            collapsed={false}
            setCollapsed={() => setShowDetailPanel(false)}
          />
        )}
        
        {showScriptPanel && (
          <CanvasScriptPanel 
            scene={selectedScene}
            projectId={projectId || ''}
            onUpdateScene={updateScene}
            onClose={() => setShowScriptPanel(false)}
          />
        )}
      </div>
    </div>
  );
}
