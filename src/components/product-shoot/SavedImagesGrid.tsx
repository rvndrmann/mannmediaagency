import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SaveAsDefaultButton } from "./SaveAsDefaultButton";

interface SavedImagesGridProps {
  onSelect: (imageUrl: string) => void;
}

export function SavedImagesGrid({ onSelect }: SavedImagesGridProps) {
  const queryClient = useQueryClient();

  const { data: savedImages, isLoading } = useQuery({
    queryKey: ["saved-product-images"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_product_images")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const deleteImage = useMutation({
    mutationFn: async (image: { storage_path: string; id: string }) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("saved_product_images")
        .remove([image.storage_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("saved_product_images")
        .delete()
        .eq("id", image.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-product-images"] });
      toast.success("Image deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete image");
    },
  });

  const refreshCachedImages = () => {
    queryClient.invalidateQueries({ queryKey: ["saved-product-images"] });
    queryClient.invalidateQueries({ queryKey: ["defaultProductImages"] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!savedImages || savedImages.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        No saved images found
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="grid grid-cols-2 gap-4 p-4">
        {savedImages.map((image) => (
          <div key={image.id} className="relative group">
            <img
              src={image.image_url}
              alt={image.original_filename || "Saved product image"}
              className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onSelect(image.image_url)}
            />
            <div className="absolute top-2 right-2 flex gap-2 invisible group-hover:visible">
              <SaveAsDefaultButton 
                imageUrl={image.image_url} 
                onSaved={refreshCachedImages}
              />
              <Button
                variant="ghost"
                size="icon"
                className="bg-black/50 hover:bg-black/70"
                onClick={() => deleteImage.mutate(image)}
              >
                <X className="h-4 w-4 text-white" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
