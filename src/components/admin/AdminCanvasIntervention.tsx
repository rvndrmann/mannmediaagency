
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { CanvasProject, CanvasScene } from '@/types/canvas';

export const AdminCanvasIntervention = () => {
  const { user } = useAuth();
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
        // Normalize the fetched data before setting state
        const normalizedProjects = (data || []).map((p: any): CanvasProject => ({
          id: p.id,
          title: p.title,
          description: p.description || '',
          final_video_url: p.final_video_url || null,
          full_script: p.full_script || '',
          main_product_image_url: p.main_product_image_url || null,
          project_assets: Array.isArray(p.project_assets) ? p.project_assets : [],
          user_id: p.user_id || '',
          created_at: p.created_at || new Date().toISOString(),
          updated_at: p.updated_at || new Date().toISOString(),
          // Compatibility aliases
          userId: p.user_id || '',
          createdAt: p.created_at || new Date().toISOString(),
          updatedAt: p.updated_at || new Date().toISOString(),
          fullScript: p.full_script || ''
        }));
        setProjects(normalizedProjects);
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
      setSelectedSceneId(null);
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
        // Normalize the fetched data before setting state
        const normalizedScenes = (data || []).map((s: any): CanvasScene => ({
          id: s.id,
          title: s.title || '',
          script: s.script || '',
          description: s.description || '',
          project_id: s.project_id,
          scene_order: s.scene_order || 0,
          image_url: s.image_url || null,
          video_url: s.video_url || null,
          product_image_url: s.product_image_url || null,
          voice_over_url: s.voice_over_url || null,
          background_music_url: s.background_music_url || null,
          voice_over_text: s.voice_over_text || null,
          bria_v2_request_id: s.bria_v2_request_id || null,
          created_at: s.created_at || new Date().toISOString(),
          updated_at: s.updated_at || new Date().toISOString(),
          custom_instruction: s.custom_instruction || null,
          scene_image_v1_url: s.scene_image_v1_url || null,
          scene_image_v2_url: s.scene_image_v2_url || null,
          pending_generation_id: s.pending_generation_id || null,
          image_prompt: s.image_prompt || null,
          duration: s.duration || null
        }));
        setScenes(normalizedScenes);
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
      const payload = {
        project_id: selectedProjectId,
        scene_id: selectedSceneId,
        update_content: updateContent.trim(),
      };

      console.log('Invoking admin-submit-scene-update function with payload:', payload);

      const { data: functionData, error } = await supabase.functions.invoke(
        'admin-submit-scene-update',
        { body: payload }
      );

      if (error) {
        console.error('Edge function invocation error:', error);
        let detailedError = error.message;
        if (error.context && typeof error.context === 'object' && 'error' in error.context) {
            detailedError = error.context.error as string;
        }
        throw new Error(detailedError || error.message);
      }

      console.log('Edge function response:', functionData);

      toast.success('Scene update submitted successfully!');
      setSelectedSceneId(null);
      setUpdateContent('');

    } catch (error: any) {
      console.error('Error submitting scene update:', error);
      toast.error(`Failed to submit update: ${error.message || 'An unknown error occurred'}`);
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
