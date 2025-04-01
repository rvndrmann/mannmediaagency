
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface Project {
  id: string;
  title: string;
  description?: string;
}

interface ProjectSelectorProps {
  projectId?: string;
  onBack: () => void;
  onSelectProject: (id: string) => void;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  projectId,
  onBack,
  onSelectProject
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [newProjectTitle, setNewProjectTitle] = React.useState('');

  React.useEffect(() => {
    // This would be replaced with actual data fetching in a real implementation
    setProjects([
      { id: '1', title: 'Product Demo', description: 'A product demo video' },
      { id: '2', title: 'Marketing Campaign', description: 'Marketing video for social media' }
    ]);
  }, []);

  const handleCreateProject = async () => {
    if (!newProjectTitle.trim()) return;
    setIsLoading(true);
    
    try {
      // In a real implementation, this would create a project in the database
      const newProject = {
        id: Math.random().toString(36).substring(7),
        title: newProjectTitle,
        description: ''
      };
      
      setProjects(prev => [...prev, newProject]);
      setNewProjectTitle('');
      
      // Automatically select the new project
      onSelectProject(newProject.id);
    } catch (error) {
      console.error("Error creating project:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Select a Project</h2>
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map(project => (
          <Card 
            key={project.id} 
            className={`cursor-pointer transition-all hover:border-primary ${
              projectId === project.id ? 'border-2 border-primary' : ''
            }`}
            onClick={() => onSelectProject(project.id)}
          >
            <CardHeader>
              <CardTitle>{project.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {project.description || 'No description'}
              </p>
            </CardContent>
          </Card>
        ))}
        
        {isLoading && (
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        )}
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Create New Project</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="projectTitle">Project Title</Label>
          <Input
            id="projectTitle" 
            value={newProjectTitle}
            onChange={e => setNewProjectTitle(e.target.value)}
            placeholder="Enter project title"
          />
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleCreateProject}
            disabled={!newProjectTitle.trim() || isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Project'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
