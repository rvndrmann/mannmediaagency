
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CanvasProject, CanvasScene } from '@/types/canvas';

export interface ProjectContextType {
  activeProject: string | null;
  setActiveProject: (projectId: string | null) => void;
  activeScene: string | null;
  setActiveScene?: (sceneId: string | null) => void;
  projects: Record<string, CanvasProject>;
  addProject: (project: CanvasProject) => void;
  updateProject: (projectId: string, updates: Partial<CanvasProject>) => void;
  currentProject: CanvasProject | null;
}

const ProjectContext = createContext<ProjectContextType>({
  activeProject: null,
  setActiveProject: () => {},
  activeScene: null,
  projects: {},
  addProject: () => {},
  updateProject: () => {},
  currentProject: null
});

interface ProjectProviderProps {
  children: ReactNode;
  initialProject?: string;
}

export function ProjectProvider({ children, initialProject }: ProjectProviderProps) {
  const [activeProject, setActiveProject] = useState<string | null>(initialProject || null);
  const [activeScene, setActiveScene] = useState<string | null>(null);
  const [projects, setProjects] = useState<Record<string, CanvasProject>>({});

  useEffect(() => {
    // Reset active scene when changing projects
    if (activeProject) {
      setActiveScene(null);
    }
  }, [activeProject]);

  const addProject = (project: CanvasProject) => {
    const projectWithNormalizedFields = normalizeProjectFields(project);
    setProjects(prev => ({
      ...prev,
      [project.id]: projectWithNormalizedFields
    }));
  };

  const updateProject = (projectId: string, updates: Partial<CanvasProject>) => {
    setProjects(prev => {
      if (!prev[projectId]) return prev;
      
      return {
        ...prev,
        [projectId]: {
          ...prev[projectId],
          ...updates
        }
      };
    });
  };

  // Normalize project fields to ensure consistency
  const normalizeProjectFields = (project: CanvasProject): CanvasProject => {
    // Create a shallow copy first
    const normalizedProject = { ...project };
    
    // Normalize fields
    normalizedProject.userId = normalizedProject.userId || normalizedProject.user_id;
    normalizedProject.user_id = normalizedProject.user_id || normalizedProject.userId;
    
    normalizedProject.fullScript = normalizedProject.fullScript || normalizedProject.full_script;
    normalizedProject.full_script = normalizedProject.full_script || normalizedProject.fullScript;
    
    normalizedProject.createdAt = normalizedProject.createdAt || normalizedProject.created_at;
    normalizedProject.created_at = normalizedProject.created_at || normalizedProject.createdAt;
    
    // Ensure scenes is at least an empty array
    normalizedProject.scenes = normalizedProject.scenes || [];
    
    return normalizedProject;
  };

  const currentProject = activeProject ? projects[activeProject] || null : null;

  const value = {
    activeProject,
    setActiveProject,
    activeScene,
    setActiveScene,
    projects,
    addProject,
    updateProject,
    currentProject
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export const useProjectContext = () => useContext(ProjectContext);
