
import React from 'react';
import { CanvasProject, CanvasScene } from '@/types/canvas';
import { CanvasEmptyState } from '@/components/canvas/CanvasEmptyState';
import { CanvasHeader } from '@/components/canvas/CanvasHeader';
import { CanvasSidebar } from '@/components/canvas/CanvasSidebar';
import { CanvasWorkspace } from '@/components/canvas/CanvasWorkspace';
import { CanvasDetailPanel } from '@/components/canvas/CanvasDetailPanel';
import { CanvasScriptPanel } from '@/components/canvas/CanvasScriptPanel';

// Fixed interface definitions based on actual component requirements
export interface CanvasEmptyStateProps {
  onCreateProject: (title: string, description?: string) => Promise<string>;
}

export interface CanvasHeaderProps {
  project: CanvasProject | null;
  onUpdateProject: (id: string, updates: Partial<CanvasProject>) => Promise<CanvasProject>;
  showScriptPanel: boolean;
  showDetailPanel: boolean;
  onToggleScriptPanel: () => void;
  onToggleDetailPanel: () => void;
}

export interface CanvasSidebarProps {
  project: CanvasProject | null;
  selectedSceneId: string | null;
  setSelectedSceneId: (id: string | null) => void;
  createScene: (projectId: string, data: any) => Promise<CanvasScene>;
  deleteScene: (sceneId: string) => Promise<void>;
  loading: boolean;
}

export interface CanvasWorkspaceProps {
  project: CanvasProject | null;
  selectedScene: CanvasScene | null;
  selectedSceneId: string;
  setSelectedSceneId: (id: string | null) => void;
  updateScene: (sceneId: string, type: string, value: string) => Promise<void>;
}

export interface CanvasScriptPanelProps {
  project: CanvasProject;
  onUpdateScene: (sceneId: string, type: string, value: string) => Promise<void>;
  onClose: () => void;
}

export interface CanvasDetailPanelProps {
  scene: CanvasScene | null;
  projectId: string;
  updateScene: (sceneId: string, type: string, value: string) => Promise<void>;
  collapsed: boolean;
  setCollapsed: () => void;
}

// Adapter components
export const CanvasEmptyStateAdapter: React.FC<any> = (props) => {
  const createProject = async (title: string, description?: string) => {
    const project = await props.createProject(title, description);
    return project.id || "";
  };

  return <CanvasEmptyState onCreateProject={createProject} />;
};

export const CanvasHeaderAdapter: React.FC<any> = (props) => {
  return (
    <CanvasHeader
      project={props.project}
      onUpdateProject={props.updateProject}
      showScriptPanel={props.showScriptPanel}
      showDetailPanel={props.showDetailPanel}
      onToggleScriptPanel={props.onToggleScriptPanel}
      onToggleDetailPanel={props.onToggleDetailPanel}
    />
  );
};

export const CanvasSidebarAdapter: React.FC<any> = (props) => {
  return (
    <CanvasSidebar
      project={props.project}
      selectedSceneId={props.selectedSceneId}
      setSelectedSceneId={props.setSelectedSceneId}
      createScene={props.createScene}
      deleteScene={props.deleteScene}
      loading={props.loading}
    />
  );
};

export const CanvasWorkspaceAdapter: React.FC<any> = (props) => {
  // Filter out the agent prop which isn't expected by CanvasWorkspace
  const { agent, ...workspaceProps } = props;
  
  return (
    <CanvasWorkspace
      project={workspaceProps.project}
      selectedScene={workspaceProps.selectedScene}
      selectedSceneId={workspaceProps.selectedSceneId || ""}
      setSelectedSceneId={workspaceProps.setSelectedSceneId}
      updateScene={workspaceProps.updateScene}
    />
  );
};

export const CanvasScriptPanelAdapter: React.FC<any> = (props) => {
  return (
    <CanvasScriptPanel
      project={props.project || { id: props.projectId, title: '', user_id: '' }}
      onUpdateScene={props.onUpdateScene}
      onClose={props.onClose}
    />
  );
};

export const CanvasDetailPanelAdapter: React.FC<any> = (props) => {
  return (
    <CanvasDetailPanel
      scene={props.scene}
      projectId={props.projectId || ''}
      updateScene={props.updateScene}
      collapsed={props.collapsed}
      setCollapsed={props.setCollapsed}
    />
  );
};
