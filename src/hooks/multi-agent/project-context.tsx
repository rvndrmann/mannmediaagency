
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client'; // Import Supabase client
import { toast } from "sonner"; // Import toast
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

  useEffect(() => {
    const fetchProjects = async () => {
      console.log("Fetching initial project list for UI...");
      try {
        // Use standard client which respects RLS
        const { data: projectsData, error } = await supabase
          .from('canvas_projects')
          .select('*') // Select columns needed for the list
          .order('created_at', { ascending: false }); // Example order

        if (error) {
          console.error('Error fetching projects for UI:', error);
          toast.error(`Failed to load projects: ${error.message}`);
          setProjects([]); // Set empty on error
        } else if (projectsData) {
          const normalized = projectsData.map(normalizeProject);
          console.log(`Fetched ${normalized.length} projects for UI.`);
          setProjects(normalized);
        } else {
          setProjects([]);
        }
      } catch (error) {
        console.error('Unexpected error fetching projects for UI:', error);
        toast.error("An unexpected error occurred while loading projects.");
        setProjects([]);
      }
    };

    fetchProjects();
  }, []); // Fetch only on initial mount

  const normalizeProject = (project: any): CanvasProject => {
    return {
      id: project.id,
      title: project.title,
      description: project.description || '',
      user_id: project.userId || project.user_id || 'user-1',
      userId: project.userId || project.user_id || 'user-1',
      scenes: project.scenes || [],
      created_at: project.createdAt || project.created_at || new Date().toISOString(),
      updated_at: project.updatedAt || project.updated_at || new Date().toISOString(),
      full_script: project.fullScript || project.full_script || '',
      createdAt: project.createdAt || project.created_at || new Date().toISOString(),
      updatedAt: project.updatedAt || project.updated_at || new Date().toISOString(),
      fullScript: project.fullScript || project.full_script || ''
    };
  };

  const normalizeScene = (scene: any): CanvasScene => {
    return {
      id: scene.id,
      project_id: scene.projectId || scene.project_id || '',
      projectId: scene.projectId || scene.project_id || '',
      title: scene.title || 'Untitled Scene',
      description: scene.description || '',
      script: scene.script || '',
      image_prompt: scene.imagePrompt || scene.image_prompt || '',
      imagePrompt: scene.imagePrompt || scene.image_prompt || '',
      image_url: scene.imageUrl || scene.image_url || '',
      imageUrl: scene.imageUrl || scene.image_url || '',
      video_url: scene.videoUrl || scene.video_url || '',
      videoUrl: scene.videoUrl || scene.video_url || '',
      voice_over_text: scene.voiceOverText || scene.voice_over_text || '',
      voiceOverText: scene.voiceOverText || scene.voice_over_text || '',
      scene_order: scene.sceneOrder || scene.scene_order || 0,
      sceneOrder: scene.sceneOrder || scene.scene_order || 0,
      order: scene.order || scene.sceneOrder || scene.scene_order || 0,
      duration: scene.duration || 0,
      created_at: scene.createdAt || scene.created_at || new Date().toISOString(),
      updated_at: scene.updatedAt || scene.updated_at || new Date().toISOString(),
      createdAt: scene.createdAt || scene.created_at || new Date().toISOString(),
      updatedAt: scene.updatedAt || scene.updated_at || new Date().toISOString()
    };
  };

  const createProject = async (title: string, description?: string): Promise<string> => {
    try {
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
      setScenes(prev => {
        const newScenes = { ...prev };
        
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

  const fetchProjectDetails = async (projectId: string): Promise<any> => {
    if (!projectId) {
      console.warn("fetchProjectDetails called with no projectId");
      setProjectDetails(null);
      setProjectContent(null);
      return null;
    }

    try {
      console.log(`Fetching project details from Supabase for ${projectId}`);
      
      // Fetch project details from Supabase
      const { data: projectData, error: projectError } = await supabase
        .from('canvas_projects') // Corrected table name
        .select('*')      // Select all columns for now
        .eq('id', projectId)
        .single(); // Expecting only one project

      if (projectError) {
        console.error('Error fetching project details from Supabase:', projectError);
        setProjectDetails(null); // Clear details on error
        setProjectContent(null); // Clear content on error
        throw projectError;
      }

      if (!projectData) {
        console.warn(`Project with ID ${projectId} not found in Supabase.`);
        setProjectDetails(null);
        setProjectContent(null);
        return null; // Or throw an error? Returning null for now.
      }

      // Normalize and set project details state
      const normalizedDetails = normalizeProject(projectData); // Use existing normalizer
      setProjectDetails(normalizedDetails);
      console.log("Fetched and set project details:", normalizedDetails);

      // --- Fetch associated content (e.g., scenes) ---
      console.log(`Fetching associated scenes from Supabase for project ${projectId}`);
      const { data: scenesData, error: scenesError } = await supabase
        .from('canvas_scenes') // Corrected table name
        .select('*')
        .eq('project_id', projectId) // Assuming foreign key is 'project_id'
        .order('scene_order', { ascending: true }); // Assuming ordering column is 'scene_order'

      if (scenesError) {
        console.error(`Error fetching scenes for project ${projectId}:`, scenesError);
        // Decide how to handle partial failure: maybe return details but no content?
        // For now, clear content state and throw.
        setProjectContent(null);
        throw scenesError;
      }

      const normalizedScenes = scenesData ? scenesData.map(normalizeScene) : [];
      console.log(`Fetched and normalized ${normalizedScenes.length} scenes.`);

      // Update projectContent state with fetched scenes
      setProjectContent({
        // Structure this based on how the backend/agent expects project context.
        // Putting scenes in 'files' for now, similar to previous placeholder.
        // This might need adjustment. Consider a dedicated 'scenes' field?
        files: normalizedScenes, // Use normalized scenes here
        dependencies: {}, // Keep placeholder unless needed
        fullScript: normalizedDetails.fullScript // Include fetched script
      });
      
      // Return fetched data (or normalized data)
      // The return value might not be strictly necessary if components use the context state
      return {
        details: normalizedDetails,
        content: { // Return the structure set in state
           files: [],
           dependencies: {},
           fullScript: normalizedDetails.fullScript
        }
      };

    } catch (error) {
      // Catch errors from Supabase call or normalization
      console.error('Error in fetchProjectDetails:', error);
      setProjectDetails(null); // Ensure state is cleared on error
      setProjectContent(null);
      // Re-throw the error so callers can handle it if needed
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
