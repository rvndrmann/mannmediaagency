
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface VideoMetadataManagerProps {
  videoJobId: string;
}

interface MetadataDisplay {
  label: string;
  value: string | null;
  isMultiline?: boolean;
}

export const VideoMetadataManager = ({ videoJobId }: VideoMetadataManagerProps) => {
  const [additionalContext, setAdditionalContext] = useState("");
  const [customTitleTwist, setCustomTitleTwist] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
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
      return data;
    },
  });

  // Update the metadata query to include force refresh
  const { data: metadata, isLoading: metadataLoading } = useQuery({
    queryKey: ["video-metadata", videoJobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_metadata")
        .select("*")
        .eq("video_job_id", videoJobId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const handleCopy = async (text: string | null, fieldName: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const generateMetadata = useMutation({
    mutationFn: async () => {
      if (!videoJob?.prompt) throw new Error("No prompt found for video");
      
      const { data, error } = await supabase.functions.invoke('generate-video-metadata', {
        body: {
          videoJobId,
          prompt: videoJob.prompt,
          additionalContext,
          customTitleTwist,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["video-metadata", videoJobId] });
      toast.success("Metadata generated successfully");
    },
    onError: (error) => {
      console.error("Error generating metadata:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate metadata");
    },
  });

  const handleDownload = async () => {
    if (!videoJob?.result_url) return;
    
    try {
      const response = await fetch(videoJob.result_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-video-${videoJobId}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Video downloaded successfully");
    } catch (error) {
      console.error("Error downloading video:", error);
      toast.error("Failed to download video");
    }
  };

  if (videoLoading || metadataLoading) {
    return <div className="p-4">Loading video details...</div>;
  }

  if (!videoJob) {
    return <div className="p-4">Video not found</div>;
  }

  const remainingRegenerations = 3 - (metadata?.metadata_regeneration_count || 0);
  const canRegenerate = remainingRegenerations > 0;

  const metadataFields: MetadataDisplay[] = metadata ? [
    { label: "SEO Title", value: metadata.seo_title },
    { label: "SEO Description", value: metadata.seo_description },
    { label: "Keywords", value: metadata.keywords },
    { label: "Instagram Hashtags", value: metadata.instagram_hashtags, isMultiline: true },
    { label: "Video Context", value: metadata.video_context, isMultiline: true },
  ] : [];

  const MetadataField = ({ label, value, isMultiline }: MetadataDisplay) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-purple-400">{label}</label>
        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCopy(value, label)}
            className="h-8 w-8 p-0 hover:bg-white/10"
          >
            {copiedField === label ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4 text-white/70" />
            )}
          </Button>
        )}
      </div>
      <div className="flex-1 text-white/90 bg-[#333333] p-2 rounded">
        {isMultiline ? (
          <div className="whitespace-pre-wrap">{value}</div>
        ) : (
          <div className="line-clamp-1">{value}</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-lg overflow-hidden bg-gray-900 p-4">
        {videoJob.result_url && (
          <div className="space-y-4">
            <video 
              src={videoJob.result_url} 
              controls 
              className="w-full rounded-lg"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleDownload}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Video
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-900 rounded-lg p-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/90">
              Additional Context
            </label>
            <Textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="Add any additional context for metadata generation..."
              className="bg-[#333333] border-white/10 text-white placeholder:text-white/50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/90">
              Custom Title Twist
            </label>
            <Input
              value={customTitleTwist}
              onChange={(e) => setCustomTitleTwist(e.target.value)}
              placeholder="Add your custom twist for the title..."
              className="bg-[#333333] border-white/10 text-white placeholder:text-white/50"
            />
          </div>

          <div className="space-y-2">
            <Button
              onClick={() => generateMetadata.mutate()}
              disabled={generateMetadata.isPending || !canRegenerate}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-600"
            >
              {generateMetadata.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {metadata ? "Regenerate" : "Generate"} Metadata
              <span className="ml-2 text-sm opacity-90">
                ({remainingRegenerations} regenerations left)
              </span>
            </Button>
            {!canRegenerate && (
              <p className="text-sm text-red-400 text-center mt-2">
                You have reached the maximum number of regenerations for this metadata.
              </p>
            )}
          </div>

          {metadata && (
            <div className="space-y-4 mt-6">
              <h3 className="text-lg font-semibold text-white/90">Generated Metadata</h3>
              <div className="space-y-4 bg-[#222222] p-4 rounded-lg">
                {metadataFields.map((field) => (
                  <MetadataField
                    key={field.label}
                    label={field.label}
                    value={field.value}
                    isMultiline={field.isMultiline}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
