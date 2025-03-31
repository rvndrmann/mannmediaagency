
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CanvasProject } from "@/services/canvas/types";

interface ProjectContextProps {
  children: React.ReactNode;
}

export interface ProjectContextState {
  activeProjectId: string | null;
  projectDetails: CanvasProject | null;
  projectContent: string | null;
  loadingProject: boolean;
  hasLoadedProjects: boolean;
  setActiveProject: (projectId: string | null) => void;
  refreshProject: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextState>({
  activeProjectId: null,
  projectDetails: null,
  projectContent: null,
  loadingProject: false,
  hasLoadedProjects: false,
  setActiveProject: () => {},
  refreshProject: async () => {}
});

export const ProjectProvider: React.FC<ProjectContextProps> = ({ children }) => {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projectDetails, setProjectDetails] = useState<CanvasProject | null>(null);
  const [projectContent, setProjectContent] = useState<string | null>(null);
  const [loadingProject, setLoadingProject] = useState<boolean>(false);
  const [hasLoadedProjects, setHasLoadedProjects] = useState<boolean>(false);

  // Load project details when active project changes
  useEffect(() => {
    if (activeProjectId) {
      loadProjectDetails(activeProjectId);
    } else {
      setProjectDetails(null);
      setProjectContent(null);
    }
  }, [activeProjectId]);

  const loadProjectDetails = async (projectId: string) => {
    if (!projectId) return;
    
    setLoadingProject(true);
    try {
      const { data: project, error } = await supabase
        .from('canvas_projects')
        .select('*, canvas_scenes(*)')
        .eq('id', projectId)
        .single();
      
      if (error) {
        console.error("Error loading project:", error);
        setProjectDetails(null);
        setProjectContent(null);
      } else if (project) {
        // Convert database format to the expected format
        const formattedProject: CanvasProject = {
          id: project.id,
          title: project.title,
          description: project.description || '',
          user_id: project.user_id,
          userId: project.user_id,
          fullScript: project.full_script || '',
          full_script: project.full_script || '',
          created_at: project.created_at,
          createdAt: project.created_at,
          updated_at: project.updated_at,
          updatedAt: project.updated_at,
          scenes: project.canvas_scenes
        };
        
        setProjectDetails(formattedProject);
        
        // Generate a summary of project content for context
        const content = [
          `Project Title: ${formattedProject.title}`,
          `Description: ${formattedProject.description || 'No description'}`,
          `Full Script: ${formattedProject.fullScript || 'No full script'}`,
          `Number of Scenes: ${formattedProject.scenes?.length || 0}`,
        ].join('\n\n');
        
        setProjectContent(content);
        setHasLoadedProjects(true);
      }
    } catch (err) {
      console.error("Error in loadProjectDetails:", err);
    } finally {
      setLoadingProject(false);
    }
  };

  const refreshProject = async () => {
    if (activeProjectId) {
      await loadProjectDetails(activeProjectId);
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        activeProjectId,
        projectDetails,
        projectContent,
        loadingProject,
        hasLoadedProjects,
        setActiveProject: setActiveProjectId,
        refreshProject
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjectContext = ({ initialProjectId }: { initialProjectId?: string } = {}) => {
  const context = useContext(ProjectContext);
  
  useEffect(() => {
    if (initialProjectId && initialProjectId !== context.activeProjectId) {
      context.setActiveProject(initialProjectId);
    }
  }, [initialProjectId, context.activeProjectId, context.setActiveProject]);
  
  return context;
};
