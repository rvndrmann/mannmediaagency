
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
  
  // Initialize canvas context
  const {
    project,
    scenes,
    selectedScene,
    selectedSceneId,
    setSelectedSceneId,
    createProject,
    createScene,
    updateScene,
    deleteScene,
    loading,
    updateProject,
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
    sendCanvasMessage,
    isGenerating,
    generatedContent,
    setGeneratedContent,
    generateImage,
    isMcpConnected
  } = useCanvasAgent(project, selectedScene);
  
  // Initialize messages context
  const { messages, addMessage } = useCanvasMessages();
  
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
    return <CanvasEmptyState onCreate={createProject} />;
  }
  
  // Enhanced context with fetchProjects method
  const enhancedContext = {
    project,
    scenes, 
    selectedScene,
    selectedSceneId,
    setSelectedSceneId,
    createProject,
    createScene,
    updateScene,
    deleteScene,
    loading,
    updateProject,
    projectId,
    fetchProject,
    fetchProjects
  };
  
  return (
    <div className="flex flex-col h-screen">
      <CanvasHeader 
        project={project}
        toggleScriptPanel={toggleScriptPanel}
        toggleDetailPanel={toggleDetailPanel}
        showScriptPanel={showScriptPanel}
        showDetailPanel={showDetailPanel}
        updateProject={updateProject}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <CanvasSidebar 
          context={enhancedContext}
          loading={loading}
        />
        
        <main className="flex-1 overflow-hidden flex flex-col bg-[#1a1a1a]">
          <CanvasWorkspace 
            context={enhancedContext}
            agent={{
              sendCanvasMessage,
              isGenerating,
              generatedContent,
              setGeneratedContent,
              generateImage,
              messages,
              addMessage,
              isMcpConnected
            }}
          />
        </main>
        
        {showDetailPanel && (
          <CanvasDetailPanel 
            context={enhancedContext}
            agent={{
              sendCanvasMessage,
              isGenerating,
              generatedContent,
              setGeneratedContent,
              generateImage,
              messages,
              addMessage,
              isMcpConnected
            }}
          />
        )}
        
        {showScriptPanel && (
          <CanvasScriptPanel 
            project={project}
            updateProject={updateProject}
          />
        )}
      </div>
    </div>
  );
}
