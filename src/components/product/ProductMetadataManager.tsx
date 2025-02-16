
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductImageMetadata } from "./ProductImageMetadata";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface ProductMetadataManagerProps {
  imageJobId: string;
}

export const ProductMetadataManager = ({ imageJobId }: ProductMetadataManagerProps) => {
  const [additionalContext, setAdditionalContext] = useState("");
  const [customTitleTwist, setCustomTitleTwist] = useState("");
  const queryClient = useQueryClient();

  const { data: userCredits } = useQuery({
    queryKey: ["userCredits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_credits")
        .select("credits_remaining")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const { data: imageJob, isLoading: imageLoading } = useQuery({
    queryKey: ["image-job", imageJobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("image_generation_jobs")
        .select("*")
        .eq("id", imageJobId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const { data: metadata, isLoading: metadataLoading } = useQuery({
    queryKey: ["product-metadata", imageJobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_image_metadata")
        .select("*")
        .eq("image_job_id", imageJobId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const generateMetadata = useMutation({
    mutationFn: async () => {
      if (!imageJob?.prompt) throw new Error("No prompt found for image");
      
      // Check if user has enough credits
      if (!userCredits || userCredits.credits_remaining < 0.20) {
        throw new Error("Insufficient credits. You need 0.20 credits to generate metadata.");
      }

      const { data, error } = await supabase.functions.invoke('generate-product-metadata', {
        body: {
          imageJobId,
          prompt: imageJob.prompt,
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
      queryClient.invalidateQueries({ queryKey: ["product-metadata", imageJobId] });
      queryClient.invalidateQueries({ queryKey: ["userCredits"] });
      toast.success("Metadata generated successfully");
    },
    onError: (error) => {
      console.error("Error generating metadata:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate metadata");
    },
  });

  const handleDownload = async () => {
    if (!imageJob?.result_url) return;
    
    try {
      const response = await fetch(imageJob.result_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-image-${imageJobId}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Image downloaded successfully");
    } catch (error) {
      console.error("Error downloading image:", error);
      toast.error("Failed to download image");
    }
  };

  if (imageLoading || metadataLoading) {
    return <div className="p-4">Loading image details...</div>;
  }

  if (!imageJob) {
    return <div className="p-4">Image not found</div>;
  }

  const remainingRegenerations = 3 - (metadata?.metadata_regeneration_count || 0);
  const canRegenerate = remainingRegenerations > 0 && (!userCredits || userCredits.credits_remaining >= 0.20);

  return (
    <div className="space-y-6">
      <div className="rounded-lg overflow-hidden bg-gray-900 p-4">
        {imageJob.result_url && (
          <div className="space-y-4">
            <img 
              src={imageJob.result_url} 
              alt="Generated product" 
              className="w-full rounded-lg"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleDownload}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Image
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
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  <CreditCard className="h-4 w-4 mr-2" />
                </>
              )}
              {metadata ? "Regenerate" : "Generate"} Metadata (0.20 credits)
              <span className="ml-2 text-sm opacity-90">
                ({remainingRegenerations} regenerations left)
              </span>
            </Button>
            {!canRegenerate && (
              <p className="text-sm text-red-400 text-center mt-2">
                {remainingRegenerations > 0 
                  ? "Insufficient credits. You need 0.20 credits to generate metadata."
                  : "You have reached the maximum number of regenerations for this metadata."}
              </p>
            )}
          </div>

          <ProductImageMetadata imageJobId={imageJobId} />
        </div>
      </div>
    </div>
  );
};
