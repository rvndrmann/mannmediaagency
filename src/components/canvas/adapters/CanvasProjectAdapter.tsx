
import React from 'react';
import { CanvasProject, CanvasScene } from '@/types/canvas';
import { CanvasSidebar } from '@/components/canvas/CanvasSidebar';
import { CanvasWorkspace } from '@/components/canvas/CanvasWorkspace';
import { CanvasDetailPanel } from '@/components/canvas/CanvasDetailPanel';
import { CanvasScriptPanel } from '@/components/canvas/CanvasScriptPanel';
import { CanvasHeader } from '@/components/canvas/CanvasHeader';
import { CanvasEmptyState } from '@/components/canvas/CanvasEmptyState';

// Adapter for CanvasEmptyState
export const CanvasEmptyStateAdapter = ({ 
  createProject 
}: { 
  createProject: (title: string, description?: string) => Promise<any> 
}) => {
  return (
    <CanvasEmptyState onCreateProject={createProject} />
  );
};

// Adapter for CanvasHeader
export const CanvasHeaderAdapter = ({ 
  project, 
  updateProject,
  onToggleScriptPanel,
  onToggleDetailPanel,
  onToggleChatPanel,
  showChatButton = true
}: { 
  project: CanvasProject | null;
  updateProject: (id: string, updates: Partial<CanvasProject>) => Promise<any>;
  onToggleScriptPanel?: () => void;
  onToggleDetailPanel?: () => void;
  onToggleChatPanel?: () => void;
  showChatButton?: boolean;
}) => {
  const handleUpdateTitle = async (title: string) => {
    if (project) {
      await updateProject(project.id, { title });
    }
  };
  
  return (
    <CanvasHeader 
      title={project?.title} 
      onUpdateTitle={handleUpdateTitle}
      onToggleScriptPanel={onToggleScriptPanel}
      onToggleDetailPanel={onToggleDetailPanel}
      onToggleChatPanel={onToggleChatPanel}
      showChatButton={showChatButton}
    />
  );
};

// Adapter for CanvasSidebar
export const CanvasSidebarAdapter = ({ 
  project,
  selectedSceneId,
  setSelectedSceneId,
  createScene,
  deleteScene,
  loading = false
}: { 
  project: CanvasProject | null;
  selectedSceneId: string | null;
  setSelectedSceneId: (id: string | null) => void;
  createScene: (projectId: string, data: any) => Promise<any>;
  deleteScene: (id: string) => Promise<void>;
  loading?: boolean;
}) => {
  const handleAddScene = async () => {
    if (project) {
      await createScene(project.id, { title: 'New Scene' });
    }
  };
  
  const handleSetSelectedScene = (id: string) => {
    setSelectedSceneId(id);
  };
  
  return (
    <CanvasSidebar 
      project={project}
      selectedSceneId={selectedSceneId}
      setSelectedSceneId={handleSetSelectedScene}
      addScene={handleAddScene}
      deleteScene={deleteScene}
      collapsed={false}
      loading={loading}
    />
  );
};

// Adapter for CanvasWorkspace
export const CanvasWorkspaceAdapter = ({ 
  project,
  selectedScene,
  selectedSceneId,
  setSelectedSceneId,
  updateScene,
  addScene,
  deleteScene,
  divideScriptToScenes,
  saveFullScript,
  createNewProject,
  updateProjectTitle,
  agent
}: { 
  project: CanvasProject | null;
  selectedScene: CanvasScene | null;
  selectedSceneId: string | null;
  setSelectedSceneId: (id: string | null) => void;
  updateScene: (id: string, type: string, value: string) => Promise<void>;
  addScene: () => Promise<any>;
  deleteScene: (id: string) => Promise<void>;
  divideScriptToScenes: (sceneScripts: Array<{ id: string; content: string; voiceOverText?: string }>) => Promise<void>;
  saveFullScript: (script: string) => Promise<void>;
  createNewProject: (title: string, description?: string) => Promise<string>;
  updateProjectTitle: (title: string) => Promise<void>;
  agent?: any;
}) => {
  return (
    <CanvasWorkspace 
      project={project}
      selectedScene={selectedScene}
      selectedSceneId={selectedSceneId}
      setSelectedSceneId={setSelectedSceneId}
      addScene={addScene}
      deleteScene={deleteScene}
      updateScene={updateScene}
      divideScriptToScenes={divideScriptToScenes}
      saveFullScript={saveFullScript}
      createNewProject={createNewProject}
      updateProjectTitle={updateProjectTitle}
      agent={agent}
    />
  );
};

// Adapter for CanvasDetailPanel
export const CanvasDetailPanelAdapter = ({ 
  scene,
  projectId,
  updateScene: onUpdateScene,
  collapsed,
  setCollapsed
}: { 
  scene: CanvasScene | null;
  projectId: string;
  updateScene: (id: string, field: string, value: string) => Promise<void>;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}) => {
  return (
    <CanvasDetailPanel 
      scene={scene}
      projectId={projectId}
      updateScene={onUpdateScene}
      collapsed={collapsed}
      setCollapsed={setCollapsed}
    />
  );
};

// Adapter for CanvasScriptPanel
export const CanvasScriptPanelAdapter = ({ 
  project,
  projectId,
  onUpdateScene,
  onClose,
  onSaveFullScript: saveFullScript,
  onDivideScriptToScenes: divideScriptToScenes
}: { 
  project: CanvasProject | null;
  projectId: string;
  onUpdateScene: (id: string, field: string, value: string) => Promise<void>;
  onClose: () => void;
  onSaveFullScript: (script: string) => Promise<void>;
  onDivideScriptToScenes: (sceneScripts: Array<{ id: string; content: string; voiceOverText?: string }>) => Promise<void>;
}) => {
  return (
    <CanvasScriptPanel 
      project={project}
      projectId={projectId}
      updateScene={onUpdateScene}
      onClose={onClose}
      saveFullScript={saveFullScript}
      divideScriptToScenes={divideScriptToScenes}
    />
  );
};
