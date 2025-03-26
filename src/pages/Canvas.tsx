
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CanvasSidebar } from "@/components/canvas/CanvasSidebar";
import { CanvasWorkspace } from "@/components/canvas/CanvasWorkspace";
import { CanvasHeader } from "@/components/canvas/CanvasHeader";
import { CanvasDetailPanel } from "@/components/canvas/CanvasDetailPanel";
import { CanvasEmptyState } from "@/components/canvas/CanvasEmptyState";
import { useCanvas } from "@/hooks/use-canvas";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function Canvas() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const navigate = useNavigate();
  
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  
  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!data.session);
      
      if (!data.session) {
        toast.error("Please log in to access the Canvas");
        navigate("/auth");
      }
    };
    
    checkAuth();
  }, [navigate]);
  
  const {
    project,
    loading,
    error,
    selectedScene,
    selectedSceneId,
    setSelectedSceneId,
    createProject,
    addScene,
    deleteScene,
    updateScene
  } = useCanvas(projectId || undefined);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [detailPanelCollapsed, setDetailPanelCollapsed] = useState(false);
  
  // Create a new project if none is provided
  useEffect(() => {
    if (!loading && !projectId && isAuthenticated) {
      const createNewProject = async () => {
        try {
          const newProjectId = await createProject("New Video Project");
          if (newProjectId) {
            navigate(`/canvas?projectId=${newProjectId}`);
          }
        } catch (err) {
          console.error("Failed to create new project:", err);
          toast.error("Failed to create new project");
        }
      };
      
      createNewProject();
    }
  }, [loading, projectId, createProject, navigate, isAuthenticated]);

  // Show loading state
  if (loading || isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-2 text-xl">Loading canvas...</p>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-xl text-red-500 mb-4">{error}</p>
        <button 
          className="px-4 py-2 bg-primary text-white rounded-md"
          onClick={() => navigate("/")}
        >
          Return to Home
        </button>
      </div>
    );
  }

  // Show empty state if no project
  if (!project && isAuthenticated) {
    return <CanvasEmptyState onCreateProject={createProject} />;
  }

  // Main canvas UI
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <CanvasHeader 
        project={project} 
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <CanvasSidebar 
          project={project}
          selectedSceneId={selectedSceneId}
          setSelectedSceneId={setSelectedSceneId}
          addScene={addScene}
          deleteScene={deleteScene}
          collapsed={sidebarCollapsed}
        />
        
        <CanvasWorkspace 
          project={project}
          selectedScene={selectedScene}
          updateScene={updateScene}
        />
        
        <CanvasDetailPanel 
          scene={selectedScene}
          updateScene={updateScene}
          collapsed={detailPanelCollapsed}
          setCollapsed={setDetailPanelCollapsed}
        />
      </div>
    </div>
  );
}
