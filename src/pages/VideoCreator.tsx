
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  createVideo, 
  getVideoStatus, 
  formatVideoProject, 
  VideoProject
} from "@/services/json2videoService";
import { VideoCreatorForm } from "@/components/video-creator/VideoCreatorForm";
import { VideoProjectsList } from "@/components/video-creator/VideoProjectsList";
import { toast } from "sonner";

const VideoCreator = () => {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [savedProjects, setSavedProjects] = useState<VideoProject[]>([]);
  
  // Check if user is authenticated
  const { data: session, isLoading: isSessionLoading } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        navigate("/auth/login");
        return null;
      }
      return session;
    },
  });
  
  // Load saved projects from localStorage
  useEffect(() => {
    const loadSavedProjects = () => {
      const savedData = localStorage.getItem('json2video_projects');
      if (savedData) {
        try {
          const projects = JSON.parse(savedData);
          setSavedProjects(projects);
        } catch (error) {
          console.error('Error loading saved projects:', error);
        }
      }
    };
    
    loadSavedProjects();
  }, []);
  
  // Save projects to localStorage
  const saveProjects = (projects: VideoProject[]) => {
    localStorage.setItem('json2video_projects', JSON.stringify(projects));
    setSavedProjects(projects);
  };
  
  const handleCreateVideo = async (jsonData: any) => {
    try {
      setIsCreating(true);
      
      const response = await createVideo(jsonData);
      
      const newProject = formatVideoProject(response);
      const updatedProjects = [newProject, ...savedProjects];
      
      saveProjects(updatedProjects);
      
      toast.success("Video creation started successfully!");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      toast.error(`Failed to create video: ${errorMessage}`);
    } finally {
      setIsCreating(false);
    }
  };
  
  const handleRefreshStatus = async (projectId: string) => {
    try {
      const response = await getVideoStatus(projectId);
      const updatedProject = formatVideoProject(response);
      
      const updatedProjects = savedProjects.map(project => 
        project.projectId === projectId ? updatedProject : project
      );
      
      saveProjects(updatedProjects);
      
      if (updatedProject.status.toLowerCase() === 'done') {
        toast.success("Video rendering complete!");
      } else if (updatedProject.status.toLowerCase() === 'failed') {
        toast.error("Video rendering failed.");
      } else {
        toast.info(`Video status: ${updatedProject.status}`);
      }
    } catch (error) {
      toast.error("Failed to refresh video status");
    }
  };
  
  if (isSessionLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }
  
  if (!session) {
    return null; // Redirect handled by the query
  }
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Video Creator</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <VideoCreatorForm
              onCreateVideo={handleCreateVideo}
              isLoading={isCreating}
            />
          </div>
          
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-semibold mb-4">Your Projects</h2>
            <VideoProjectsList
              projects={savedProjects}
              isLoading={false}
              onRefreshStatus={handleRefreshStatus}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCreator;
