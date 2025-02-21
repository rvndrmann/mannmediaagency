
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, Copy, Check, Globe, Lock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface VideoCardProps {
  video: any;
}

export const VideoCard = ({ video }: VideoCardProps) => {
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
      const newVisibility = video.visibility === 'public' ? 'private' : 'public';
      
      const { error } = await supabase
        .from('video_generation_jobs')
        .update({ visibility: newVisibility })
        .eq('id', video.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['publicVideos'] });
      
      toast({
        title: "Visibility updated",
        description: `Video is now ${newVisibility}`,
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
      <div className="relative w-full bg-gray-900 flex items-center justify-center" style={{ minHeight: "300px" }}>
        {video.result_url ? (
          <div className="w-full h-full flex items-center justify-center">
            <video
              src={video.result_url}
              controls
              playsInline
              preload="metadata"
              className="max-w-full max-h-[300px] h-auto w-auto object-contain"
            />
          </div>
        ) : (
          <div className="w-full h-full min-h-[300px] bg-gray-100 flex items-center justify-center">
            Processing...
          </div>
        )}
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{video.status}</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleVisibility}
              disabled={isUpdating}
            >
              {video.visibility === 'public' ? (
                <Globe className="h-4 w-4 text-green-500" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
            </Button>
          </div>
          {video.video_metadata?.seo_title && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(video.video_metadata.seo_title, "Title")}
            >
              {copiedField === "Title" ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        <p className="text-sm line-clamp-2">{video.prompt}</p>
        <p className="text-xs text-gray-500">
          Created: {formatDate(video.created_at)}
        </p>
      </div>
    </Card>
  );
};
