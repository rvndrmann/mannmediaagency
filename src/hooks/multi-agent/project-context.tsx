
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { CanvasProject } from '@/types/canvas';
import { supabase } from '@/integrations/supabase/client';

interface ProjectContextType {
  project: CanvasProject | null;
  scenes?: any[];
  updateProject?: (updates: Partial<CanvasProject>) => Promise<void>;
  setActiveProject?: (project: CanvasProject) => void;
  setActiveScene?: (scene: any) => void;
  activeProject?: CanvasProject | null;
  projectDetails?: CanvasProject | null;
  fetchProjectDetails?: () => Promise<void>;
  fetchProjectScenes?: () => Promise<void>;
}

interface ProjectContextProviderProps {
  children: React.ReactNode;
  projectId: string | null;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const useProjectContext = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjectContext must be used within a ProjectContextProvider');
  }
  return context;
};

export const ProjectContextProvider: React.FC<ProjectContextProviderProps> = ({
  children,
  projectId
}) => {
  const [project, setProject] = useState<CanvasProject | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    if (!projectId) {
      setProject(null);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('canvas_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) {
        throw error;
      }

      const mappedProject: CanvasProject = {
        id: data.id,
        title: data.title,
        description: data.description,
        cover_image_url: data.cover_image_url,
        full_script: data.full_script,
        user_id: data.user_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
        // Compatibility aliases
        userId: data.user_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        fullScript: data.full_script,
      };

      setProject(mappedProject);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching project:", err);
      setError(err.message || "Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const updateProject = async (updates: Partial<CanvasProject>) => {
    if (!projectId) {
      console.warn("No project ID to update.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('canvas_projects')
        .update(updates)
        .eq('id', projectId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Optimistically update local state
      setProject((prevProject) => {
        if (prevProject) {
          return { ...prevProject, ...updates };
        }
        return prevProject;
      });
    } catch (err: any) {
      console.error("Error updating project:", err);
      setError(err.message || "Failed to update project");
    }
  };

  const value: ProjectContextType = {
    project,
    updateProject,
    setActiveProject: setProject,
    setActiveScene: () => {}, // Placeholder
    activeProject: project,
    projectDetails: project,
    fetchProjectDetails: fetchProject,
    fetchProjectScenes: async () => {}, // Placeholder
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};

// Export as ProjectProvider for backward compatibility
export const ProjectProvider = ProjectContextProvider;

// Export the type for other components to use
export type { ProjectContextType };
