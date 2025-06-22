import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CanvasProject, CanvasScene } from '@/types/canvas';
import { useProjectContext } from '@/hooks/multi-agent/project-context';
import { useCanvasAgent } from '@/hooks/use-canvas-agent';
import { useCanvasProjects } from '@/hooks/use-canvas-projects';
import { Loader2 } from 'lucide-react';

const Canvas = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [script, setScript] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [sceneOrder, setSceneOrder] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fix the activeProject state to use string instead of CanvasProject
  const [activeProject, setActiveProject] = useState<string | null>(null);
  
  const { project, updateProject } = useProjectContext();
  const { projects, loading: projectsLoading } = useCanvasProjects();
  const canvasAgent = useCanvasAgent({ projectId });

  useEffect(() => {
    if (project) {
      setTitle(project.title);
      setDescription(project.description || '');
    }
  }, [project]);

  useEffect(() => {
    if (projectId) {
      setActiveProject(projectId);
    }
  }, [projectId]);

  const handleProjectUpdate = async () => {
    if (!activeProject) {
      console.warn("No active project to update");
      return;
    }

    setLoading(true);
    try {
      await updateProject({
        title,
        description,
      });
      toast.success("Project updated successfully");
    } catch (error: any) {
      console.error("Error updating project:", error);
      setError(error.message || "Failed to update project");
      toast.error("Failed to update project");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (imageUrl: string): Promise<void> => {
    if (!activeProject) {
      console.warn("No active project to upload image to");
      return;
    }
    
    try {
      // Handle image upload logic here
      console.log("Uploading image:", imageUrl);
      // You can add your image upload logic here
    } catch (error) {
      console.error("Error uploading image:", error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Canvas Project</h1>
      
      {loading && (
        <div className="flex items-center justify-center">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </div>
      )}
      
      {error && (
        <div className="text-red-500 mb-4">Error: {error}</div>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Project Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Project Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Button onClick={handleProjectUpdate} disabled={loading}>
            Update Project
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Canvas;
