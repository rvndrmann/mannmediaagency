
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

interface ProjectSelectorProps {
  selectedProjectId?: string;
  onProjectSelect: (projectId: string) => void;
}

interface Project {
  id: string;
  title: string;
  createdAt: string;
  scenesCount?: number;
}

export function ProjectSelector({ 
  selectedProjectId, 
  onProjectSelect 
}: ProjectSelectorProps) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('canvas_projects')
          .select(`
            id, 
            title, 
            created_at
          `)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        // Get scene counts for each project
        const projectsWithSceneCounts = await Promise.all(
          data.map(async (project) => {
            const { count, error: countError } = await supabase
              .from('canvas_scenes')
              .select('id', { count: 'exact', head: true })
              .eq('project_id', project.id);
              
            return {
              id: project.id,
              title: project.title,
              createdAt: project.created_at,
              scenesCount: countError ? 0 : count || 0
            };
          })
        );
        
        setProjects(projectsWithSceneCounts);
      } catch (error) {
        console.error("Error fetching projects:", error);
        toast.error("Failed to load projects");
      } finally {
        setLoading(false);
      }
    };
    
    fetchProjects();
  }, []);
  
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-[#21283B]/60 border-white/10 text-white"
        >
          <div className="flex items-center truncate">
            <Video className="mr-2 h-4 w-4 flex-shrink-0 text-blue-400" />
            <span className="truncate">
              {selectedProject ? selectedProject.title : "Select a video project"}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 bg-[#21283B] border-white/10 text-white">
        <Command className="bg-transparent">
          <CommandInput placeholder="Search projects..." className="border-white/10" />
          <CommandEmpty className="py-6 text-center text-sm">
            {loading ? "Loading projects..." : "No projects found."}
          </CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-auto">
            {projects.map((project) => (
              <CommandItem
                key={project.id}
                value={project.id}
                onSelect={() => {
                  onProjectSelect(project.id);
                  setOpen(false);
                }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center">
                  <Video className="mr-2 h-4 w-4 text-blue-400" />
                  <span>{project.title}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-xs text-gray-400 mr-2">
                    {project.scenesCount} {project.scenesCount === 1 ? 'scene' : 'scenes'}
                  </span>
                  {project.id === selectedProjectId && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
