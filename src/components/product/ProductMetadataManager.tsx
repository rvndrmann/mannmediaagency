
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductImageMetadata } from "./ProductImageMetadata";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface ProductMetadataManagerProps {
  imageJobId: string;
}

export const ProductMetadataManager = ({ imageJobId }: ProductMetadataManagerProps) => {
  const { data: imageJob, isLoading: imageLoading } = useQuery({
    queryKey: ["image-job", imageJobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("image_generation_jobs")
        .select("*")
        .eq("id", imageJobId)
        .single();

      if (error) throw error;
      return data;
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

  if (imageLoading) {
    return <div className="p-4">Loading image details...</div>;
  }

  if (!imageJob) {
    return <div className="p-4">Image not found</div>;
  }

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
        <h2 className="text-xl font-semibold mb-4 text-white">Image Metadata</h2>
        <ProductImageMetadata imageJobId={imageJobId} />
      </div>
    </div>
  );
};
