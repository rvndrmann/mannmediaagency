
import React from 'react';
import { CanvasHeader, CanvasHeaderProps } from '../CanvasHeader';
import { CanvasEmptyState } from '../CanvasEmptyState';
import { CanvasSidebar } from '../CanvasSidebar';
import { CanvasWorkspace } from '../CanvasWorkspace';
import { CanvasDetailPanel } from '../CanvasDetailPanel';
import { CanvasScriptPanel } from '../CanvasScriptPanel';
import { CanvasProject, CanvasScene } from '@/types/canvas';

// Adapter components that map between the core components and whatever 
// data structures/contexts your app uses

export const CanvasEmptyStateAdapter = ({ createProject }: { 
  createProject: (title: string, description?: string) => Promise<string> 
}) => {
  return <CanvasEmptyState onCreateProject={createProject} />;
};

export const CanvasHeaderAdapter = ({ 
  project, 
  updateProject,
  onToggleScriptPanel,
  onToggleDetailPanel,
  onToggleChatPanel,
  showChatButton = true
}: { 
  project: CanvasProject | null;
  updateProject: (id: string, data: Partial<CanvasProject>) => Promise<void>;
  onToggleScriptPanel?: () => void;
  onToggleDetailPanel?: () => void;
  onToggleChatPanel?: () => void;
  showChatButton?: boolean;
}) => {
  const handleUpdateTitle = async (title: string) => {
    if (project) {
      await updateProject(project.id, { title });
      return title; // Return the title to satisfy the promise type
    }
    return '';
  };

  const headerProps: CanvasHeaderProps = {
    title: project?.title || 'Untitled Project',
    onUpdateTitle: handleUpdateTitle,
    onToggleDetailPanel,
    onToggleChatPanel,
    onToggleScriptPanel,
    showChatButton
  };

  return <CanvasHeader {...headerProps} />;
};

export const CanvasSidebarAdapter = ({
  project,
  selectedSceneId,
  setSelectedSceneId,
  createScene,
  deleteScene,
  loading
}: {
  project: CanvasProject | null;
  selectedSceneId: string | null;
  setSelectedSceneId: (id: string | null) => void;
  createScene: (projectId: string, data: any) => Promise<any>;
  deleteScene: (id: string) => Promise<void>;
  loading: boolean;
}) => {
  if (!project) return null;
  
  return (
    <CanvasSidebar
      projectId={project.id}
      scenes={project.scenes || []}
      selectedSceneId={selectedSceneId}
      onSelectScene={setSelectedSceneId}
      onCreateScene={() => createScene(project.id, { title: 'New Scene' })}
      onDeleteScene={deleteScene}
      loading={loading}
    />
  );
};

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
  updateScene: (id: string, field: string, value: string) => Promise<void>;
  addScene: () => Promise<string | undefined>;
  deleteScene: (id: string) => Promise<void>;
  divideScriptToScenes: (sceneScripts: Array<{ id: string; content: string; voiceOverText?: string }>) => Promise<void>;
  saveFullScript: (script: string) => Promise<void>;
  createNewProject: (title: string, description?: string) => Promise<string>;
  updateProjectTitle: (title: string) => Promise<void>;
  agent: any;
}) => {
  if (!project) return null;
  
  // Ensure addScene returns void to match the expected type
  const handleAddScene = async (): Promise<void> => {
    await addScene();
  };
  
  return (
    <CanvasWorkspace
      project={project}
      selectedScene={selectedScene}
      onSelectScene={setSelectedSceneId}
      onUpdateScene={updateScene}
      onAddScene={handleAddScene}
      onDeleteScene={deleteScene}
      onDivideScriptToScenes={divideScriptToScenes}
      onSaveFullScript={saveFullScript}
      onCreateProject={createNewProject}
      onUpdateProjectTitle={updateProjectTitle}
      agent={agent}
    />
  );
};

export const CanvasDetailPanelAdapter = ({
  scene,
  projectId,
  updateScene,
  collapsed,
  setCollapsed
}: {
  scene: CanvasScene | null;
  projectId: string;
  updateScene: (id: string, field: string, value: string) => Promise<void>;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}) => {
  if (!scene) return null;
  
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

export const CanvasScriptPanelAdapter = ({
  project,
  projectId,
  onUpdateScene,
  onClose,
  saveFullScript,
  divideScriptToScenes
}: {
  project: CanvasProject | null;
  projectId: string;
  onUpdateScene: (id: string, field: string, value: string) => Promise<void>;
  onClose: () => void;
  saveFullScript: (script: string) => Promise<void>;
  divideScriptToScenes: (sceneScripts: Array<{ id: string; content: string; voiceOverText?: string }>) => Promise<void>;
}) => {
  if (!project) return null;
  
  return (
    <CanvasScriptPanel
      project={project}
      projectId={projectId}
      onUpdateScene={onUpdateScene}
      onClose={onClose}
      onSaveFullScript={saveFullScript}
      onDivideScriptToScenes={divideScriptToScenes}
    />
  );
};
