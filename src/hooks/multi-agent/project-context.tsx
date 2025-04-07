// src/hooks/multi-agent/project-context.tsx (Corrected Content)

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client'; // Import Supabase client
import { toast } from "sonner"; // Import toast
import { CanvasProject, CanvasScene } from '@/types/canvas';

export interface ProjectContextType {
  activeProject: string | null;
  activeScene: string | null;
  setActiveProject: (projectId: string | null) => void;
  setActiveScene: (sceneId: string | null) => void;
  createProject: (title: string, description?: string) => Promise<string | null>; // Can return null on failure
  updateProject: (id: string, data: Partial<CanvasProject & { status?: string }>) => Promise<void>; // Allow status update
  createScene: (projectId: string, data: Partial<CanvasScene>) => Promise<string>;
  updateScene: (id: string, data: Partial<CanvasScene>) => Promise<void>;
  projects: CanvasProject[];
  scenes: Record<string, CanvasScene[]>; // Store scenes keyed by projectId
  isSDKMode: boolean;
  toggleSDKMode: () => void;
  projectDetails?: CanvasProject | null; // Use CanvasProject type
  projectContent?: any; // Keep as any for now, might refine later
  fetchProjectDetails: (projectId: string) => Promise<any>; // Keep fetchProjectDetails
  fetchProjectScenes: (projectId: string) => Promise<void>;
  // Add normalization functions to the context type
  normalizeProject: (project: any) => CanvasProject;
  normalizeScene: (scene: any) => CanvasScene;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

interface ProjectProviderProps {
  children: ReactNode;
}

export const ProjectProvider = ({ children }: ProjectProviderProps) => {
  const [activeProject, setActiveProjectState] = useState<string | null>(null);
  const [activeScene, setActiveSceneState] = useState<string | null>(null);
  const [projects, setProjects] = useState<CanvasProject[]>([]);
  const [scenes, setScenes] = useState<Record<string, CanvasScene[]>>({}); // Initialize as empty object
  const [isSDKMode, setIsSDKMode] = useState<boolean>(true);
  const [projectDetails, setProjectDetails] = useState<CanvasProject | null>(null); // Use CanvasProject type
  const [projectContent, setProjectContent] = useState<any>(null);

  // --- Normalization Functions ---
  const normalizeProject = (project: any): CanvasProject => {
    return {
      id: project.id,
      title: project.title,
      description: project.description,
      final_video_url: project.final_video_url,
      full_script: project.full_script,
      main_product_image_url: project.main_product_image_url,
      user_id: project.user_id,
      created_at: project.created_at,
      updated_at: project.updated_at,
      // Add normalized fields back if needed for UI/logic elsewhere
      userId: project.user_id,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
    };
  };

  const normalizeScene = (scene: any): CanvasScene => {
    return {
      background_music_url: scene.background_music_url,
      bria_v2_request_id: scene.bria_v2_request_id,
      created_at: scene.created_at,
      custom_instruction: scene.custom_instruction,
      description: scene.description,
      duration: scene.duration,
      fal_tts_request_id: scene.fal_tts_request_id,
      id: scene.id,
      image_prompt: scene.image_prompt,
      image_url: scene.image_url,
      is_template: scene.is_template,
      product_image_url: scene.product_image_url,
      project_id: scene.project_id,
      scene_order: scene.scene_order,
      script: scene.script,
      template_id: scene.template_id,
      updated_at: scene.updated_at,
      video_url: scene.video_url,
      voice_over_text: scene.voice_over_text,
      voice_over_url: scene.voice_over_url,
      // Add normalized fields back if needed for UI/logic elsewhere
      projectId: scene.project_id,
      createdAt: scene.created_at,
      updatedAt: scene.updated_at,
      title: scene.title || 'Untitled Scene', // Keep title if used
      imageUrl: scene.image_url, // Keep normalized if used
      videoUrl: scene.video_url, // Keep normalized if used
      voiceOverText: scene.voice_over_text, // Keep normalized if used
      voiceOverUrl: scene.voice_over_url, // Keep normalized if used
      sceneOrder: scene.scene_order, // Keep normalized if used
    };
  };

  // --- Data Fetching Functions ---
  const fetchProjects = useCallback(async () => {
    console.log("Fetching project list for UI...");
    try {
      const { data: projectsData, error } = await supabase
        .from('canvas_projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching projects for UI:', error);
        toast.error(`Failed to load projects: ${error.message}`);
        setProjects([]);
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
  }, []); // Empty dependency array means this function instance is stable

  const fetchProjectScenes = useCallback(async (projectId: string): Promise<void> => {
     if (!projectId) {
       console.warn("fetchProjectScenes called with no projectId");
       setScenes(prev => {
         const newState = { ...prev };
         delete newState[projectId]; // Remove entry if projectId is null/undefined
         return newState;
       });
       return;
     }

     try {
       console.log(`Fetching scenes from Supabase for project ${projectId}`);
       const { data: scenesData, error: scenesError } = await supabase
         .from('canvas_scenes')
         .select('*')
         .eq('project_id', projectId)
         .order('scene_order', { ascending: true });

       if (scenesError) {
         console.error(`Error fetching scenes for project ${projectId}:`, scenesError);
         toast.error(`Failed to load scenes: ${scenesError.message}`);
         setScenes(prev => ({ ...prev, [projectId]: [] })); // Set empty array on error
         throw scenesError;
       }

       const normalizedScenes = scenesData ? scenesData.map(normalizeScene) : [];
       console.log(`Fetched and normalized ${normalizedScenes.length} scenes for project ${projectId}.`);
       setScenes(prev => ({ ...prev, [projectId]: normalizedScenes }));

     } catch (error) {
       console.error(`Unexpected error in fetchProjectScenes for project ${projectId}:`, error);
       setScenes(prev => ({ ...prev, [projectId]: [] })); // Set empty array on error
       if (error instanceof Error && !error.message.includes('Failed to load scenes')) {
           toast.error(`An unexpected error occurred while fetching scenes: ${error.message}`);
       } else if (!(error instanceof Error)) {
           toast.error("An unexpected error occurred while fetching scenes.");
       }
     }
   }, []); // Empty dependency array

  const fetchProjectDetails = useCallback(async (projectId: string): Promise<any> => {
    if (!projectId) {
      console.warn("fetchProjectDetails called with no projectId");
      setProjectDetails(null);
      setProjectContent(null);
      return null;
    }

    try {
      console.log(`Fetching project details from Supabase for ${projectId}`);
      const { data: projectData, error: projectError } = await supabase
        .from('canvas_projects')
        .select('*') // Select all columns for details
        .eq('id', projectId)
        .single();

      if (projectError) {
        console.error('Error fetching project details from Supabase:', projectError);
        toast.error(`Failed to load project details: ${projectError.message}`);
        setProjectDetails(null);
        setProjectContent(null);
        throw projectError;
      }

      if (!projectData) {
        console.warn(`Project with ID ${projectId} not found in Supabase.`);
        toast.info(`Project with ID ${projectId} not found.`);
        setProjectDetails(null);
        setProjectContent(null);
        return null;
      }

      const normalizedDetails = normalizeProject(projectData);
      setProjectDetails(normalizedDetails);
      console.log("Fetched and set project details:", normalizedDetails);

      // Fetch scenes separately using the dedicated function
      await fetchProjectScenes(projectId); // Call the scene fetching function

      // Update projectContent (if still needed) after scenes are fetched and state is updated
      // Note: This relies on fetchProjectScenes updating the 'scenes' state
      const currentScenes = scenes[projectId] || []; // Get scenes from state
      setProjectContent({
        files: currentScenes,
        dependencies: {},
        fullScript: normalizedDetails.full_script // Use snake_case from DB
      });

      return {
        details: normalizedDetails,
        content: {
           files: currentScenes,
           dependencies: {},
           fullScript: normalizedDetails.full_script // Use snake_case
        }
      };

    } catch (error) {
      console.error('Error in fetchProjectDetails:', error);
      setProjectDetails(null);
      setProjectContent(null);
      if (error instanceof Error && !error.message.includes('Failed to load')) {
          toast.error(`An unexpected error occurred: ${error.message}`);
      } else if (!(error instanceof Error)) {
          toast.error("An unexpected error occurred while fetching project details.");
      }
      throw error;
    }
  }, [scenes, fetchProjectScenes]); // Add scenes and fetchProjectScenes as dependencies

  // --- CRUD Functions ---
  const createProject = async (title: string, description?: string): Promise<string | null> => {
      try {
          const { data: sessionData } = await supabase.auth.getSession();
          const userId = sessionData?.session?.user?.id;
          if (!userId) {
              toast.error("User not authenticated.");
              return null;
          }

          const projectData = {
              title,
              description: description || '',
              user_id: userId,
          };

          console.log("Attempting to insert project into Supabase:", projectData);
          const { data: insertedData, error } = await supabase
              .from('canvas_projects')
              .insert(projectData)
              .select()
              .single();

          if (error) {
              console.error('Error inserting project into Supabase:', error);
              toast.error(`Failed to create project: ${error.message}`);
              return null;
          }

          if (!insertedData) {
               console.error('Supabase insert did not return data.');
               toast.error('Failed to create project: No data returned.');
               return null;
          }

          console.log("Project inserted successfully:", insertedData);
          toast.success(`Project "${insertedData.title}" created successfully!`);
          await fetchProjects(); // Refresh list
          return insertedData.id;

      } catch (error) {
          console.error('Unexpected error in createProject:', error);
          const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
          toast.error(`Project creation failed: ${errorMessage}`);
          return null;
      }
  };

  const updateProject = async (id: string, data: Partial<CanvasProject & { status?: string }>): Promise<void> => {
    const originalProjects = [...projects]; // Shallow copy for rollback
    setProjects(prev =>
      prev.map(project =>
        project.id === id
          ? normalizeProject({ ...project, ...data })
          : project
      )
    );

    const supabaseData: Record<string, any> = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        const finalKey = snakeKey === 'user_id' ? 'user_id' : snakeKey;
        if (key === 'status') {
          supabaseData['status'] = data.status;
        } else if (key !== 'userId' && key !== 'createdAt' && key !== 'updatedAt') { // Avoid sending normalized fields
          supabaseData[finalKey] = (data as any)[key];
        }
      }
    }
    delete supabaseData.id;
    delete supabaseData.created_at;
    delete supabaseData.updated_at;

    try {
      console.log(`Attempting to update project ${id} in Supabase with:`, supabaseData);
      const { error } = await supabase
        .from('canvas_projects')
        .update(supabaseData)
        .eq('id', id);

      if (error) {
        console.error('Error updating project in Supabase:', error);
        toast.error(`Failed to save project changes: ${error.message}`);
        setProjects(originalProjects);
        throw error;
      }
      console.log(`Project ${id} updated successfully in Supabase.`);
      toast.success('Project changes saved.');
      // Optionally re-fetch
      // fetchProjectDetails(id);
      // fetchProjects();

    } catch (error) {
      console.error('Unexpected error during project update persistence:', error);
      setProjects(originalProjects);
      if (!(error instanceof Error && error.message.includes('Failed to save project changes'))) {
         toast.error("An unexpected error occurred while saving project changes.");
      }
    }
  };

