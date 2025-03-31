
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CanvasProject } from '@/types/canvas';
import { getScenesByProjectId, formatProjectData } from '@/utils/canvas-data-utils';

interface ProjectContextState {
  activeProjectId: string | null;
  projectDetails: CanvasProject | null;
  availableProjects: CanvasProject[];
  isLoading: boolean;
  error: string | null;
  setActiveProject: (projectId: string) => void;
  fetchAvailableProjects: () => Promise<void>;
  projectScenesData: Record<string, any[]>;
  projectContent: string;
}

const ProjectContext = createContext<ProjectContextState>({
  activeProjectId: null,
  projectDetails: null,
  availableProjects: [],
  isLoading: false,
  error: null,
  setActiveProject: () => {},
  fetchAvailableProjects: async () => {},
  projectScenesData: {},
  projectContent: '',
});

export const ProjectProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projectDetails, setProjectDetails] = useState<CanvasProject | null>(null);
  const [availableProjects, setAvailableProjects] = useState<CanvasProject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedProjects, setHasLoadedProjects] = useState<boolean>(false);
  const [projectScenesData, setProjectScenesData] = useState<Record<string, any[]>>({});
  const [projectContent, setProjectContent] = useState<string>('');

  // Fetch available projects
  const fetchAvailableProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('canvas_projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const projects = data.map((project: any) => ({
        id: project.id,
        title: project.title || `Project ${project.id.substring(0, 8)}`,
        userId: project.user_id,
        user_id: project.user_id, // include both formats for compatibility
        description: project.description || '',
        fullScript: project.full_script || '',
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        scenes: []
      }));
      
      setAvailableProjects(projects);
      setHasLoadedProjects(true);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch project details when active project changes
  useEffect(() => {
    const fetchProjectDetails = async () => {
      if (!activeProjectId) {
        setProjectDetails(null);
        setProjectContent('');
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        const { data, error } = await supabase
          .from('canvas_projects')
          .select('*')
          .eq('id', activeProjectId)
          .single();
        
        if (error) throw error;
        
        if (data) {
          // Fetch project scenes
          const scenes = await getScenesByProjectId(activeProjectId);
          
          const projectWithScenes: CanvasProject = {
            id: data.id,
            title: data.title || `Project ${data.id.substring(0, 8)}`,
            userId: data.user_id,
            user_id: data.user_id, // include both formats for compatibility
            description: data.description || '',
            fullScript: data.full_script || '',
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            scenes: scenes
          };
          
          setProjectDetails(projectWithScenes);
          
          // Format project data as content for AI
          const formattedContent = formatProjectData(projectWithScenes);
          setProjectContent(formattedContent);
          
          // Update scenes data
          setProjectScenesData(prevScenes => ({
            ...prevScenes,
            [activeProjectId]: scenes
          }));
        }
      } catch (err) {
        console.error('Error fetching project details:', err);
        setError('Failed to load project details');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProjectDetails();
  }, [activeProjectId]);

  // Provide context
  return (
    <ProjectContext.Provider 
      value={{
        activeProjectId,
        projectDetails,
        availableProjects,
        isLoading,
        error,
        setActiveProject: setActiveProjectId,
        fetchAvailableProjects,
        projectScenesData,
        projectContent
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

interface UseProjectContextOptions {
  initialProjectId?: string;
}

export const useProjectContext = (options: UseProjectContextOptions = {}) => {
  const context = useContext(ProjectContext);
  
  // Set initial project ID if provided
  useEffect(() => {
    if (options.initialProjectId && context.activeProjectId !== options.initialProjectId) {
      context.setActiveProject(options.initialProjectId);
    }
  }, [options.initialProjectId, context]);
  
  return context;
};
