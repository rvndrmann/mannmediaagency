
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, Copy, Check } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface VideoCardProps {
  video: any;
}

export const VideoCard = ({ video }: VideoCardProps) => {
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);

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

  return (
    <Card className="overflow-hidden">
      <div className="aspect-video relative">
        {video.result_url ? (
          <video
            src={video.result_url}
            controls
            playsInline
            preload="metadata"
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
          <Badge variant="secondary">{video.status}</Badge>
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
