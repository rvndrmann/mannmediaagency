import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth'; // Assuming useAuth provides user info
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { CanvasProject, CanvasScene } from '@/types/canvas'; // Assuming these types exist

export const AdminCanvasIntervention = () => {
  const { user } = useAuth(); // Get authenticated user
  const [projects, setProjects] = useState<CanvasProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [scenes, setScenes] = useState<CanvasScene[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [updateContent, setUpdateContent] = useState('');
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingScenes, setIsLoadingScenes] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Canvas Projects
  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoadingProjects(true);
      const { data, error } = await supabase
        .from('canvas_projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching projects:', error);
        toast.error('Failed to load projects.');
      } else {
        setProjects(data || []);
      }
      setIsLoadingProjects(false);
    };
    fetchProjects();
  }, []);

  // Fetch Scenes when Project changes
  useEffect(() => {
    if (!selectedProjectId) {
      setScenes([]);
      setSelectedSceneId(null);
      return;
    }

    const fetchScenes = async () => {
      setIsLoadingScenes(true);
      setSelectedSceneId(null); // Reset scene selection
      const { data, error } = await supabase
        .from('canvas_scenes')
        .select('*')
        .eq('project_id', selectedProjectId)
        .order('scene_order', { ascending: true });

      if (error) {
        console.error('Error fetching scenes:', error);
        toast.error('Failed to load scenes for the selected project.');
        setScenes([]);
      } else {
        setScenes(data || []);
      }
      setIsLoadingScenes(false);
    };

    fetchScenes();
  }, [selectedProjectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !selectedSceneId || !updateContent.trim() || !user?.id) {
      toast.warning('Please select a project, scene, and enter update content.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('admin_scene_updates').insert({
        project_id: selectedProjectId,
        scene_id: selectedSceneId,
        admin_user_id: user.id,
        update_content: updateContent.trim(),
        // Assuming 'status' defaults or is handled by trigger/policy
      });

      if (error) {
        throw error;
      }

      toast.success('Scene update submitted successfully!');
      // Optionally clear the form
      // setSelectedProjectId(null); // Keep project selected?
      setSelectedSceneId(null);
      setUpdateContent('');

    } catch (error: any) {
      console.error('Error submitting scene update:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to submit update: ${errorMessage || 'An unknown error occurred'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Admin Canvas Scene Intervention</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Project Selector */}
        <div>
          <Label htmlFor="project-select">Select Project</Label>
          <Select
            value={selectedProjectId ?? ''}
            onValueChange={(value) => setSelectedProjectId(value)}
            disabled={isLoadingProjects || isSubmitting}
          >
            <SelectTrigger id="project-select">
              <SelectValue placeholder={isLoadingProjects ? "Loading projects..." : "Select a project"} />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.title || `Project ${project.id.substring(0, 8)}`} (ID: {project.id.substring(0, 8)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Scene Selector */}
        <div>
          <Label htmlFor="scene-select">Select Scene</Label>
          <Select
            value={selectedSceneId ?? ''}
            onValueChange={(value) => setSelectedSceneId(value)}
            disabled={!selectedProjectId || isLoadingScenes || isSubmitting}
          >
            <SelectTrigger id="scene-select">
              <SelectValue placeholder={
                !selectedProjectId ? "Select a project first" :
                isLoadingScenes ? "Loading scenes..." :
                scenes.length === 0 ? "No scenes found" :
                "Select a scene"
              } />
            </SelectTrigger>
            <SelectContent>
              {scenes.map((scene) => (
                <SelectItem key={scene.id} value={scene.id}>
                  Scene {(scene.scene_order ?? 0) + 1} (ID: {scene.id.substring(0, 8)})
                  {/* Optionally display scene title or first few words of script */}
                  {scene.script && ` - "${scene.script.substring(0, 30)}..."`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Update Content */}
        <div>
          <Label htmlFor="update-content">Update Content / Note</Label>
          <Textarea
            id="update-content"
            value={updateContent}
            onChange={(e) => setUpdateContent(e.target.value)}
            placeholder="Enter the update or note for the selected scene..."
            rows={4}
            disabled={!selectedSceneId || isSubmitting}
          />
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={!selectedSceneId || !updateContent.trim() || isSubmitting || isLoadingProjects || isLoadingScenes}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Scene Update'}
        </Button>
      </form>
    </div>
  );
};