
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

// Updated to match actual CanvasHeader component props
export interface CanvasHeaderProps {
  project: CanvasProject | null;
  onChatToggle: () => void;
  showChatButton: boolean;
  onFullChatOpen: () => void;
  onShowHistory: () => void;
  onUpdateTitle?: (title: string) => Promise<void>;
}

// Updated to match actual CanvasSidebar component props
export interface CanvasSidebarProps {
  project: CanvasProject;
  selectedSceneId: string | null;
  setSelectedSceneId: (id: string) => void;
  addScene: () => Promise<string | undefined>;
  deleteScene: (id: string) => Promise<void>;
  collapsed: boolean;
}

// Updated to match actual CanvasWorkspace component props
export interface CanvasWorkspaceProps {
  project: CanvasProject | null;
  selectedScene: CanvasScene | null;
  selectedSceneId: string | null;
  setSelectedSceneId: (id: string | null) => void;
  addScene: () => Promise<void>;
  deleteScene: (id: string) => Promise<void>;
  updateScene: (sceneId: string, type: string, value: string) => Promise<void>;
  divideScriptToScenes: (sceneScripts: Array<{ id: string; content: string; voiceOverText?: string }>) => Promise<void>;
  saveFullScript: (script: string) => Promise<void>;
  createNewProject: (title: string, description?: string) => Promise<string>;
  updateProjectTitle: (title: string) => Promise<void>;
}

// Updated to match actual CanvasScriptPanel component props
export interface CanvasScriptPanelProps {
  project: CanvasProject;
  onClose: () => void;
  saveFullScript: (script: string) => Promise<void>;
  divideScriptToScenes: (sceneScripts: Array<{ id: string; content: string; voiceOverText?: string }>) => Promise<void>;
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
  // Map props from Canvas.tsx to what CanvasHeader expects
  const onUpdateTitle = props.updateProject 
    ? async (title: string) => {
        if (props.project && props.project.id) {
          await props.updateProject(props.project.id, { title });
        }
      }
    : undefined;

  return (
    <CanvasHeader
      project={props.project}
      onChatToggle={props.onToggleScriptPanel || (() => {})}
      showChatButton={true}
      onFullChatOpen={props.onToggleDetailPanel || (() => {})}
      onShowHistory={() => {}}
      onUpdateTitle={onUpdateTitle}
    />
  );
};

export const CanvasSidebarAdapter: React.FC<any> = (props) => {
  // Map createScene to addScene for compatibility
  const addScene = async () => {
    if (props.project && props.createScene) {
      const newScene = await props.createScene(props.project.id, { title: "New Scene" });
      return newScene ? newScene.id : undefined;
    }
    return undefined;
  };

  return (
    <CanvasSidebar
      project={props.project || { id: "", title: "", scenes: [], user_id: "" }}
      selectedSceneId={props.selectedSceneId}
      setSelectedSceneId={props.setSelectedSceneId}
      addScene={addScene}
      deleteScene={props.deleteScene}
      collapsed={false}
    />
  );
};

export const CanvasWorkspaceAdapter: React.FC<any> = (props) => {
  // Filter out the agent prop which isn't expected by CanvasWorkspace
  const { agent, ...workspaceProps } = props;
  
  // Provide defaults for missing methods
  const divideScriptToScenes = async (sceneScripts: Array<{ id: string; content: string; voiceOverText?: string }>) => {
    console.log("Dividing script to scenes", sceneScripts);
    // Map to updateScene calls if possible
    if (props.updateScene) {
      for (const scene of sceneScripts) {
        if (scene.content) {
          await props.updateScene(scene.id, 'script', scene.content);
        }
        if (scene.voiceOverText) {
          await props.updateScene(scene.id, 'voiceOverText', scene.voiceOverText);
        }
      }
    }
  };

  const saveFullScript = async (script: string) => {
    console.log("Saving full script", script);
    // No-op if not implemented
  };

  const createNewProject = async (title: string, description?: string) => {
    console.log("Creating new project", title, description);
    return "";
  };

  const updateProjectTitle = async (title: string) => {
    console.log("Updating project title", title);
    // Use updateProject if available
    if (props.project && props.project.id && props.updateProject) {
      await props.updateProject(props.project.id, { title });
    }
  };
  
  return (
    <CanvasWorkspace
      project={workspaceProps.project}
      selectedScene={workspaceProps.selectedScene}
      selectedSceneId={workspaceProps.selectedSceneId}
      setSelectedSceneId={workspaceProps.setSelectedSceneId}
      updateScene={workspaceProps.updateScene}
      addScene={props.addScene || (async () => {})}
      deleteScene={props.deleteScene || (async () => {})}
      divideScriptToScenes={divideScriptToScenes}
      saveFullScript={saveFullScript}
      createNewProject={createNewProject}
      updateProjectTitle={updateProjectTitle}
    />
  );
};

export const CanvasScriptPanelAdapter: React.FC<any> = (props) => {
  // Provide implementations for required methods
  const saveFullScript = async (script: string) => {
    console.log("Saving full script", script);
    // No-op if not implemented
  };

  const divideScriptToScenes = async (sceneScripts: Array<{ id: string; content: string; voiceOverText?: string }>) => {
    console.log("Dividing script to scenes", sceneScripts);
    // Map to updateScene calls if possible
    if (props.onUpdateScene) {
      for (const scene of sceneScripts) {
        if (scene.content) {
          await props.onUpdateScene(scene.id, 'script', scene.content);
        }
        if (scene.voiceOverText) {
          await props.onUpdateScene(scene.id, 'voiceOverText', scene.voiceOverText);
        }
      }
    }
  };

  return (
    <CanvasScriptPanel
      project={props.project || { id: props.projectId, title: '', user_id: '' }}
      onClose={props.onClose}
      saveFullScript={props.saveFullScript || saveFullScript}
      divideScriptToScenes={props.divideScriptToScenes || divideScriptToScenes}
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
