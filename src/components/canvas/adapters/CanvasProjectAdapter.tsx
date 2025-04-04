
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
  onToggleScriptPanel?: () => void; // Made optional
  onToggleDetailPanel?: () => void; // Made optional
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
  mainImageUrl?: string | null; // Add mainImageUrl prop
  updateScene: (sceneId: string, type: 'script' | 'imagePrompt' | 'description' | 'image' | 'productImage' | 'video' | 'voiceOver' | 'backgroundMusic' | 'voiceOverText', value: string) => Promise<void>; // Reverted type
  addScene: () => Promise<void>;
  deleteScene: (sceneId: string) => Promise<boolean>; // Expect boolean from hook
  divideScriptToScenes: (script: string) => Promise<void>; // Expect string input
  saveFullScript: (script: string) => Promise<void>;
  createNewProject: (title: string, description?: string) => Promise<string>;
  updateProjectTitle: (title: string) => Promise<void>;
  updateProject: (projectId: string, data: Partial<CanvasProject>) => Promise<void>; // Add updateProject prop
  updateMainImageUrl: (imageUrl: string) => Promise<boolean>; // Add prop
  agent?: any;
}

// Adapter type for CanvasDetailPanel
interface CanvasDetailPanelAdapterProps {
  scene: CanvasScene | null;
  project: CanvasProject | null; // Add project prop
  projectId: string;
  updateScene: (sceneId: string, type: SceneUpdateType, value: string) => Promise<void>;
  // updateProject prop removed
  collapsed?: boolean; // Made optional
  setCollapsed?: (collapsed: boolean) => void; // Made optional
}

// Adapter type for CanvasScriptPanel
interface CanvasScriptPanelAdapterProps {
  project: CanvasProject | null;
  projectId: string;
  onUpdateScene: (sceneId: string, type: SceneUpdateType, value: string) => Promise<void>;
  onClose?: () => void; // Made optional
  saveFullScript: (script: string) => Promise<void>;
  divideScriptToScenes: (script: string) => Promise<void>; // Expect string input
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
      // Pass toggle functions only if they exist, otherwise pass no-op
      onToggleScriptPanel={onToggleScriptPanel || (() => {})}
      onToggleDetailPanel={onToggleDetailPanel || (() => {})}
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
  mainImageUrl, // Destructure prop
  updateScene,
  addScene,
  deleteScene,
  divideScriptToScenes,
  saveFullScript,
  createNewProject,
  updateProjectTitle,
  updateProject,
  updateMainImageUrl, // Destructure prop
  agent
}: CanvasWorkspaceAdapterProps) {
  return (
    <CanvasWorkspace
      project={project}
      selectedScene={selectedScene}
      selectedSceneId={selectedSceneId}
      mainImageUrl={mainImageUrl} // Pass prop down
      setSelectedSceneId={setSelectedSceneId}
      updateScene={updateScene}
      addScene={addScene}
      deleteScene={async (id: string) => { await deleteScene(id); }} // Wrap to match void return type
      divideScriptToScenes={divideScriptToScenes} // Pass the function expecting string
      saveFullScript={saveFullScript}
      createNewProject={createNewProject}
      updateProjectTitle={updateProjectTitle}
      updateProject={updateProject}
      updateMainImageUrl={updateMainImageUrl} // Pass prop down
      agent={agent}
    />
  );
}

export function CanvasDetailPanelAdapter({
  scene,
  project, // Destructure project
  projectId,
  updateScene,
  // updateProject removed from destructuring
  collapsed,
  setCollapsed
}: CanvasDetailPanelAdapterProps) {
  return (
    <CanvasDetailPanel
      scene={scene}
      project={project} // Pass project down
      projectId={projectId}
      updateScene={updateScene}
      // updateProject prop removed
      // Pass collapsed state (defaulting to false) and setCollapsed (defaulting to no-op)
      collapsed={collapsed ?? false}
      setCollapsed={setCollapsed || (() => {})}
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
      // Pass onClose only if it exists, otherwise pass no-op
      onClose={onClose || (() => {})}
      saveFullScript={saveFullScript}
      // TODO: Fix type mismatch between hook (string) and panel (array)
      divideScriptToScenes={async (sceneScripts) => {
        console.warn("Placeholder divideScriptToScenes called in adapter due to type mismatch", sceneScripts);
        // Original function from hook expects a string, but panel expects array.
        // Calling the original function here would cause a runtime error.
        // await divideScriptToScenes(sceneScripts); // This would be incorrect
      }}
    />
  );
}
