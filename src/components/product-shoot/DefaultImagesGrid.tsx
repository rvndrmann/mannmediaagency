
import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Loader2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useDefaultImages } from "@/hooks/use-default-images";

interface DefaultImagesGridProps {
  onSelect?: (imageUrl: string) => void;
}

export function DefaultImagesGrid({ onSelect = () => {} }: DefaultImagesGridProps) {
  const { defaultImages, isLoading, updateLastUsed } = useDefaultImages();

  const handleSelect = async (imageUrl: string, imageId: string) => {
    // Update the last_used_at timestamp
    try {
      await updateLastUsed.mutateAsync(imageId);
      onSelect(imageUrl);
    } catch (error) {
      console.error("Error updating last used timestamp:", error);
      // Still select the image even if timestamp update fails
      onSelect(imageUrl);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!defaultImages || defaultImages.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        No default images found. Save an image as default to see it here.
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="grid grid-cols-2 gap-4 p-4">
        {defaultImages.map((image) => (
          <div key={image.id} className="relative group">
            <div className="absolute top-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-white invisible group-hover:visible">
              {image.name}
            </div>
            <div className="absolute top-2 right-2">
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
            </div>
            <img
              src={image.url}
              alt={image.name || "Default product image"}
              className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => handleSelect(image.url, image.id)}
            />
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
