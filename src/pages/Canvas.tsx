
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
  
  // Simulate the missing methods that would be in useCanvasProjects
  const createScene = async (projectId, data) => {
    console.log('Creating scene for project', projectId, data);
    // Mock implementation
    return { id: 'mock-scene-id', title: 'New Scene', projectId };
  };
  
  const updateScene = async (sceneId, type, value) => {
    console.log('Updating scene', sceneId, type, value);
    // Mock implementation
  };
  
  const deleteScene = async (sceneId) => {
    console.log('Deleting scene', sceneId);
    // Mock implementation
  };
  
  const fetchProject = async (id) => {
    setLoading(true);
    console.log('Fetching project', id);
    // Mock implementation
    setLoading(false);
  };
  
  // Initialize agent context with mock/default values
  const mockAgentProps = {
    isLoading: false,
    messages: [],
    generateSceneScript: async () => true,
    generateSceneDescription: async () => true,
    generateImagePrompt: async () => true,
    generateSceneImage: async () => true,
    generateSceneVideo: async () => true,
    addUserMessage: () => {},
    addAgentMessage: () => {},
    addSystemMessage: () => {},
    activeAgent: 'main'
  };
  
  // Initialize agent context with additional mocked properties
  const agentProps = {
    ...mockAgentProps,
    isMcpEnabled: false,
    isMcpConnected: false,
    toggleMcp: () => {},
    isGeneratingDescription: false,
    isGeneratingImagePrompt: false,
    isGeneratingImage: false,
    isGeneratingVideo: false,
    isGeneratingScript: false,
    isGenerating: false
  };
  
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
    return <CanvasEmptyStateAdapter createProject={createProject} />;
  }
  
  return (
    <div className="flex flex-col h-screen">
      <CanvasHeaderAdapter 
        project={project}
        updateProject={updateProject}
        showScriptPanel={showScriptPanel}
        showDetailPanel={showDetailPanel}
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
            selectedSceneId={selectedSceneId || ""}
            setSelectedSceneId={setSelectedSceneId}
            updateScene={updateScene}
            agent={agentProps}
          />
        </main>
        
        {showDetailPanel && (
          <CanvasDetailPanelAdapter 
            scene={selectedScene}
            projectId={projectId || ''}
            updateScene={updateScene}
            collapsed={false}
            setCollapsed={() => setShowDetailPanel(false)}
          />
        )}
        
        {showScriptPanel && (
          <CanvasScriptPanelAdapter 
            project={project}
            projectId={projectId || ''}
            onUpdateScene={updateScene}
            onClose={() => setShowScriptPanel(false)}
          />
        )}
      </div>
    </div>
  );
}
