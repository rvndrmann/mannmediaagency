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

      setProject({
        id: data.id,
        title: data.title,
        description: data.description,
        final_video_url: data.final_video_url,
        full_script: data.full_script,
        main_product_image_url: data.main_product_image_url,
        project_assets: data.project_assets || [], // Add missing property
        user_id: data.user_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
        // Compatibility aliases
        userId: data.user_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        fullScript: data.full_script,
      });
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
    project: project ? {
      id: project.id,
      title: project.title,
      description: project.description,
      final_video_url: project.final_video_url,
      full_script: project.full_script,
      main_product_image_url: project.main_product_image_url,
      project_assets: project.project_assets || [], // Add missing property
      user_id: project.user_id,
      created_at: project.created_at,
      updated_at: project.updated_at,
      // Compatibility aliases
      userId: project.user_id,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
    } : null,
    updateProject,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};
