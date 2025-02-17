
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

  const { data: videoJobs, isLoading: jobsLoading } = useQuery({
    queryKey: ["video-generation-jobs", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_generation_jobs")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at");

      if (error) throw error;
      return data;
    },
  });

  const generateVideoMutation = useMutation({
    mutationFn: async (shotIndex: number) => {
      const shot = shots[shotIndex];
      const scene = project.script.scenes[shotIndex];
      
      const response = await supabase.functions.invoke("generate-video-from-image", {
        body: {
          image_url: shot.image_url,
          prompt: scene.description,
          duration: "5",
          aspect_ratio: "16:9"
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    onSuccess: () => {
      toast.success("Video generation started");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to start video generation");
    },
  });

  const allVideosCompleted = videoJobs?.every(job => job.status === 'completed');
  const hasFailedJobs = videoJobs?.some(job => job.status === 'failed');
  const totalProgress = videoJobs?.reduce((acc, job) => acc + (job.progress || 0), 0) / (videoJobs?.length || 1);

  const getStatusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === 'failed') return <XCircle className="h-4 w-4 text-red-500" />;
    return <Loader2 className="h-4 w-4 animate-spin text-purple-500" />;
  };

  const handleGenerateVideo = async (shotIndex: number) => {
    if (!shots?.[shotIndex]) return;
    await generateVideoMutation.mutateAsync(shotIndex);
  };

  const handleComplete = async () => {
    const { error } = await supabase
      .from("product_ad_projects")
      .update({ 
        status: 'completed',
        // Add video URLs to metadata
        metadata: {
          video_urls: videoJobs?.map(job => job.result_url).filter(Boolean)
        }
      })
      .eq("id", projectId);

    if (error) {
      toast.error("Failed to update project status");
      return;
    }

    onComplete();
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
            const videoJob = videoJobs