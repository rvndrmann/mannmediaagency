
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjectContext } from "@/hooks/multi-agent/project-context";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectSelectorProps {
  selectedProjectId: string | null;
  onProjectSelect: (projectId: string | null) => void;
  compact?: boolean;
}

export function ProjectSelector({
  selectedProjectId,
  onProjectSelect,
  compact = false
}: ProjectSelectorProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { setActiveProject } = useProjectContext();

  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoading(true);
      try {
        const { data: projectsData, error } = await supabase
          .from('canvas_projects')
          .select('id, title, description, created_at')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProjects(Array.isArray(projectsData) ? projectsData : []);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const handleChange = (value: string) => {
    const projectId = value === "none" ? null : value;
    onProjectSelect(projectId);
    setActiveProject(projectId);
  };

  // Find the current project title
  const currentProject = projects.find(p => p.id === selectedProjectId);
  const projectTitle = currentProject?.title || "No Project";

  return (
    <Select 
      value={selectedProjectId || "none"} 
      onValueChange={handleChange}
      disabled={isLoading}
    >
      <SelectTrigger 
        className={cn(
          "bg-muted/50", 
          compact ? "w-[140px] h-8" : "w-[220px]"
        )}
      >
        <div className="flex items-center truncate">
          <Briefcase className="mr-2 h-4 w-4" />
          <SelectValue placeholder="Select Project">
            {compact ? (
              <span className="truncate max-w-[100px]">{projectTitle}</span>
            ) : (
              projectTitle
            )}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No Project</SelectItem>
        {Array.isArray(projects) && projects.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            <div className="truncate max-w-[200px]">{project.title}</div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
