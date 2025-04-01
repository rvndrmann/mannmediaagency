
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, Plus, VideoIcon } from 'lucide-react';
import { useCanvas } from '@/hooks/use-canvas';
import { toast } from 'sonner';
import { CanvasProject } from '@/types/canvas';

interface ProjectSelectorProps {
  onBack: () => void;
  onSelectProject: (projectId: string) => void;
  onCreateProject: (title: string) => Promise<string>;
}

export function ProjectSelector({ onBack, onSelectProject, onCreateProject }: ProjectSelectorProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { projects, loading } = useCanvas(null);
  
  const handleCreateProject = async () => {
    if (!newProjectTitle.trim()) {
      toast.error('Please enter a title for your project');
      return;
    }
    
    setIsCreating(true);
    try {
      const projectId = await onCreateProject(newProjectTitle);
      if (projectId) {
        setShowCreateModal(false);
        setNewProjectTitle('');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };
  
  const sortedProjects = React.useMemo(() => {
    if (!projects || projects.length === 0) return [];
    
    return [...projects].sort((a, b) => {
      const dateA = new Date(a.created_at || a.createdAt || Date.now());
      const dateB = new Date(b.created_at || b.createdAt || Date.now());
      return dateB.getTime() - dateA.getTime();
    });
  }, [projects]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>
      
      <ScrollArea className="h-[500px] pr-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full flex justify-center p-12">
              <p className="text-muted-foreground">Loading projects...</p>
            </div>
          ) : sortedProjects.length === 0 ? (
            <div className="col-span-full text-center p-12">
              <VideoIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-4">Create your first project to get started</p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Project
              </Button>
            </div>
          ) : (
            sortedProjects.map((project) => (
              <Card 
                key={project.id} 
                className="cursor-pointer transition-all hover:bg-accent/50"
                onClick={() => onSelectProject(project.id)}
              >
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base truncate">{project.title || 'Untitled Project'}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-xs text-muted-foreground">
                    Created: {new Date(project.created_at || project.createdAt || Date.now()).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Scenes: {project.scenes?.length || 0}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
      
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Give your new video project a title. You can change it later.
            </DialogDescription>
          </DialogHeader>
          
          <Input
            placeholder="Enter project title"
            value={newProjectTitle}
            onChange={(e) => setNewProjectTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreateProject();
              }
            }}
          />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProject} disabled={isCreating || !newProjectTitle.trim()}>
              {isCreating ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
