
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { CanvasProject, CanvasScene } from '@/types/canvas';

export interface ProjectContextType {
  activeProject: string | null;
  activeScene: string | null;
  setActiveProject: (projectId: string | null) => void;
  setActiveScene: (sceneId: string | null) => void;
  createProject: (title: string, description?: string) => Promise<string>;
  updateProject: (id: string, data: Partial<CanvasProject>) => Promise<void>;
  createScene: (projectId: string, data: Partial<CanvasScene>) => Promise<string>;
  updateScene: (id: string, data: Partial<CanvasScene>) => Promise<void>;
  projects: CanvasProject[];
  scenes: Record<string, CanvasScene[]>;
  isSDKMode: boolean;
  toggleSDKMode: () => void;
  // Add these properties to support multi-agent chat
  projectDetails?: any;
  projectContent?: any;
  fetchProjectDetails?: (projectId: string) => Promise<any>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

interface ProjectProviderProps {
  children: ReactNode;
}

export const ProjectProvider = ({ children }: ProjectProviderProps) => {
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [activeScene, setActiveScene] = useState<string | null>(null);
  const [projects, setProjects] = useState<CanvasProject[]>([]);
  const [scenes, setScenes] = useState<Record<string, CanvasScene[]>>({});
  const [isSDKMode, setIsSDKMode] = useState<boolean>(true);
  const [projectDetails, setProjectDetails] = useState<any>(null);
  const [projectContent, setProjectContent] = useState<any>(null);

  // Load projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        // In a real app, this would be loaded from the database
        const mockProjects: CanvasProject[] = [
          {
            id: 'project-123',
            title: 'Demo Project',
            description: 'A demo project for testing',
            user_id: 'user-1',
            scenes: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            full_script: ''
          }
        ];
        setProjects(mockProjects);
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };

    fetchProjects();
  }, []);

  // Normalize project data to match the expected structure
  const normalizeProject = (project: any): CanvasProject => {
    return {
      id: project.id,
      title: project.title,
      description: project.description || '',
      user_id: project.userId || 'user-1',
      scenes: project.scenes || [],
      created_at: project.createdAt || new Date().toISOString(),
      updated_at: project.updatedAt || project.updated_at || new Date().toISOString(),
      full_script: project.fullScript || project.full_script || ''
    };
  };

  // Normalize scene data to match the expected structure
  const normalizeScene = (scene: any): CanvasScene => {
    return {
      id: scene.id,
      projectId: scene.projectId || scene.project_id || '',
      title: scene.title || 'Untitled Scene',
      description: scene.description || '',
      script: scene.script || '',
      image_prompt: scene.imagePrompt || scene.image_prompt || '',
      image_url: scene.imageUrl || scene.image_url || '',
      voice_over_text: scene.voiceOverText || scene.voice_over_text || '',
      duration: scene.duration || 0,
      project_id: scene.projectId || scene.project_id || '',
      created_at: scene.createdAt || scene.created_at || new Date().toISOString(),
      updated_at: scene.updatedAt || scene.updated_at || new Date().toISOString()
    };
  };

  const createProject = async (title: string, description?: string): Promise<string> => {
    try {
      // In a real app, this would create a project in the database
      const projectId = `project-${Date.now()}`;
      const newProject = normalizeProject({
        id: projectId,
        title,
        description,
        userId: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      setProjects(prev => [...prev, newProject]);
      return projectId;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  };

  const updateProject = async (id: string, data: Partial<CanvasProject>): Promise<void> => {
    try {
      // In a real app, this would update a project in the database
      setProjects(prev => 
        prev.map(project => 
          project.id === id 
            ? normalizeProject({ ...project, ...data }) 
            : project
        )
      );
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  };

  const createScene = async (projectId: string, data: Partial<CanvasScene>): Promise<string> => {
    try {
      // In a real app, this would create a scene in the database
      const sceneId = `scene-${Date.now()}`;
      const newScene = normalizeScene({
        id: sceneId,
        projectId,
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      setScenes(prev => ({
        ...prev,
        [projectId]: [...(prev[projectId] || []), newScene]
      }));
      
      return sceneId;
    } catch (error) {
      console.error('Error creating scene:', error);
      throw error;
    }
  };

  const updateScene = async (id: string, data: Partial<CanvasScene>): Promise<void> => {
    try {
      // In a real app, this would update a scene in the database
      setScenes(prev => {
        const newScenes = { ...prev };
        
        // Find which project this scene belongs to
        for (const projectId in newScenes) {
          const sceneIndex = newScenes[projectId].findIndex(scene => scene.id === id);
          
          if (sceneIndex !== -1) {
            newScenes[projectId] = [
              ...newScenes[projectId].slice(0, sceneIndex),
              normalizeScene({ ...newScenes[projectId][sceneIndex], ...data }),
              ...newScenes[projectId].slice(sceneIndex + 1)
            ];
            break;
          }
        }
        
        return newScenes;
      });
    } catch (error) {
      console.error('Error updating scene:', error);
      throw error;
    }
  };
  
  const toggleSDKMode = () => {
    setIsSDKMode(prev => !prev);
  };

  // Add fetchProjectDetails method to support multi-agent chat
  const fetchProjectDetails = async (projectId: string): Promise<any> => {
    try {
      // Mock implementation
      console.log(`Fetching project details for ${projectId}`);
      
      // In a real app, this would fetch project details from an API
      setProjectDetails({
        id: projectId,
        title: 'Sample Project',
        description: 'A sample project for testing',
      });
      
      setProjectContent({
        files: [],
        dependencies: {}
      });
      
      return {
        details: projectDetails,
        content: projectContent
      };
    } catch (error) {
      console.error('Error fetching project details:', error);
      throw error;
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        activeProject,
        activeScene,
        setActiveProject,
        setActiveScene,
        createProject,
        updateProject,
        createScene,
        updateScene,
        projects,
        scenes,
        isSDKMode,
        toggleSDKMode,
        projectDetails,
        projectContent,
        fetchProjectDetails
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjectContext = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
};
