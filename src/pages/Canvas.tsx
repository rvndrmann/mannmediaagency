
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CanvasSidebar } from "@/components/canvas/CanvasSidebar";
import { CanvasWorkspace } from "@/components/canvas/CanvasWorkspace";
import { CanvasHeader } from "@/components/canvas/CanvasHeader";
import { CanvasDetailPanel } from "@/components/canvas/CanvasDetailPanel";
import { CanvasEmptyState } from "@/components/canvas/CanvasEmptyState";
import { useCanvas } from "@/hooks/use-canvas";
import { Loader2 } from "lucide-react";

export default function Canvas() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const navigate = useNavigate();
  
  const {
    project,
    loading,
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
    if (!loading && !projectId) {
      const createNewProject = async () => {
        const newProjectId = await createProject("New Video Project");
        if (newProjectId) {
          navigate(`/canvas?projectId=${newProjectId}`);
        }
      };
      
      createNewProject();
    }
  }, [loading, projectId, createProject, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-2 text-xl">Loading canvas...</p>
      </div>
    );
  }

  if (!project) {
    return <CanvasEmptyState onCreateProject={createProject} />;
  }

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
