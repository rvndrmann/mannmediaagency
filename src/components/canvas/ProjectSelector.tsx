import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Plus, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CanvasProject } from "@/types/canvas";

interface ProjectSelectorProps {
  projects: CanvasProject[];
  selectedProjectId: string | null;
  onCreateProject: (title: string) => Promise<void>;
  onSelectProject: (id: string) => void;
}

export function ProjectSelector({
  projects,
  selectedProjectId,
  onCreateProject,
  onSelectProject,
}: ProjectSelectorProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [search, setSearch] = useState("");

  const filteredProjects = projects.filter((project) =>
    project.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    await onCreateProject(title);
    setOpen(false);
    setTitle("");
  };

  return (
    <div className="w-64 border-r flex flex-col bg-secondary">
      <div className="p-4 border-b">
        <Label htmlFor="search" className="sr-only">
          Search projects
        </Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="search"
            placeholder="Search projects..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="py-2">
          {filteredProjects.map((project) => (
            <ProjectItem
              key={project.id}
              project={project}
              isSelected={project.id === selectedProjectId}
              onSelect={onSelectProject}
            />
          ))}
        </div>
      </ScrollArea>
      <div className="p-4 border-t">
        <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Project
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>
              Give your project a title. You can always change this later.
            </DialogDescription>
          </DialogHeader>
          <form className="mt-4" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="My awesome project"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <Button type="submit" className="w-full">
                  Create
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const ProjectItem: React.FC<{
  project: CanvasProject;
  isSelected: boolean;
  onSelect: (id: string) => void;
}> = ({ project, isSelected, onSelect }) => {
  return (
    <div 
      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
        isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-accent'
      }`}
      onClick={() => onSelect(project.id)}
    >
      <h3 className="font-medium">{project.title}</h3>
      <div className="flex items-center justify-between mt-2">
        <span className="text-sm text-muted-foreground">
          {new Date(project.created_at || '').toLocaleDateString()}
        </span>
        <span className="text-xs text-muted-foreground">
          {/* Use created_at instead of createdAt */}
          {project.created_at ? new Date(project.created_at).toLocaleDateString() : 'No date'}
        </span>
      </div>
    </div>
  );
};
