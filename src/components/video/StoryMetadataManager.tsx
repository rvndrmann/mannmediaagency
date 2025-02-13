
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface StoryMetadataManagerProps {
  storyId: number;
}

interface StoryMetadata {
  seo_title: string;
  seo_description: string;
  keywords: string;
  instagram_hashtags: string;
  thumbnail_prompt: string;
  additional_context?: string;
  custom_title_twist?: string;
}

export const StoryMetadataManager = ({ storyId }: StoryMetadataManagerProps) => {
  const [additionalContext, setAdditionalContext] = useState("");
  const [customTitleTwist, setCustomTitleTwist] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: story } = useQuery({
    queryKey: ["story", storyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("final_video_with_music")
        .eq("stories id", storyId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const handleCopy = async (text: string, fieldName: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast({
      title: "Copied",
      description: "Text copied to clipboard",
    });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const { data: metadata, isLoading } = useQuery({
    queryKey: ["storyMetadata", storyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("story_metadata")
        .select("*")
        .eq("story_id", storyId)
        .maybeSingle();

      if (error) throw error;
      return data as StoryMetadata | null;
    },
  });

  const generateMetadata = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-story-metadata", {
        body: {
          storyId,
          additionalContext,
          customTitleTwist,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storyMetadata", storyId] });
      toast({
        title: "Success",
        description: "Story metadata generated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
      </div>
    );
  }

  const MetadataField = ({ label, value }: { label: string; value: string }) => (
    <div className="space-y-1">
      <label className="text-sm font-medium text-purple-400">{label}</label>
      <div className="flex items-start gap-2">
        <p className="flex-1 text-white/90 bg-[#333333] p-2 rounded">{value}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleCopy(value, label)}
          className="shrink-0 h-8 w-8 p-0 hover:bg-white/10"
        >
          {copiedField === label ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 text-white/70" />
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 p-4">
      {/* Video Player Section */}
      {story?.final_video_with_music && (
        <div className="rounded-lg overflow-hidden bg-[#222222] aspect-[9/16] max-h-[400px]">
          <video
            src={story.final_video_with_music}
            controls
            className="w-full h-full object-contain"
            playsInline
          >
            Your browser does not support the video tag.
          </video>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium text-white/90">
          Additional Context
        </label>
        <Textarea
          value={additionalContext}
          onChange={(e) => setAdditionalContext(e.target.value)}
          placeholder="Add any additional context for SEO generation..."
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

      <Button
        onClick={() => generateMetadata.mutate()}
        disabled={generateMetadata.isPending}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
      >
        {generateMetadata.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <RefreshCw className="h-4 w-4 mr-2" />
        )}
        {metadata ? "Regenerate Metadata" : "Generate Metadata"}
      </Button>

      {metadata && (
        <div className="space-y-4 mt-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white/90">Generated Metadata</h3>
            
            <div className="space-y-4 bg-[#222222] p-4 rounded-lg">
              <MetadataField label="SEO Title" value={metadata.seo_title} />
              <MetadataField label="SEO Description" value={metadata.seo_description} />
              <MetadataField label="Keywords" value={metadata.keywords} />
              <MetadataField label="Instagram Hashtags" value={metadata.instagram_hashtags} />
              <MetadataField label="Thumbnail Prompt" value={metadata.thumbnail_prompt} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
