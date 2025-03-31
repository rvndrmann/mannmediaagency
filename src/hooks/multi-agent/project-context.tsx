
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProjectDetails {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string | null;
  user_id: string;
}

interface ProjectSummary {
  id: string;
  title: string;
  created_at: string;
}

interface ProjectContextType {
  activeProjectId: string | null;
  projectDetails: ProjectDetails | null;
  isLoading: boolean;
  error: string | null;
  availableProjects: ProjectSummary[];
  hasLoadedProjects: boolean;
  setActiveProject: (projectId: string) => void;
  createProject: (title: string, description?: string) => Promise<string | null>;
  fetchAvailableProjects: () => Promise<void>;
  fetchProjectDetails: (projectId: string) => Promise<ProjectDetails | null>;
}

// Create context with default values
const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// Create provider component
export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [availableProjects, setAvailableProjects] = useState<ProjectSummary[]>([]);
  const [hasLoadedProjects, setHasLoadedProjects] = useState<boolean>(false);

  // Set active project
  const setActiveProject = useCallback((projectId: string) => {
    setActiveProjectId(projectId);
  }, []);

  // Fetch project details
  const fetchProjectDetails = useCallback(async (projectId: string): Promise<ProjectDetails | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("canvas_projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (error) {
        throw error;
      }

      return data as ProjectDetails;
    } catch (err: any) {
      console.error("Error fetching project details:", err);
      setError(err.message || "Failed to fetch project details");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create new project
  const createProject = useCallback(async (title: string, description?: string): Promise<string | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("canvas_projects")
        .insert({
          title,
          description: description || "",
          user_id: userData.user.id,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Create an initial scene
      const { error: sceneError } = await supabase
        .from("canvas_scenes")
        .insert({
          project_id: data.id,
          title: "Scene 1",
          scene_order: 1,
        });

      if (sceneError) {
        throw sceneError;
      }

      // Refresh available projects
      await fetchAvailableProjects();
      
      return data.id;
    } catch (err: any) {
      console.error("Error creating project:", err);
      setError(err.message || "Failed to create project");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch all available projects
  const fetchAvailableProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        setAvailableProjects([]);
        return;
      }

      const { data, error } = await supabase
        .from("canvas_projects")
        .select("id, title, created_at")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setAvailableProjects(data as ProjectSummary[]);
      setHasLoadedProjects(true);
    } catch (err: any) {
      console.error("Error fetching available projects:", err);
      setError(err.message || "Failed to fetch projects");
      setAvailableProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load project details when activeProjectId changes
  useEffect(() => {
    if (activeProjectId) {
      (async () => {
        try {
          const details = await fetchProjectDetails(activeProjectId);
          if (details) {
            setProjectDetails(details);
          }
        } catch (err) {
          console.error("Error loading project details:", err);
        }
      })();
    } else {
      setProjectDetails(null);
    }
  }, [activeProjectId, fetchProjectDetails]);

  // Context value
  const value: ProjectContextType = {
    activeProjectId,
    projectDetails,
    isLoading,
    error,
    availableProjects,
    hasLoadedProjects,
    setActiveProject,
    createProject,
    fetchAvailableProjects,
    fetchProjectDetails
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};

// Custom hook to use the context
export const useProjectContext = (options?: { initialProjectId?: string }) => {
  const context = useContext(ProjectContext);
  
  if (context === undefined) {
    throw new Error("useProjectContext must be used within a ProjectProvider");
  }
  
  // Set initial project ID if provided
  useEffect(() => {
    if (options?.initialProjectId && context.activeProjectId !== options.initialProjectId) {
      context.setActiveProject(options.initialProjectId);
    }
  }, [options?.initialProjectId]);
  
  return context;
};

// Export consumer hook for compatibility
export const useProjectContextConsumer = () => {
  const context = useContext(ProjectContext);
  
  if (context === undefined) {
    throw new Error("useProjectContextConsumer must be used within a ProjectProvider");
  }
  
  return context;
};
