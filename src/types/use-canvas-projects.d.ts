
import { CanvasProject, CanvasScene } from './canvas';

export interface UseCanvasProjectsReturn {
  projects: CanvasProject[];
  project: CanvasProject | null;
  scenes: CanvasScene[];
  selectedScene: CanvasScene | null;
  selectedSceneId: string | null;
  setSelectedSceneId: (id: string | null) => void;
  createProject: (title: string, description?: string) => Promise<CanvasProject>;
  updateProject: (id: string, updates: Partial<CanvasProject>) => Promise<CanvasProject>;
  deleteProject: (id: string) => Promise<void>;
  createScene: (projectId: string, data: any) => Promise<CanvasScene>;
  updateScene: (sceneId: string, type: string, value: string) => Promise<void>;
  deleteScene: (sceneId: string) => Promise<void>;
  isLoading: boolean;
  loading: boolean;
  projectId: string | null;
  fetchProject: (id: string) => Promise<void>;
}
