
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface VideoPlayerProps {
  videoUrl: string;
  videoJobId: string;
}

export const VideoPlayer = ({ videoUrl, videoJobId }: VideoPlayerProps) => {
  const handleDownload = async () => {
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-video-${videoJobId}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Video downloaded successfully");
    } catch (error) {
      console.error("Error downloading video:", error);
      toast.error("Failed to download video");
    }
  };

  return (
    <div className="space-y-4">
      <video 
        src={videoUrl} 
        controls 
        className="w-full rounded-lg"
      />
      <div className="flex justify-end">
        <Button
          onClick={handleDownload}
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download Video
        </Button>
      </div>
    </div>
  );
};
