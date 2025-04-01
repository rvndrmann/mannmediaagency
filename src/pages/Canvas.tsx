
import React, { useEffect, useState } from 'react';
import { CanvasWorkspace } from '@/components/canvas/CanvasWorkspace';
import { CanvasSidebar } from '@/components/canvas/CanvasSidebar';
import { CanvasDetailPanel } from '@/components/canvas/CanvasDetailPanel';
import { CanvasHeader } from '@/components/canvas/CanvasHeader';
import { CanvasScriptPanel } from '@/components/canvas/CanvasScriptPanel';
import { useCanvasProjects } from '@/hooks/use-canvas-projects';
import { useCanvasAgent } from '@/hooks/use-canvas-agent';
import { CanvasEmptyState } from '@/components/canvas/CanvasEmptyState';
import { CanvasProject, CanvasScene } from '@/types/canvas';

export default function Canvas() {
  const [showScriptPanel, setShowScriptPanel] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(true);
  
  // Get canvas projects and related data/methods
  const {
    projects,
    project,
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
    fetchProject,
    isLoading
  } = useCanvasProjects();
  
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
    sceneId: selectedSceneId || undefined,
    updateScene
  });
  
  // Effect to load project data on mount
  useEffect(() => {
    if (projectId) {
      fetchProject(projectId);
    }
  }, [projectId, fetchProject]);
  
  // Toggle panels
  const toggleScriptPanel = () => setShowScriptPanel(!showScriptPanel);
  const toggleDetailPanel = () => setShowDetailPanel(!showDetailPanel);
  
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
    isGeneratingDescription,
    isGeneratingImagePrompt,
    isGeneratingImage,
    isGeneratingVideo,
    isGeneratingScript,
    isGenerating: isGeneratingScript || isGeneratingDescription || isGeneratingImagePrompt || isGeneratingImage || isGeneratingVideo
  };
  
  // Project creation if no project exists
  if (!project && !loading) {
    return <CanvasEmptyState onCreateProject={createProject} />;
  }
  
  return (
    <div className="flex flex-col h-screen">
      <CanvasHeader 
        project={project}
        onUpdateProject={updateProject}
        showScriptPanel={showScriptPanel}
        showDetailPanel={showDetailPanel}
        onToggleScriptPanel={toggleScriptPanel}
        onToggleDetailPanel={toggleDetailPanel}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <CanvasSidebar 
          project={project}
          scenes={scenes}
          selectedScene={selectedScene}
          selectedSceneId={selectedSceneId || null}
          setSelectedSceneId={setSelectedSceneId}
          createScene={createScene}
          deleteScene={deleteScene}
          loading={loading}
        />
        
        <main className="flex-1 overflow-hidden flex flex-col bg-[#1a1a1a]">
          <CanvasWorkspace 
            project={project}
            selectedScene={selectedScene}
            selectedSceneId={selectedSceneId || ""}
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
