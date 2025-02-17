
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Play, Download } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ProductAdVideoGeneratorProps {
  projectId: string | null;
  onComplete: () => void;
}

export const ProductAdVideoGenerator = ({
  projectId,
  onComplete,
}: ProductAdVideoGeneratorProps) => {
  const queryClient = useQueryClient();
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

  const { data: project } = useQuery({
    queryKey: ["product-ad-project", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from("product_ad_projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: approvedShots } = useQuery({
    queryKey: ["approved-shots", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("product_ad_shots")
        .select("*")
        .eq("project_id", projectId)
        .eq("status", "approved")
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const generateVideo = useMutation({
    mutationFn: async () => {
      if (!project?.script || approvedShots?.length === 0) {
        throw new Error("Missing approved shots");
      }

      const { data, error } = await supabase.functions.invoke('generate-video-from-image', {
        body: {
          projectId,
          shots: approvedShots,
          script: project.script,
        },
      });

      if (error) throw error;

      // Update project status
      await supabase
        .from('product_ad_projects')
        .update({
          status: 'video_generated',
          settings: {
            ...project.settings,
            videoUrl: data.videoUrl,
          },
        })
        .eq('id', projectId);

      setGeneratedVideoUrl(data.videoUrl);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-ad-project"] });
      toast.success("Video generated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (!projectId || !project) {
    return (
      <div className="text-center text-gray-500 py-8">
        Please generate shots first
      </div>
    );
  }

  const handleDownload = async () => {
    if (!generatedVideoUrl) return;
    
    try {
      const response = await fetch(generatedVideoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project.title}-video.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Failed to download video");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">{project.title}</h2>
        <Button
          onClick={() => generateVideo.mutate()}
          disabled={generateVideo.isPending || !approvedShots?.length}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {generateVideo.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Video...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Generate Video
            </>
          )}
        </Button>
      </div>

      {generatedVideoUrl && (
        <div className="space-y-4">
          <video
            src={generatedVideoUrl}
            controls
            className="w-full rounded-lg"
            poster={project.product_image_url}
          />
          <Button
            onClick={handleDownload}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            <Download className="mr-2 h-4 w-4" />
            Download Video
          </Button>
        </div>
      )}

      {generateVideo.isPending && (
        <div className="space-y-2">
          <Progress value={45} />
          <p className="text-sm text-gray-400 text-center">
            Generating your video... This may take a few minutes
          </p>
        </div>
      )}
    </div>
  );
};
