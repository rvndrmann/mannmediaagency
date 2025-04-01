
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CanvasProject, CanvasScene } from '@/types/canvas';
import { supabase } from '@/integrations/supabase/client';

export type ProjectContextType = {
  activeProject: string | null;
  setActiveProject: (projectId: string | null) => void;
  projectDetails: CanvasProject | null;
  projectContent: string;
  fetchProjectDetails: (projectId: string) => Promise<void>;
  updateProjectDetails: (updates: Partial<CanvasProject>) => Promise<void>;
};

const defaultValues: ProjectContextType = {
  activeProject: null,
  setActiveProject: () => {},
  projectDetails: null,
  projectContent: '',
  fetchProjectDetails: async () => {},
  updateProjectDetails: async () => {}
};

const ProjectContext = createContext<ProjectContextType>(defaultValues);

export function useProjectContext(options: { initialProjectId?: string } = {}) {
  const context = useContext(ProjectContext);
  
  // If an initialProjectId is provided and we don't have an activeProject yet,
  // set it and fetch details
  useEffect(() => {
    if (options.initialProjectId && !context.activeProject) {
      context.setActiveProject(options.initialProjectId);
      context.fetchProjectDetails(options.initialProjectId);
    }
  }, [options.initialProjectId, context.activeProject]);
  
  return context;
}

interface ProjectProviderProps {
  children: ReactNode;
}

export function ProjectProvider({ children }: ProjectProviderProps) {
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [projectDetails, setProjectDetails] = useState<CanvasProject | null>(null);
  const [projectContent, setProjectContent] = useState<string>('');

  // Fetch project details when activeProject changes
  useEffect(() => {
    if (activeProject) {
      fetchProjectDetails(activeProject);
    } else {
      setProjectDetails(null);
      setProjectContent('');
    }
  }, [activeProject]);

  // Function to fetch project details
  const fetchProjectDetails = async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from('canvas_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      
      // Also fetch scenes for this project
      const { data: scenes, error: scenesError } = await supabase
        .from('canvas_scenes')
        .select('*')
        .eq('project_id', projectId);
      
      if (scenesError) throw scenesError;
      
      // Transform data to match CanvasProject type
      const project: CanvasProject = {
        id: data.id,
        title: data.title,
        description: data.description || '',
        fullScript: data.full_script || '',
        scenes: scenes.map((scene: any) => ({
          id: scene.id,
          title: scene.title || 'Untitled Scene',
          script: scene.script || '',
          description: scene.description || '',
          imagePrompt: scene.image_prompt || '',
          voiceOverText: scene.voiceover_text || '',
          duration: scene.duration || 0,
          projectId: scene.project_id,
          imageUrl: scene.image_url,
          videoUrl: scene.video_url,
          voiceOverUrl: scene.voiceover_url,
          backgroundMusicUrl: scene.background_music_url,
          productImageUrl: scene.product_image_url,
          createdAt: scene.created_at,
          updatedAt: scene.updated_at
        })) || [],
        createdAt: data.created_at,
        updated_at: data.updated_at,
        userId: data.user_id
      };
      
      setProjectDetails(project);
      
      // Create a project content string that can be used as context for AI
      const content = `
Project: ${project.title}
Description: ${project.description}
Scenes: ${project.scenes.length}
${project.fullScript ? `Full Script: ${project.fullScript}` : ''}
${project.scenes.map((scene, i) => 
  `Scene ${i+1}: ${scene.title}
  ${scene.description ? `Description: ${scene.description}` : ''}
  ${scene.script ? `Script: ${scene.script}` : ''}
  ${scene.imagePrompt ? `Image Prompt: ${scene.imagePrompt}` : ''}`
).join('\n\n')}
      `;
      
      setProjectContent(content);
    } catch (error) {
      console.error('Error fetching project details:', error);
      setProjectDetails(null);
      setProjectContent('');
    }
  };

  // Function to update project details
  const updateProjectDetails = async (updates: Partial<CanvasProject>) => {
    if (!activeProject || !projectDetails) return;
    
    try {
      // Transform updates to match database schema
      const dbUpdates: Record<string, any> = {};
      
      if (updates.title) dbUpdates.title = updates.title;
      if (updates.description) dbUpdates.description = updates.description;
      if (updates.fullScript) dbUpdates.full_script = updates.fullScript;
      
      const { error } = await supabase
        .from('canvas_projects')
        .update(dbUpdates)
        .eq('id', activeProject);
      
      if (error) throw error;
      
      // Update local state
      setProjectDetails(prev => prev ? { ...prev, ...updates } : null);
      
      // Update project content
      if (projectDetails) {
        const updatedProject = { ...projectDetails, ...updates };
        
        const content = `
Project: ${updatedProject.title}
Description: ${updatedProject.description}
Scenes: ${updatedProject.scenes.length}
${updatedProject.fullScript ? `Full Script: ${updatedProject.fullScript}` : ''}
${updatedProject.scenes.map((scene, i) => 
  `Scene ${i+1}: ${scene.title}
  ${scene.description ? `Description: ${scene.description}` : ''}
  ${scene.script ? `Script: ${scene.script}` : ''}
  ${scene.imagePrompt ? `Image Prompt: ${scene.imagePrompt}` : ''}`
).join('\n\n')}
        `;
        
        setProjectContent(content);
      }
    } catch (error) {
      console.error('Error updating project details:', error);
    }
  };

  const value = {
    activeProject,
    setActiveProject,
    projectDetails,
    projectContent,
    fetchProjectDetails,
    updateProjectDetails
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}
