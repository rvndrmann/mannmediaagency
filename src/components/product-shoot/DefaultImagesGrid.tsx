
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Loader2, X, Clock, Zap } from "lucide-react";
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

  // Function to determine frequency level based on usage patterns
  const getFrequencyLevel = (image: DefaultProductImage) => {
    // If never used, return null (no badge)
    if (!image.last_used_at) return null;
    
    const lastUsed = new Date(image.last_used_at);
    const now = new Date();
    const daysSinceLastUse = Math.floor((now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24));
    
    // Frequency levels based on recency of use
    // Images used within the last 3 days are considered "high" frequency
    if (daysSinceLastUse <= 3) return "high";
    // Images used within the last 7 days are considered "medium" frequency
    if (daysSinceLastUse <= 7) return "medium";
    // Images used more than 7 days ago are considered "low" frequency
    return "low";
  };

  // Function to get badge props based on frequency level
  const getFrequencyBadge = (image: DefaultProductImage) => {
    const level = getFrequencyLevel(image);
    if (!level) return null;
    
    const badges = {
      high: { variant: "default" as const, className: "bg-green-600 hover:bg-green-700", text: "Frequent" },
      medium: { variant: "secondary" as const, className: "bg-blue-600 hover:bg-blue-700", text: "Regular" },
      low: { variant: "outline" as const, className: "bg-gray-600/50 text-white border-none", text: "Occasional" }
    };
    
    return badges[level];
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
        {defaultImages.map((image) => {
          const frequencyBadge = getFrequencyBadge(image);
          
          return (
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
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                {image.last_used_at && (
                  <Badge variant="outline" className="bg-black/50 text-white border-none text-xs flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(image.last_used_at), { addSuffix: true })}
                  </Badge>
                )}
                {frequencyBadge && (
                  <Badge variant={frequencyBadge.variant} className={`text-xs flex items-center gap-1 ${frequencyBadge.className}`}>
                    <Zap className="h-3 w-3" />
                    {frequencyBadge.text}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 invisible group-hover:visible"
                onClick={() => deleteDefaultImage.mutate(image.id)}
              >
                <X className="h-4 w-4 text-white" />
              </Button>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
