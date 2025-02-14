
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Image } from "lucide-react";

interface ProductImageHistoryProps {
  onSelectImage: (jobId: string, imageUrl: string) => void;
}

type ImageGenerationJob = {
  id: string;
  prompt: string;
  result_url: string | null;
  created_at: string;
  product_image_metadata: {
    seo_title: string | null;
    instagram_hashtags: string | null;
  } | null;
};

export function ProductImageHistory({ onSelectImage }: ProductImageHistoryProps) {
  const { data: generationHistory, isLoading } = useQuery({
    queryKey: ["product-image-history"],
    queryFn: async () => {
      // First get all image generation jobs
      const { data: jobs, error } = await supabase
        .from("image_generation_jobs")
        .select(`
          id,
          prompt,
          result_url,
          created_at,
          product_image_metadata (
            seo_title,
            instagram_hashtags
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching image jobs:", error);
        throw error;
      }

      return (jobs || []) as ImageGenerationJob[];
    },
  });

  if (isLoading) {
    return <div>Loading history...</div>;
  }

  return (
    <ScrollArea className="h-[600px] pr-4">
      <div className="space-y-4">
        {generationHistory?.map((job) => (
          <div
            key={job.id}
            className="border border-gray-800 rounded-lg p-4 space-y-3 hover:border-gray-700 transition-colors"
          >
            <div className="aspect-square relative bg-gray-900 rounded-md overflow-hidden">
              {job.result_url ? (
                <img
                  src={job.result_url}
                  alt={job.product_image_metadata?.seo_title || "Generated product image"}
                  className="object-cover w-full h-full"
                  onClick={() => onSelectImage(job.id, job.result_url)}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Image className="w-8 h-8 text-gray-600" />
                </div>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium truncate">
                {job.product_image_metadata?.seo_title || "Untitled"}
              </p>
              <p className="text-xs text-gray-400 truncate">{job.prompt}</p>
            </div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => job.result_url && onSelectImage(job.id, job.result_url)}
            >
              View Details
            </Button>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
