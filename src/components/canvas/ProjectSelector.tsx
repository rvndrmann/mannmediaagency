
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PlusCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CanvasProject, ProjectAsset } from '@/types/canvas.d';

interface ProjectSelectorProps {
  onBack: () => void;
  onSelectProject: (projectId: string) => void;
  onCreateProject: (title: string) => Promise<string>;
}

export function ProjectSelector({ onBack, onSelectProject, onCreateProject }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<CanvasProject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [newProjectTitle, setNewProjectTitle] = useState<string>('');
  const [creating, setCreating] = useState<boolean>(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchProjects();
  }, []);
  
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You need to be logged in to view projects');
        navigate('/login');
        return;
      }
      
      const { data, error } = await supabase
        .from('canvas_projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform the data to match CanvasProject interface
      const transformedProjects = (data || []).map((project: any): CanvasProject => ({
        id: project.id,
        title: project.title,
        description: project.description,
        final_video_url: project.final_video_url,
        full_script: project.full_script,
        main_product_image_url: project.main_product_image_url,
        project_assets: Array.isArray(project.project_assets) 
          ? project.project_assets as ProjectAsset[]
          : project.project_assets 
            ? JSON.parse(project.project_assets as string) as ProjectAsset[]
            : [] as ProjectAsset[],
        user_id: project.user_id,
        created_at: project.created_at,
        updated_at: project.updated_at,
        cover_image_url: project.cover_image_url,
        scenes: project.scenes || [],
        // Compatibility aliases
        userId: project.user_id,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        fullScript: project.full_script
      }));
      
      setProjects(transformedProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateProject = async () => {
    if (!newProjectTitle.trim()) {
      toast.error('Please enter a project title');
      return;
    }
    
    try {
      setCreating(true);
      const projectId = await onCreateProject(newProjectTitle);
      setNewProjectTitle('');
      
      if (projectId) {
        await fetchProjects();
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    } finally {
      setCreating(false);
    }
  };
  
  return (
    <div className="flex flex-col space-y-4">
      <div className="flex justify-between items-center mb-4">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft size={16} />
          Back
        </Button>
        <h2 className="text-2xl font-bold">Canvas Projects</h2>
      </div>
      
      <Card className="p-4">
        <h3 className="text-lg font-medium mb-2">Create New Project</h3>
        <div className="flex gap-2">
          <Input
            placeholder="Project title"
            value={newProjectTitle}
            onChange={(e) => setNewProjectTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
          />
          <Button onClick={handleCreateProject} disabled={creating || !newProjectTitle.trim()} className="gap-2">
            <PlusCircle size={16} />
            Create
          </Button>
        </div>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {loading ? (
          <p className="col-span-full text-center py-8">Loading projects...</p>
        ) : projects.length === 0 ? (
          <p className="col-span-full text-center py-8">No projects yet. Create your first project to get started.</p>
        ) : (
          projects.map((project) => (
            <Card
              key={project.id}
              className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onSelectProject(project.id)}
            >
              <h3 className="text-lg font-medium mb-2">{project.title}</h3>
              <p className="text-sm text-muted-foreground truncate">{project.description || 'No description'}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Created: {new Date(project.created_at || '').toLocaleDateString()}
              </p>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
