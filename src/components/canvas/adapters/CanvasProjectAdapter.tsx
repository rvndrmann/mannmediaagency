
import React from 'react';
import { CanvasEmptyState } from '../CanvasEmptyState';
import { CanvasHeader } from '../CanvasHeader';
import { CanvasSidebar } from '../CanvasSidebar';
import { CanvasWorkspace } from '../CanvasWorkspace';
import { CanvasDetailPanel } from '../CanvasDetailPanel';
import { CanvasScriptPanel } from '../CanvasScriptPanel';
import { CanvasProject, CanvasScene } from '@/types/canvas';

// Adapter interfaces
interface CanvasEmptyStateAdapterProps {
  createProject: (title: string, description?: string) => Promise<any>;
}

interface CanvasHeaderAdapterProps {
  project: CanvasProject | null;
  updateProject: (id: string, data: any) => Promise<any>;
  onToggleScriptPanel: () => void;
  onToggleDetailPanel: () => void;
  onToggleChatPanel: () => void;
  showChatButton?: boolean;
}

interface CanvasSidebarAdapterProps {
  project: CanvasProject | null;
  selectedSceneId: string | null;
  setSelectedSceneId: (id: string) => void;
  createScene: (projectId: string, data: any) => Promise<any>;
  deleteScene: (id: string) => Promise<void>;
  loading?: boolean;
}

interface CanvasWorkspaceAdapterProps {
  project: CanvasProject | null;
  selectedScene: CanvasScene | null;
  selectedSceneId: string | null;
  setSelectedSceneId: (id: string | null) => void;
  updateScene: (id: string, type: string, value: string) => Promise<void>;
  addScene: () => Promise<string | undefined>;
  deleteScene: (id: string) => Promise<void>;
  divideScriptToScenes: (sceneScripts: Array<{ id: string; content: string; voiceOverText?: string }>) => Promise<void>;
  saveFullScript: (script: string) => Promise<void>;
  createNewProject: (title: string, description?: string) => Promise<string>;
  updateProjectTitle: (title: string) => Promise<void>;
  agent?: any;
}

interface CanvasDetailPanelAdapterProps {
  scene: CanvasScene | null;
  projectId: string;
  updateScene: (id: string, type: string, value: string) => Promise<void>;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

interface CanvasScriptPanelAdapterProps {
  project: CanvasProject | null;
  projectId: string;
  onUpdateScene: (id: string, type: string, value: string) => Promise<void>;
  onClose: () => void;
  saveFullScript: (script: string) => Promise<void>;
  divideScriptToScenes: (sceneScripts: Array<{ id: string; content: string; voiceOverText?: string }>) => Promise<void>;
}

// Empty State Adapter
export const CanvasEmptyStateAdapter: React.FC<CanvasEmptyStateAdapterProps> = ({ createProject }) => {
  return (
    <CanvasEmptyState 
      onCreateProject={createProject} 
    />
  );
};

// Header Adapter
export const CanvasHeaderAdapter: React.FC<CanvasHeaderAdapterProps> = ({ 
  project, 
  updateProject, 
  onToggleScriptPanel, 
  onToggleDetailPanel, 
  onToggleChatPanel,
  showChatButton = false
}) => {
  return (
    <CanvasHeader 
      title={project?.title || "Canvas"}
      onUpdateTitle={(title) => project?.id && updateProject(project.id, { title })}
      onToggleScriptPanel={onToggleScriptPanel}
      onToggleDetailPanel={onToggleDetailPanel}
      onToggleChatPanel={onToggleChatPanel}
      showChatButton={showChatButton}
    />
  );
};

// Sidebar Adapter
export const CanvasSidebarAdapter: React.FC<CanvasSidebarAdapterProps> = ({ 
  project, 
  selectedSceneId, 
  setSelectedSceneId, 
  createScene, 
  deleteScene,
  loading
}) => {
  // Create an addScene function for CanvasSidebar that uses the createScene function
  const addScene = async () => {
    if (!project) return;
    const newScene = await createScene(project.id, { title: "New Scene" });
    return newScene ? newScene.id : undefined;
  };

  return (
    <CanvasSidebar
      project={project}
      selectedSceneId={selectedSceneId}
      setSelectedSceneId={setSelectedSceneId}
      addScene={addScene}
      deleteScene={deleteScene}
      collapsed={false}
      loading={loading}
    />
  );
};

// Workspace Adapter
export const CanvasWorkspaceAdapter: React.FC<CanvasWorkspaceAdapterProps> = ({
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
}) => {
  return (
    <CanvasWorkspace
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
      agent={agent}
    />
  );
};

// Detail Panel Adapter
export const CanvasDetailPanelAdapter: React.FC<CanvasDetailPanelAdapterProps> = ({
  scene,
  projectId,
  updateScene,
  collapsed,
  setCollapsed
}) => {
  return (
    <CanvasDetailPanel
      scene={scene}
      projectId={projectId}
      onUpdateScene={updateScene}
      collapsed={collapsed}
      setCollapsed={setCollapsed}
    />
  );
};

// Script Panel Adapter
export const CanvasScriptPanelAdapter: React.FC<CanvasScriptPanelAdapterProps> = ({
  project,
  projectId,
  onUpdateScene,
  onClose,
  saveFullScript,
  divideScriptToScenes
}) => {
  return (
    <CanvasScriptPanel
      project={project}
      projectId={projectId}
      onUpdateScene={onUpdateScene}
      onClose={onClose}
      saveFullScript={saveFullScript}
      divideScriptToScenes={divideScriptToScenes}
    />
  );
};