  const createScene = async (projectId: string, data: Partial<CanvasScene>): Promise<string> => {
    // Implementation for creating scene (needs Supabase insert)
    // For now, just return a placeholder ID
    const sceneId = `temp-scene-${Date.now()}`;
    console.warn("createScene is not fully implemented - using placeholder ID");
    return sceneId;
  };

  const updateScene = async (id: string, data: Partial<CanvasScene>): Promise<void> => {
    let projectIdForRollback: string | null = null;
    let originalScenesState: Record<string, CanvasScene[]> | null = null;

    setScenes(prev => {
      originalScenesState = { ...prev };
      const newScenesState = { ...prev };
      let sceneFound = false;

      for (const projectId in newScenesState) {
        const sceneIndex = newScenesState[projectId].findIndex(scene => scene.id === id);
        if (sceneIndex !== -1) {
          projectIdForRollback = projectId;
          const updatedScene = normalizeScene({ ...newScenesState[projectId][sceneIndex], ...data });
          newScenesState[projectId] = [
            ...newScenesState[projectId].slice(0, sceneIndex),
            updatedScene,
            ...newScenesState[projectId].slice(sceneIndex + 1)
          ];
          sceneFound = true;
          break;
        }
      }
      if (!sceneFound) {
         console.warn(`Scene with ID ${id} not found in local state for update.`);
         originalScenesState = null;
         projectIdForRollback = null;
      }
      return newScenesState;
    });

    if (!projectIdForRollback || !originalScenesState) {
        toast.error("Could not update scene: Scene not found locally.");
        return;
    }

    const supabaseData: Record<string, any> = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        let finalKey = snakeKey;
        if (key === 'projectId') finalKey = 'project_id';
        if (key === 'imagePrompt') finalKey = 'image_prompt';
        if (key === 'imageUrl') finalKey = 'image_url';
        if (key === 'videoUrl') finalKey = 'video_url';
        if (key === 'voiceOverText') finalKey = 'voice_over_text';
        if (key === 'sceneOrder') finalKey = 'scene_order';
        if (key === 'voiceOverUrl') finalKey = 'voice_over_url'; // Added mapping

        // Avoid sending normalized fields or fields not in DB schema
        if (key !== 'projectId' && key !== 'createdAt' && key !== 'updatedAt' && key !== 'title' && key !== 'imageUrl' && key !== 'videoUrl' && key !== 'voiceOverText' && key !== 'voiceOverUrl' && key !== 'sceneOrder') {
           supabaseData[finalKey] = (data as any)[key];
        }
      }
    }
    delete supabaseData.id;
    delete supabaseData.created_at;
    delete supabaseData.updated_at;
    delete supabaseData.project_id;

    try {
      console.log(`Attempting to update scene ${id} in Supabase with:`, supabaseData);
      const { error } = await supabase
        .from('canvas_scenes')
        .update(supabaseData)
        .eq('id', id);

      if (error) {
        console.error('Error updating scene in Supabase:', error);
        toast.error(`Failed to save scene changes: ${error.message}`);
        if (originalScenesState) setScenes(originalScenesState);
        throw error;
      }
      console.log(`Scene ${id} updated successfully in Supabase.`);
      toast.success('Scene changes saved.');
      // Optionally re-fetch scenes
      // fetchProjectScenes(projectIdForRollback);

    } catch (error) {
      console.error('Unexpected error during scene update persistence:', error);
      if (originalScenesState) setScenes(originalScenesState);
      if (!(error instanceof Error && error.message.includes('Failed to save scene changes'))) {
         toast.error("An unexpected error occurred while saving scene changes.");
      }
    }
  };

  // --- Other Context Functions ---
  const setActiveProject = (projectId: string | null) => {
    setActiveProjectState(projectId);
    if (projectId) {
      fetchProjectDetails(projectId); // Fetch details when project becomes active
    } else {
      setProjectDetails(null); // Clear details if no project selected
      setProjectContent(null);
    }
  };

  const setActiveScene = (sceneId: string | null) => {
    setActiveSceneState(sceneId);
  };

  const toggleSDKMode = () => {
    setIsSDKMode(prev => !prev);
  };

  // --- Initial Data Load ---
  useEffect(() => {
    fetchProjects(); // Fetch projects on initial mount
  }, [fetchProjects]); // Depend on the stable fetchProjects function

  // --- Provider Value ---
  const providerValue: ProjectContextType = {
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
    fetchProjectDetails,
    fetchProjectScenes, // Add fetchProjectScenes here
    // Add normalization functions to the provider value
    normalizeProject,
    normalizeScene
  };

  return (
    <ProjectContext.Provider value={providerValue}>
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
