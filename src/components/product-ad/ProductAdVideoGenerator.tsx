
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VideoDisplay } from "./VideoDisplay";
import { toast } from "sonner";

interface VideoJobData {
  id: string;
  status: string;
  result_url: string | null;
  created_at: string;
  project_id: string;
  user_id: string;
  prompt: string;
  error_message: string | null;
}

export const ProductAdVideoGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: videos, isLoading } = useQuery({
    queryKey: ["videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_generation_jobs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Failed to fetch videos");
        throw error;
      }

      return data as VideoJobData[];
    }
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {videos && videos.map((video) => (
        <VideoDisplay key={video.id} video={video} />
      ))}
      {!videos?.length && (
        <div className="text-center text-gray-500">No videos generated yet</div>
      )}
    </div>
  );
};
