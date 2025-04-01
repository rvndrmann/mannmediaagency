
import React from 'react';
import { CanvasProject, CanvasScene } from '@/types/canvas';
import { CanvasEmptyState } from '@/components/canvas/CanvasEmptyState';
import { CanvasHeader } from '@/components/canvas/CanvasHeader';
import { CanvasSidebar } from '@/components/canvas/CanvasSidebar';
import { CanvasWorkspace } from '@/components/canvas/CanvasWorkspace';
import { CanvasDetailPanel } from '@/components/canvas/CanvasDetailPanel';
import { CanvasScriptPanel } from '@/components/canvas/CanvasScriptPanel';

// Type definitions for the adapter props
export interface CanvasEmptyStateProps {
  onCreateProject: (title: string, description?: string) => Promise<string>;
}

export interface CanvasHeaderProps {
  project: CanvasProject | null;
  updateProject: (id: string, updates: Partial<CanvasProject>) => Promise<CanvasProject>;
  showScriptPanel: boolean;
  showDetailPanel: boolean;
  onToggleScriptPanel: () => void;
  onToggleDetailPanel: () => void;
}

export interface CanvasSidebarProps {
  project: CanvasProject | null;
  selectedScene: CanvasScene | null;
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
  agent: any;
}

export interface CanvasScriptPanelProps {
  projectId: string;
  onUpdateScene: (sceneId: string, type: string, value: string) => Promise<void>;
  onClose: () => void;
}

export interface CanvasDetailPanelProps {
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
      updateProject={props.updateProject}
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
      selectedScene={props.selectedScene}
      selectedSceneId={props.selectedSceneId}
      setSelectedSceneId={props.setSelectedSceneId}
      createScene={props.createScene}
      deleteScene={props.deleteScene}
      loading={props.loading}
    />
  );
};

export const CanvasWorkspaceAdapter: React.FC<any> = (props) => {
  return (
    <CanvasWorkspace
      project={props.project}
      selectedScene={props.selectedScene}
      selectedSceneId={props.selectedSceneId || ""}
      setSelectedSceneId={props.setSelectedSceneId}
      updateScene={props.updateScene}
      agent={props.agent}
    />
  );
};

export const CanvasScriptPanelAdapter: React.FC<any> = (props) => {
  return (
    <CanvasScriptPanel
      projectId={props.projectId || ''}
      onUpdateScene={props.onUpdateScene}
      onClose={props.onClose}
    />
  );
};

export const CanvasDetailPanelAdapter: React.FC<any> = (props) => {
  return (
    <CanvasDetailPanel
      projectId={props.projectId || ''}
      updateScene={props.updateScene}
      collapsed={props.collapsed}
      setCollapsed={props.setCollapsed}
    />
  );
};
