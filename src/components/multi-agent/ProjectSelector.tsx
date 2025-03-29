
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface ProjectSelectorProps {
  selectedProjectId: string | null;
  onProjectSelect: (projectId: string | null) => void;
  showScenes?: boolean;
  compact?: boolean;
}

export function ProjectSelector({ 
  selectedProjectId, 
  onProjectSelect,
  showScenes = false,
  compact = false 
}: ProjectSelectorProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setLoading(false);
          return;
        }

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
    };

    fetchProjects();
  }, []);

  const handleChange = (value: string) => {
    if (value === "none") {
      onProjectSelect(null);
    } else {
      onProjectSelect(value);
    }
  };

  return (
    <div className={compact ? "" : "space-y-2"}>
      {!compact && <Label htmlFor="project-select">Select a project</Label>}
      <Select
        value={selectedProjectId || "none"}
        onValueChange={handleChange}
        disabled={loading}
      >
        <SelectTrigger className={compact ? "h-8 w-[180px]" : "w-full"}>
          <SelectValue placeholder="Choose a project..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No project</SelectItem>
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
