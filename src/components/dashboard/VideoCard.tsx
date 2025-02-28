
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
    <Card className="overflow-hidden h-full flex flex-col">
      <div className="relative w-full bg-gray-900 flex items-center justify-center" style={{ minHeight: "120px" }}>
        {video.result_url ? (
          <div className="w-full h-full flex items-center justify-center">
            <video
              src={video.result_url}
              controls
              playsInline
              preload="metadata"
              className="w-full max-h-[150px] sm:max-h-[180px] md:max-h-[200px] object-contain"
            />
          </div>
        ) : (
          <div className="w-full h-full min-h-[120px] sm:min-h-[150px] bg-gray-100 flex items-center justify-center">
            <span className="text-[10px] sm:text-xs">Processing...</span>
          </div>
        )}
      </div>
      <div className="p-1 sm:p-2 space-y-0.5 sm:space-y-1 flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-0.5 sm:gap-1">
            <Badge variant="secondary" className="text-[8px] sm:text-[10px] py-0 px-0.5 sm:px-1">{video.status}</Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 sm:h-6 sm:w-6 p-0"
              onClick={toggleVisibility}
              disabled={isUpdating}
            >
              {video.visibility === 'public' ? (
                <Globe className="h-2 w-2 sm:h-3 sm:w-3 text-green-500" />
              ) : (
                <Lock className="h-2 w-2 sm:h-3 sm:w-3" />
              )}
            </Button>
          </div>
          {video.video_metadata?.seo_title && (
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 sm:h-6 sm:w-6 p-0"
              onClick={() => handleCopy(video.video_metadata.seo_title, "Title")}
            >
              {copiedField === "Title" ? (
                <Check className="h-2 w-2 sm:h-3 sm:w-3 text-green-500" />
              ) : (
                <Copy className="h-2 w-2 sm:h-3 sm:w-3" />
              )}
            </Button>
          )}
        </div>
        <div className="flex items-start justify-between gap-0.5 sm:gap-1">
          <p className="text-[10px] sm:text-xs line-clamp-1 flex-1">{video.prompt}</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 sm:h-6 sm:w-6 p-0 flex-shrink-0"
            onClick={() => handleCopy(video.prompt, "Prompt")}
          >
            {copiedField === "Prompt" ? (
              <Check className="h-2 w-2 sm:h-3 sm:w-3 text-green-500" />
            ) : (
              <Copy className="h-2 w-2 sm:h-3 sm:w-3" />
            )}
          </Button>
        </div>
        <p className="text-[8px] sm:text-[10px] text-gray-500">
          {formatDate(video.created_at)}
        </p>
      </div>
    </Card>
  );
};
