
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Folders, ListFilter } from "lucide-react";

export interface ProjectSelectorProps {
  selectedProjectId: string;
  onProjectSelect: (id: string) => void;
  showScenes?: boolean;
}

export function ProjectSelector({ selectedProjectId, onProjectSelect, showScenes = false }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;
        
        const { data, error } = await supabase
          .from('canvas_projects')
          .select('id, title, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        setProjects(data || []);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchProjects();
  }, []);

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-1 text-muted-foreground">
        <Folders className="h-4 w-4" />
        <span className="text-sm font-medium">Select a project</span>
      </div>
      
      <Select
        value={selectedProjectId || "none"}
        onValueChange={onProjectSelect}
        disabled={loading}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a project" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No project (general chat)</SelectItem>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
