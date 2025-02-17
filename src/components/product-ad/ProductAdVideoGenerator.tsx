
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

interface ProductAdVideoGeneratorProps {
  projectId: string;
  onComplete: () => void;
}

interface Scene {
  description: string;
  shot_type: string;
}

interface ProjectScript {
  scenes: Scene[];
}

interface VideoJobData {
  id: string;
  status: string;
  progress: number;
  result_url: string | null;
  shot_index: number;
  project_id: string;
  aspect_ratio: string;
  content_type: string;
  created_at: string;
  duration: string;
  error_message: string;
  file_name: string;
  file_size: number;
  last_checked_at: string;
  negative_prompt: string;
  user_id: string;
}

export const ProductAdVideoGenerator = ({ projectId, onComplete }: ProductAdVideoGeneratorProps) => {
  const { data: project } = useQuery({
    queryKey: ["product-ad-project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_ad_projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: shots } = useQuery({
    queryKey: ["product-ad-shots", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_ad_shots")
        .select("*")
        .eq("project_id", projectId)
        .order("order_index");

      if (error) throw error;
      return data;
    },
  });

  const { data: videoJobs, isLoading: jobsLoading } = useQuery<VideoJobData[]>({
    queryKey: ["video-generation-jobs", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_generation_jobs")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at");

      if (error) throw error;
      return data || [];
    },
  });

  const generateVideoMutation = useMutation({
    mutationFn: async (shotIndex: number) => {
      if (!shots?.[shotIndex]) return;
      const shot = shots[shotIndex];
      const script = project?.script as unknown as ProjectScript;
      const scene = script?.scenes?.[shotIndex];
      
      if (!scene) throw new Error("Scene not found");

      const response = await supabase.functions.invoke("generate-video-from-image", {
        body: {
          image_url: shot.image_url,
          prompt: scene.description,
          duration: "5",
          aspect_ratio: "16:9",
          shot_index: shotIndex
        },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Video generation started");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to start video generation");
    },
  });

  const handleGenerateVideo = async (shotIndex: number) => {
    await generateVideoMutation.mutateAsync(shotIndex);
  };

  const handleComplete = async () => {
    try {
      const { error } = await supabase
        .from("product_ad_projects")
        .update({ 
          status: "completed",
          metadata: {
            video_urls: videoJobs?.map(job => job.result_url).filter(Boolean)
          }
        })
        .eq("id", projectId);

      if (error) throw error;
      onComplete();
    } catch (error) {
      toast.error("Failed to update project status");
    }
  };

  if (jobsLoading) {
    return (
      <Card className="p-6 bg-gray-900 border-gray-800">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
        </div>
      </Card>
    );
  }

  const allVideosCompleted = videoJobs?.every(job => job.status === 'completed');
  const hasFailedJobs = videoJobs?.some(job => job.status === 'failed');

  return (
    <Card className="p-6 bg-gray-900 border-gray-800">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Generate Scene Videos</h2>
          <p className="text-gray-400 mb-6">
            Transform your product shots into dynamic video scenes.
          </p>
        </div>

        <div className="space-y-4">
          {shots?.map((shot, index) => {
            const videoJob = videoJobs?.find(job => job.shot_index === index);
            
            return (
              <div key={index} className="p-4 bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-white font-medium mb-2">Scene {index + 1}</h3>
                    <p className="text-gray-400 text-sm mb-2">
                      Status: {videoJob?.status || 'pending'}
                    </p>
                    {videoJob && (
                      <Progress value={videoJob.progress || 0} className="mb-2" />
                    )}
                  </div>
                  
                  <div className="ml-4">
                    {videoJob ? (
                      videoJob.status === 'completed' ? (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      ) : videoJob.status === 'failed' ? (
                        <XCircle className="h-6 w-6 text-red-500" />
                      ) : (
                        <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                      )
                    ) : (
                      <Button
                        onClick={() => handleGenerateVideo(index)}
                        disabled={generateVideoMutation.isPending}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        Generate Video
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Button
          onClick={handleComplete}
          disabled={!allVideosCompleted || hasFailedJobs}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
        >
          Complete Project
        </Button>
      </div>
    </Card>
  );
};
