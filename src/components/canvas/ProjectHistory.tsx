
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { CanvasProject } from "@/types/canvas";
import { ArrowLeft, Video, Calendar, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface ProjectHistoryProps {
  projectId: string;
  onBack: () => void;
}

export function ProjectHistory({ projectId, onBack }: ProjectHistoryProps) {
  const [projects, setProjects] = useState<CanvasProject[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchProjects() {
      try {
        const { data, error } = await supabase
          .from("canvas_projects")
          .select("*")
          .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
          .order("created_at", { ascending: false });
          
        if (error) throw error;
        
        // Format the data to match CanvasProject type
        const formattedProjects = data.map(project => ({
          id: project.id,
          title: project.title,
          description: project.description,
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
    }
    
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
      </div>
      
      <div className="flex-1 p-4 overflow-auto">
        {loading ? (
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
                <Card key={project.id} className={project.id === projectId ? "border-primary" : ""}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center">
                      <Video className="h-4 w-4 mr-2 text-primary" />
                      {project.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <div className="flex items-center text-muted-foreground mb-1">
                      <Calendar className="h-3.5 w-3.5 mr-1" />
                      Created: {formatDate(project.createdAt)}
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 mr-1" />
                      Last updated: {formatDate(project.updatedAt)}
                    </div>
                    {project.id === projectId && (
                      <p className="text-xs mt-2 text-primary font-medium">Current project</p>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">No project history found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
