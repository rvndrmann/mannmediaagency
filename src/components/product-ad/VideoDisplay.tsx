
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Download } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface VideoDisplayProps {
  video: {
    id: string;
    result_url: string | null;
    status: string;
    prompt: string;
    visibility?: string;
    user_id: string;
  };
}

export const VideoDisplay = ({ video }: VideoDisplayProps) => {
  const [visibility, setVisibility] = useState(video.visibility || 'private');

  const toggleVisibility = async () => {
    const newVisibility = visibility === 'public' ? 'private' : 'public';
    
    const { error } = await supabase
      .from('video_generation_jobs')
      .update({ visibility: newVisibility })
      .eq('id', video.id);

    if (error) {
      toast.error(`Failed to update visibility: ${error.message}`);
    } else {
      setVisibility(newVisibility);
      toast.success(`Video is now ${newVisibility}`);
    }
  };

  const handleDownload = async () => {
    if (!video.result_url) return;
    
    try {
      const response = await fetch(video.result_url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `video-${video.id}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      toast.error("Failed to download video");
    }
  };

  return (
    <Card className="overflow-hidden bg-gray-900 border-gray-800">
      <div className="aspect-video relative">
        <video
          src={video.result_url!}
          className="w-full h-full object-cover"
          controls
        />
        <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleVisibility}
            className="text-white hover:text-purple-400"
          >
            {visibility === 'public' ? (
              <Eye className="h-5 w-5" />
            ) : (
              <EyeOff className="h-5 w-5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            className="text-white hover:text-purple-400"
          >
            <Download className="h-5 w-5" />
          </Button>
        </div>
      </div>
      <div className="p-4">
        <p className="text-sm text-gray-300 line-clamp-2">{video.prompt}</p>
      </div>
    </Card>
  );
};
