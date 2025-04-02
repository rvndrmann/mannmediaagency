
import { 
  CanvasProject, 
  CanvasScene, 
  SceneUpdateType 
} from '@/types/canvas';
import { CanvasHeader } from '../CanvasHeader';
import { CanvasSidebar } from '../CanvasSidebar';
import { CanvasWorkspace } from '../CanvasWorkspace';
import { CanvasEmptyState } from '../CanvasEmptyState';
import { CanvasDetailPanel } from '../CanvasDetailPanel';
import { CanvasScriptPanel } from '../CanvasScriptPanel';

// Adapter type for CanvasEmptyState
interface CanvasEmptyStateAdapterProps {
  createProject: (title: string, description?: string) => Promise<string>;
}

// Adapter type for CanvasHeader
interface CanvasHeaderAdapterProps {
  project: CanvasProject | null;
  updateProject: (projectId: string, data: any) => Promise<any>;
  onToggleScriptPanel: () => void;
  onToggleDetailPanel: () => void;
  // Removed chat panel props
  // onToggleChatPanel: () => void;
  // showChatButton?: boolean;
  onNavigateToChat: () => void; // Add new prop for navigation
  createNewProject: (title: string, description?: string) => Promise<string>; // Add prop type
}

// Adapter type for CanvasSidebar
interface CanvasSidebarAdapterProps {
  project: CanvasProject | null;
  selectedSceneId: string | null;
  setSelectedSceneId: (sceneId: string | null) => void;
  createScene: (data: any) => Promise<any>;
  deleteScene: (sceneId: string) => Promise<void>;
  loading: boolean;
  setActiveScene: (sceneId: string | null) => void; // Add prop type
}

// Adapter type for CanvasWorkspace
interface CanvasWorkspaceAdapterProps {
  project: CanvasProject | null;
  selectedScene: CanvasScene | null;
  selectedSceneId: string | null;
  setSelectedSceneId: (sceneId: string | null) => void;
  updateScene: (sceneId: string, type: SceneUpdateType, value: string) => Promise<void>;
  addScene: () => Promise<void>;
  deleteScene: (sceneId: string) => Promise<void>;
  divideScriptToScenes: (sceneScripts: Array<{ id: string; content: string; voiceOverText?: string }>) => Promise<void>;
  saveFullScript: (script: string) => Promise<void>;
  createNewProject: (title: string, description?: string) => Promise<string>;
  updateProjectTitle: (title: string) => Promise<void>;
  agent?: any;
}

// Adapter type for CanvasDetailPanel
interface CanvasDetailPanelAdapterProps {
  scene: CanvasScene | null;
  projectId: string;
  updateScene: (sceneId: string, type: SceneUpdateType, value: string) => Promise<void>;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

// Adapter type for CanvasScriptPanel
interface CanvasScriptPanelAdapterProps {
  project: CanvasProject | null;
  projectId: string;
  onUpdateScene: (sceneId: string, type: SceneUpdateType, value: string) => Promise<void>;
  onClose: () => void;
  saveFullScript: (script: string) => Promise<void>;
  divideScriptToScenes: (sceneScripts: Array<{ id: string; content: string; voiceOverText?: string }>) => Promise<void>;
}

// Adapter components
export function CanvasEmptyStateAdapter({ createProject }: CanvasEmptyStateAdapterProps) {
  const handleCreateProject = async (title: string, description?: string) => {
    return await createProject(title, description);
  };
  
  return <CanvasEmptyState onCreateProject={handleCreateProject} />;
}

export function CanvasHeaderAdapter({ 
  project, 
  updateProject, 
  onToggleScriptPanel,
  onToggleDetailPanel,
  // Removed chat panel props from destructuring
  // onToggleChatPanel,
  // showChatButton = false,
  onNavigateToChat, // Destructure new prop
  createNewProject // Destructure prop
}: CanvasHeaderAdapterProps) {
  const title = project?.title || 'Untitled Project';
  
  const handleUpdateTitle = async (newTitle: string) => {
    if (project) {
      return await updateProject(project.id, { title: newTitle });
    }
  };
  
  return (
    <CanvasHeader 
      title={title}
      onUpdateTitle={handleUpdateTitle}
      onToggleScriptPanel={onToggleScriptPanel}
      onToggleDetailPanel={onToggleDetailPanel}
      // Removed chat panel props passed down
      // onToggleChatPanel={onToggleChatPanel}
      // showChatButton={showChatButton}
      onNavigateToChat={onNavigateToChat} // Pass new prop down
      // Pass a wrapper function that calls the original createNewProject with default args
      onCreateNewProject={() => createNewProject("Untitled Project")}
    />
  );
}

export function CanvasSidebarAdapter({
  project,
  selectedSceneId,
  setSelectedSceneId,
  createScene,
  deleteScene,
  loading,
  setActiveScene // Destructure prop
}: CanvasSidebarAdapterProps) {
  const addScene = async () => {
    if (project) {
      const newScene = await createScene({ 
        projectId: project.id,
        project_id: project.id,
        title: 'New Scene',
        scene_order: (project.scenes?.length || 0) + 1
      });
      return newScene?.id;
    }
    return undefined;
  };
  
  return (
    <CanvasSidebar
      project={project}
      selectedSceneId={selectedSceneId}
      setSelectedSceneId={setSelectedSceneId}
      addScene={addScene}
      deleteScene={deleteScene}
      loading={loading}
      collapsed={false}
      setActiveScene={setActiveScene} // Pass prop down
    />
  );
}

export function CanvasWorkspaceAdapter({
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
}: CanvasWorkspaceAdapterProps) {
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
}

export function CanvasDetailPanelAdapter({
  scene,
  projectId,
  updateScene,
  collapsed,
  setCollapsed
}: CanvasDetailPanelAdapterProps) {
  return (
    <CanvasDetailPanel
      scene={scene}
      projectId={projectId}
      updateScene={updateScene}
      collapsed={collapsed}
      setCollapsed={setCollapsed}
    />
  );
}

export function CanvasScriptPanelAdapter({
  project,
  projectId,
  onUpdateScene,
  onClose,
  saveFullScript,
  divideScriptToScenes
}: CanvasScriptPanelAdapterProps) {
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
}
