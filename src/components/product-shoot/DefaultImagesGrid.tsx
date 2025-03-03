
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Loader2, X, Clock } from "lucide-react";
import { useDefaultImages, DefaultProductImage } from "@/hooks/use-default-images";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface DefaultImagesGridProps {
  onSelect: (imageUrl: string) => void;
}

export function DefaultImagesGrid({ onSelect }: DefaultImagesGridProps) {
  const { defaultImages, isLoading, updateLastUsed, deleteDefaultImage } = useDefaultImages();

  const handleSelect = (image: DefaultProductImage) => {
    // Update the last used timestamp
    updateLastUsed.mutate(image.id);
    // Select the image
    onSelect(image.url);
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
            <img
              src={image.url}
              alt={image.name || "Default product image"}
              className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => handleSelect(image)}
            />
            <div className="absolute bottom-2 left-2 right-2">
              <div className="bg-black/60 backdrop-blur-sm text-white p-1.5 rounded text-xs truncate">
                {image.name}
              </div>
            </div>
            {image.last_used_at && (
              <div className="absolute top-2 left-2">
                <Badge variant="outline" className="bg-black/50 text-white border-none text-xs flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(image.last_used_at), { addSuffix: true })}
                </Badge>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 invisible group-hover:visible"
              onClick={() => deleteDefaultImage.mutate(image.id)}
            >
              <X className="h-4 w-4 text-white" />
            </Button>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
