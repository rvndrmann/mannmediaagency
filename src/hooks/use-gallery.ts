
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useGallery = (session: boolean) => {
  const { data: images, isLoading: imagesLoading } = useQuery({
    queryKey: ["product-images"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("image_generation_jobs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: session,
    refetchInterval: 5000,
  });

  const handleDownload = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `product-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      toast.error("Failed to download image");
    }
  };

  return {
    images,
    imagesLoading,
    handleDownload,
  };
};
