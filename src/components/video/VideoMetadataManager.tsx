
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VideoPlayer } from "./VideoPlayer";
import { MetadataInputForm } from "./MetadataInputForm";
import { MetadataDisplay } from "./MetadataDisplay";
import { VideoJob, VideoMetadata, MetadataDisplay as MetadataDisplayType } from "./types";
import { useEffect } from "react";

interface VideoMetadataManagerProps {
  videoJobId: string;
}

export const VideoMetadataManager = ({ videoJobId }: VideoMetadataManagerProps) => {
  const queryClient = useQueryClient();

  const { data: videoJob, isLoading: videoLoading } = useQuery({
    queryKey: ["video-job", videoJobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_generation_jobs")
        .select("*")
        .eq("id", videoJobId)
        .maybeSingle();

      if (error) throw error;
      return data as VideoJob;
    },
  });

  const { data: metadata, isLoading: metadataLoading } = useQuery({
    queryKey: ["video-metadata", videoJobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_metadata")
        .select("*")
        .eq("video_job_id", videoJobId)
        .maybeSingle();

      if (error) throw error;
      return data as VideoMetadata;
    },
    staleTime: 0, // Always fetch fresh data
    retry: 3, // Retry failed requests 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
  });

  // Set up real-time subscription for metadata changes
  useEffect(() => {
    const channel = supabase
      .channel('video_metadata_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_metadata',
          filter: `video_job_id=eq.${videoJobId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["video-metadata", videoJobId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [videoJobId, queryClient]);

  const generateMetadata = useMutation({
    mutationFn: async (params: { additionalContext: string; customTitleTwist: string }) => {
      if (!videoJob?.prompt) throw new Error("No prompt found for video");
      
      const { data, error } = await supabase.functions.invoke('generate-video-metadata', {
        body: {
          videoJobId,
          prompt: videoJob.prompt,
          additionalContext: params.additionalContext,
          customTitleTwist: params.customTitleTwist,
        },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Failed to generate metadata");
      }

      if (!data) {
        throw new Error("No data received from metadata generation");
      }

      return data;
    },
    onSuccess: async () => {
      // Add a small delay before invalidating to ensure DB write is complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      queryClient.invalidateQueries({ queryKey: ["video-metadata", videoJobId] });
      toast.success("Metadata generated successfully");
    },
    onError: (error) => {
      console.error("Error generating metadata:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate metadata");
    },
  });

  if (videoLoading || metadataLoading) {
    return <div className="p-4">Loading video details...</div>;
  }

  if (!videoJob) {
    return <div className="p-4">Video not found</div>;
  }

  const remainingRegenerations = 3 - (metadata?.metadata_regeneration_count || 0);
  const canRegenerate = remainingRegenerations > 0;

  const metadataFields: MetadataDisplayType[] = metadata ? [
    { label: "SEO Title", value: metadata.seo_title },
    { label: "SEO Description", value: metadata.seo_description },
    { label: "Keywords", value: metadata.keywords },
    { label: "Instagram Hashtags", value: metadata.instagram_hashtags, isMultiline: true },
    { label: "Video Context", value: metadata.video_context, isMultiline: true },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="rounded-lg overflow-hidden bg-gray-900 p-4">
        {videoJob.result_url && (
          <VideoPlayer videoUrl={videoJob.result_url} videoJobId={videoJobId} />
        )}
      </div>

      <div className="bg-gray-900 rounded-lg p-6">
        <MetadataInputForm
          metadata={metadata}
          onGenerate={(additionalContext, customTitleTwist) => 
            generateMetadata.mutate({ additionalContext, customTitleTwist })
          }
          isGenerating={generateMetadata.isPending}
          canRegenerate={canRegenerate}
          remainingRegenerations={remainingRegenerations}
        />
        <MetadataDisplay fields={metadataFields} />
      </div>
    </div>
  );
};
