
import React, { useState, useEffect } from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, FolderPlus } from "lucide-react";
import { useCanvasProjects } from "@/hooks/use-canvas-projects";
import { useUser } from "@/hooks/use-user";
import { toast } from "sonner";

interface ProjectSelectorProps {
  selectedProjectId?: string;
  onProjectSelect: (projectId: string) => void;
  allowCreateNew?: boolean;
  isCompact?: boolean;
}

export function ProjectSelector({ 
  selectedProjectId, 
  onProjectSelect, 
  allowCreateNew = false,
  isCompact = false 
}: ProjectSelectorProps) {
  const { user } = useUser();
  const { projects, isLoading, createProject } = useCanvasProjects();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateProject = async () => {
    if (!user) {
      toast.error("Please sign in to create a project");
      return;
    }

    setIsCreating(true);
    try {
      const newProject = await createProject("Untitled Project");
      if (newProject && newProject.id) {
        onProjectSelect(newProject.id);
        toast.success("New project created");
      }
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Failed to create project");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className={`w-full ${isCompact ? 'flex items-center gap-1' : ''}`}>
      <Select
        value={selectedProjectId}
        onValueChange={onProjectSelect}
        disabled={isLoading}
      >
        <SelectTrigger className={`${isCompact ? 'h-8 text-xs' : ''} bg-gray-800/60 border-gray-700`}>
          <SelectValue placeholder="Select a project" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {projects && projects.length > 0 ? (
            projects.map((project) => (
              <SelectItem key={project.id} value={project.id} className="text-sm">
                {project.title || `Project #${project.id.substring(0, 8)}`}
              </SelectItem>
            ))
          ) : (
            <SelectItem value="no-projects" disabled>
              No projects found
            </SelectItem>
          )}
        </SelectContent>
      </Select>

      {allowCreateNew && (
        <Button
          variant="outline"
          size={isCompact ? "sm" : "default"}
          className={`${isCompact ? 'h-8 px-2' : ''} bg-gray-800/60 border-gray-700 text-white hover:bg-gray-700/60`}
          onClick={handleCreateProject}
          disabled={isCreating}
        >
          {isCompact ? (
            <Plus className="h-4 w-4" />
          ) : (
            <>
              <FolderPlus className="h-4 w-4 mr-2" />
              New Project
            </>
          )}
        </Button>
      )}
    </div>
  );
}
