
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { CanvasProject } from "@/types/canvas";
import { ArrowLeft, Video, Calendar, Clock, Trash2, Hash, Plus, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";

interface ProjectHistoryProps {
  projectId: string;
  onBack: () => void;
  onSelectProject: (id: string) => void;
}

export function ProjectHistory({ projectId, onBack, onSelectProject }: ProjectHistoryProps) {
  const [projects, setProjects] = useState<CanvasProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  
  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        setError("Authentication error: Please log in again");
        throw userError;
      }
      
      if (!userData.user) {
        setError("You must be logged in to access projects");
        return;
      }
      
      const { data, error } = await supabase
        .from("canvas_projects")
        .select("*")
        .eq("user_id", userData.user?.id)
        .order("created_at", { ascending: false });
        
      if (error) {
        setError("Could not load your projects. Please try again.");
        throw error;
      }
      
      const formattedProjects = data.map(project => ({
        id: project.id,
        title: project.title,
        description: project.description,
        fullScript: project.full_script,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        userId: project.user_id,
        scenes: [] // We don't need scenes for the history view
      }));
      
      setProjects(formattedProjects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load project history");
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchProjects();
  }, [projectId]);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  const handleProjectSelect = (selectedProjectId: string) => {
    if (selectedProjectId === projectId) return;
    
    // Pass the ID to the parent component first
    onSelectProject(selectedProjectId);
  };
  
  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    
    try {
      // First check if this is the current project
      const isCurrentProject = projectToDelete === projectId;
      
      const { error: scenesError } = await supabase
        .from('canvas_scenes')
        .delete()
        .eq('project_id', projectToDelete);
      
      if (scenesError) throw scenesError;
      
      const { error: projectError } = await supabase
        .from('canvas_projects')
        .delete()
        .eq('id', projectToDelete);
      
      if (projectError) throw projectError;
      
      toast.success("Project deleted successfully");
      
      // Remove the deleted project from the list
      setProjects(prev => prev.filter(p => p.id !== projectToDelete));
      
      if (isCurrentProject) {
        // If we deleted the current project, we should navigate away
        // We'll let the parent component handle this
        onBack();
        onSelectProject('');
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Failed to delete project");
    } finally {
      setProjectToDelete(null);
    }
  };
  
  return (
    <div className="flex-1 bg-slate-100 dark:bg-slate-950 overflow-hidden flex flex-col">
      <div className="p-4 border-b bg-background flex justify-between items-center">
        <div className="flex items-center">
          <Button variant="ghost" onClick={onBack} className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h2 className="text-xl font-semibold">Project History</h2>
        </div>
        <Button variant="ghost" onClick={fetchProjects} size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="sr-only">Refresh</span>
        </Button>
      </div>
      
      <div className="flex-1 p-4 overflow-auto">
        {error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <h3 className="text-red-800 dark:text-red-300 font-medium">Error</h3>
            <p className="text-red-700 dark:text-red-400">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2 text-red-600 dark:text-red-400 border-red-300 dark:border-red-800"
              onClick={fetchProjects}
            >
              Try Again
            </Button>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-2/3" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.length > 0 ? (
              projects.map((project) => (
                <Card 
                  key={project.id} 
                  className={`${project.id === projectId ? "border-primary" : ""} transition-all hover:shadow-md cursor-pointer`}
                  onClick={() => handleProjectSelect(project.id)}
                >
                  <CardHeader className="pb-2 relative">
                    <CardTitle className="text-base flex items-center truncate">
                      <Video className="h-4 w-4 mr-2 text-primary flex-shrink-0" />
                      <span className="truncate">{project.title}</span>
                    </CardTitle>
                    <div className="flex items-center text-xs text-muted-foreground mt-1 truncate">
                      <Hash className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                      <span className="truncate">ID: {project.id}</span>
                    </div>
                    {project.id !== projectId && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProjectToDelete(project.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="text-sm">
                    <div className="flex items-center text-muted-foreground mb-1 truncate">
                      <Calendar className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                      <span className="truncate">Created: {formatDate(project.createdAt)}</span>
                    </div>
                    <div className="flex items-center text-muted-foreground truncate">
                      <Clock className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                      <span className="truncate">Last updated: {formatDate(project.updatedAt || project.createdAt)}</span>
                    </div>
                    {project.id === projectId && (
                      <p className="text-xs mt-2 text-primary font-medium">Current project</p>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-12">
                <div className="text-center space-y-4">
                  <Video className="h-12 w-12 mx-auto text-muted-foreground" />
                  <h3 className="text-xl font-medium">No Projects Found</h3>
                  <p className="text-muted-foreground">You don't have any projects yet. Create your first video project to get started.</p>
                  <Button 
                    className="mt-2" 
                    onClick={onBack}
                    size="lg"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Project
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <AlertDialog open={!!projectToDelete} onOpenChange={() => setProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project and all its scenes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
