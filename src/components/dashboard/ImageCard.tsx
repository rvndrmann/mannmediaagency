
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Check } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { ImageGenerationJob } from "@/types/supabase";

interface ImageCardProps {
  image: ImageGenerationJob & {
    visibility?: 'public' | 'private';
    product_image_metadata?: {
      seo_title: string | null;
    } | null;
  };
}

export const ImageCard = ({ image }: ImageCardProps) => {
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(image.visibility === 'public');

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast({
        title: "Copied!",
        description: `${field} copied to clipboard`,
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const toggleVisibility = async () => {
    const newVisibility = !isPublic ? 'public' : 'private';
    
    const { error } = await supabase
      .from('image_generation_jobs')
      .update({ visibility: newVisibility })
      .eq('id', image.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update visibility",
        variant: "destructive",
      });
    } else {
      setIsPublic(!isPublic);
      toast({
        title: "Success",
        description: `Image is now ${newVisibility}`,
      });
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="aspect-square relative">
        {image.result_url ? (
          <img
            src={image.result_url}
            alt={image.prompt}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            Processing...
          </div>
        )}
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <Badge variant="secondary">{image.status}</Badge>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Public</span>
            <Switch
              checked={isPublic}
              onCheckedChange={toggleVisibility}
            />
          </div>
          {image.product_image_metadata?.seo_title && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(image.product_image_metadata.seo_title!, "Title")}
            >
              {copiedField === "Title" ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        <p className="text-sm line-clamp-2">{image.prompt}</p>
        <p className="text-xs text-gray-500">
          Created: {formatDate(image.created_at)}
        </p>
      </div>
    </Card>
  );
};
