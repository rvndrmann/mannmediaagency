
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlayCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

type ShowcaseVideo = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  video_url: string;
  thumbnail_url: string | null;
  display_order: number;
};

export const VideoShowcase = () => {
  const [selectedVideo, setSelectedVideo] = useState<ShowcaseVideo | null>(null);

  const { data: videos, isLoading } = useQuery({
    queryKey: ["showcase-videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auth_showcase_videos")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) {
        console.error("Error fetching showcase videos:", error);
        return [];
      }

      return data as ShowcaseVideo[];
    },
  });

  if (isLoading) {
    return (
      <div className="w-full h-48 flex items-center justify-center">
        <div className="text-gray-400">Loading showcase videos...</div>
      </div>
    );
  }

  if (!videos?.length) {
    return null;
  }

  return (
    <div className="py-16">
      <h2 className="text-3xl font-bold text-white text-center mb-12">
        See What Others Have Created
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
        {videos.map((video) => (
          <Card
            key={video.id}
            className="bg-gray-800/50 border-gray-700 overflow-hidden cursor-pointer transform transition-all duration-200 hover:scale-105"
            onClick={() => setSelectedVideo(video)}
          >
            <div className="relative aspect-video">
              {video.thumbnail_url ? (
                <img
                  src={video.thumbnail_url}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-700" />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                <Button variant="ghost" className="text-white">
                  <PlayCircle className="w-12 h-12" />
                </Button>
              </div>
            </div>
            <div className="p-4">
              <h3 className="text-lg font-semibold text-white mb-2">
                {video.title}
              </h3>
              {video.description && (
                <p className="text-gray-400 text-sm line-clamp-2">
                  {video.description}
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-xl text-white">
              {selectedVideo?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedVideo && (
            <div className="aspect-video w-full">
              <video
                src={selectedVideo.video_url}
                controls
                className="w-full h-full"
                autoPlay
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}
          {selectedVideo?.description && (
            <p className="text-gray-400 mt-4">{selectedVideo.description}</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
