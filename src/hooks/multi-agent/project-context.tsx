
import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';

export interface CanvasScene {
  id: string;
  title: string;
  script: string;
  description: string;
  imagePrompt: string;
  voiceOverText: string;
  duration: number;
  projectId: string;
  imageUrl: string;
  videoUrl: string;
  videoStatus: string;
  status: string;
  prompt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CanvasProject {
  id: string;
  title: string;
  description: string;
  fullScript: string;
  scenes: CanvasScene[];
  createdAt: string;
  updated_at: string;
  user_id: string;
  userId: string;
}

export interface ProjectContextType {
  activeProject: string | null;
  setActiveProject: (projectId: string | null) => void;
  projects: CanvasProject[];
  setProjects: React.Dispatch<React.SetStateAction<CanvasProject[]>>;
  projectDetails: CanvasProject | null;
  projectContent: string;
  fetchProjectDetails: (projectId: string) => Promise<CanvasProject | null>;
  createProject: (title: string, description: string) => Promise<string>;
  getProjectScenes: (projectId: string) => Promise<CanvasScene[]>;
}

const ProjectContext = createContext<ProjectContextType>({
  activeProject: null,
  setActiveProject: () => {},
  projects: [],
  setProjects: () => {},
  projectDetails: null,
  projectContent: '',
  fetchProjectDetails: async () => null,
  createProject: async () => '',
  getProjectScenes: async () => []
});

export const ProjectProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [projects, setProjects] = useState<CanvasProject[]>([]);
  const [projectDetails, setProjectDetails] = useState<CanvasProject | null>(null);
  const [projectContent, setProjectContent] = useState<string>('');

  const fetchProjectDetails = useCallback(async (projectId: string): Promise<CanvasProject | null> => {
    if (!projectId) return null;
    
    try {
      const { data: project, error } = await supabase
        .from('canvas_projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      if (error) throw error;
      
      const { data: scenes, error: scenesError } = await supabase
        .from('canvas_scenes')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      
      if (scenesError) throw scenesError;
      
      // Transform project data to match CanvasProject interface
      const formattedProject: CanvasProject = {
        id: project.id,
        title: project.title || 'Untitled Project',
        description: project.description || '',
        fullScript: project.full_script || '',
        scenes: scenes.map((scene: any) => ({
          id: scene.id,
          title: scene.title,
          script: scene.script,
          description: scene.description,
          imagePrompt: scene.image_prompt,
          voiceOverText: scene.voice_over_text,
          duration: scene.duration,
          projectId: scene.project_id,
          imageUrl: scene.image_url,
          videoUrl: scene.video_url,
          videoStatus: scene.video_status,
          status: scene.status,
          prompt: scene.prompt,
          createdAt: scene.created_at,
          updatedAt: scene.updated_at
        })),
        createdAt: project.created_at,
        updated_at: project.updated_at,
        user_id: project.user_id,
        userId: project.user_id
      };
      
      setProjectDetails(formattedProject);
      
      // Generate project content for AI consumption
      const projectContentStr = `Project Title: ${formattedProject.title}
Description: ${formattedProject.description}
Full Script: ${formattedProject.fullScript || 'No script yet'}
Scenes: ${formattedProject.scenes.length}
${formattedProject.scenes.map((scene, index) => `
Scene ${index + 1}: ${scene.title || 'Untitled Scene'}
Description: ${scene.description || 'No description yet'}
Script: ${scene.script || 'No script yet'}
Image Prompt: ${scene.imagePrompt || 'No image prompt yet'}
`).join('\n')}`;
      
      setProjectContent(projectContentStr);
      
      return formattedProject;
    } catch (error) {
      console.error('Error fetching project details:', error);
      return null;
    }
  }, []);

  const createProject = async (title: string, description: string): Promise<string> => {
    try {
      const projectId = uuidv4();
      
      const { error } = await supabase
        .from('canvas_projects')
        .insert({
          id: projectId,
          title: title || 'Untitled Project',
          description: description || '',
          full_script: ''
        });
      
      if (error) throw error;
      
      // Create an initial scene
      const sceneId = uuidv4();
      const { error: sceneError } = await supabase
        .from('canvas_scenes')
        .insert({
          id: sceneId,
          title: 'Scene 1',
          project_id: projectId,
          description: '',
          script: '',
          image_prompt: '',
          voice_over_text: '',
          status: 'draft'
        });
      
      if (sceneError) throw sceneError;
      
      await fetchProjectDetails(projectId);
      return projectId;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  };

  const getProjectScenes = async (projectId: string): Promise<CanvasScene[]> => {
    try {
      const { data, error } = await supabase
        .from('canvas_scenes')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      return data.map((scene: any) => ({
        id: scene.id,
        title: scene.title,
        script: scene.script,
        description: scene.description,
        imagePrompt: scene.image_prompt,
        voiceOverText: scene.voice_over_text,
        duration: scene.duration,
        projectId: scene.project_id,
        imageUrl: scene.image_url,
        videoUrl: scene.video_url,
        videoStatus: scene.video_status,
        status: scene.status,
        prompt: scene.prompt,
        createdAt: scene.created_at,
        updatedAt: scene.updated_at
      }));
    } catch (error) {
      console.error('Error fetching project scenes:', error);
      return [];
    }
  };

  return (
    <ProjectContext.Provider value={{
      activeProject,
      setActiveProject,
      projects,
      setProjects,
      projectDetails,
      projectContent,
      fetchProjectDetails,
      createProject,
      getProjectScenes
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjectContext = () => useContext(ProjectContext);
