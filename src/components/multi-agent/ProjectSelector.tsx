
import React, { useEffect, useState } from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { CanvasProject } from '@/types/canvas';
import { useCanvasProjects } from '@/hooks/use-canvas-projects';

interface ProjectSelectorProps {
  onProjectSelect: (projectId: string) => void;
  selectedProjectId?: string | null;
  autoSelectFirst?: boolean;
  allowCreateNew?: boolean;
}

export function ProjectSelector({ 
  onProjectSelect, 
  selectedProjectId = null,
  autoSelectFirst = true,
  allowCreateNew = false
}: ProjectSelectorProps) {
  const { projects, isLoading } = useCanvasProjects();
  const [value, setValue] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Set initial value from props if available
    if (selectedProjectId) {
      setValue(selectedProjectId);
    }
    // Auto-select first project if enabled and no selection
    else if (autoSelectFirst && projects.length > 0 && !value) {
      const firstProjectId = projects[0].id;
      setValue(firstProjectId);
      onProjectSelect(firstProjectId);
    }
  }, [selectedProjectId, projects, autoSelectFirst, value, onProjectSelect]);

  const handleValueChange = (newValue: string) => {
    setValue(newValue);
    onProjectSelect(newValue);
  };

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger className="w-full h-10">
          <SelectValue placeholder="Loading projects..." />
        </SelectTrigger>
      </Select>
    );
  }

  if (projects.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger className="w-full h-10">
          <SelectValue placeholder="No projects available" />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={value} onValueChange={handleValueChange}>
      <SelectTrigger className="w-full h-10">
        <SelectValue placeholder="Select a project" />
      </SelectTrigger>
      <SelectContent>
        {projects.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            {project.title}
          </SelectItem>
        ))}
        {allowCreateNew && (
          <SelectItem value="create-new" className="text-primary font-medium">
            + Create New Project
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
