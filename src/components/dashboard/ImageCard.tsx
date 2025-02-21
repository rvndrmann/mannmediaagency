import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Globe, Lock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface ImageCardProps {
  image: any;
}

export const ImageCard = ({ image }: ImageCardProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

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
        variant: "destructive",
        title: "Failed to copy",
        description: "Please try again",
      });
    }
  };

  const toggleVisibility = async () => {
    try {
      setIsUpdating(true);
      const newVisibility = image.visibility === 'public' ? 'private' : 'public';
      
      const { error } = await supabase
        .from('image_generation_jobs')
        .update({ visibility: newVisibility })
        .eq('id', image.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['publicImages'] });
      
      toast({
        title: "Visibility updated",
        description: `Image is now ${newVisibility}`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to update visibility",
        description: "Please try again",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="aspect-square relative">
        {image.result_url ? (
          <img
            src={image.result_url}
            alt={image.prompt}
            className="w-full h-full object-contain bg-gray-900"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            Processing...
          </div>
        )}
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{image.status}</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleVisibility}
              disabled={isUpdating}
            >
              {image.visibility === 'public' ? (
                <Globe className="h-4 w-4 text-green-500" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
            </Button>
          </div>
          {image.product_image_metadata?.seo_title && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(image.product_image_metadata.seo_title, "Title")}
            >
              {copiedField === "Title" ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm line-clamp-2 flex-1">{image.prompt}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-0.5 flex-shrink-0"
            onClick={() => handleCopy(image.prompt, "Prompt")}
          >
            {copiedField === "Prompt" ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        {image.settings && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-gray-500">Inference Steps:</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {typeof image.settings === 'string' 
                    ? JSON.parse(image.settings).num_inference_steps || 'N/A'
                    : image.settings.num_inference_steps || 'N/A'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-shrink-0"
                  onClick={() => {
                    const settings = typeof image.settings === 'string' 
                      ? JSON.parse(image.settings)
                      : image.settings;
                    handleCopy(settings.num_inference_steps?.toString() || '', "Inference Steps")
                  }}
                >
                  {copiedField === "Inference Steps" ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-gray-500">Guidance Scale:</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {typeof image.settings === 'string'
                    ? JSON.parse(image.settings).guidance_scale || 'N/A'
                    : image.settings.guidance_scale || 'N/A'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-shrink-0"
                  onClick={() => {
                    const settings = typeof image.settings === 'string'
                      ? JSON.parse(image.settings)
                      : image.settings;
                    handleCopy(settings.guidance_scale?.toString() || '', "Guidance Scale")
                  }}
                >
                  {copiedField === "Guidance Scale" ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
        <p className="text-xs text-gray-500">
          Created: {formatDate(image.created_at)}
        </p>
      </div>
    </Card>
  );
};
