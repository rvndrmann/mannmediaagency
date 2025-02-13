
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw } from "lucide-react";
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  return (
    <div className="space-y-6 p-4">
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
              <div>
                <label className="text-sm font-medium text-purple-400">SEO Title</label>
                <p className="text-white/90">{metadata.seo_title}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-purple-400">SEO Description</label>
                <p className="text-white/90">{metadata.seo_description}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-purple-400">Keywords</label>
                <p className="text-white/90">{metadata.keywords}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-purple-400">Instagram Hashtags</label>
                <p className="text-white/90">{metadata.instagram_hashtags}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-purple-400">Thumbnail Prompt</label>
                <p className="text-white/90">{metadata.thumbnail_prompt}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
