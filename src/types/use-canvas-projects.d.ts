
import { CanvasProject, CanvasScene } from './canvas';

export interface UseCanvasProjectsReturn {
  // Original properties
  projects: CanvasProject[];
  createProject: (title: string, description?: string) => Promise<CanvasProject>;
  updateProject: (id: string, updates: Partial<CanvasProject>) => Promise<CanvasProject>;
  deleteProject: (id: string) => Promise<void>;
  isLoading: boolean;
  
  // Additional properties needed by Canvas.tsx
  project: CanvasProject | null;
  scenes: CanvasScene[];
  selectedScene: CanvasScene | null;
  selectedSceneId: string | null;
  setSelectedSceneId: (id: string | null) => void;
  createScene: (projectId: string, data: any) => Promise<CanvasScene>;
  updateScene: (sceneId: string, type: string, value: string) => Promise<void>;
  deleteScene: (sceneId: string) => Promise<void>;
  loading: boolean;
  projectId: string | null;
  fetchProject: (id: string) => Promise<void>;
}
