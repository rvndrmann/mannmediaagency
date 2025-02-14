
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlayCircle, PauseCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";

type ShowcaseVideo = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  video_path: string;
  thumbnail_path: string | null;
  display_order: number;
};

export const VideoShowcase = () => {
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement }>({});

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

  const getStorageUrl = (path: string) => {
    if (path.startsWith('http')) {
      return path;
    }
    const { data } = supabase.storage.from("showcase-videos").getPublicUrl(path);
    return data.publicUrl;
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320; // Width of one card + gap
      const newScrollLeft =
        scrollContainerRef.current.scrollLeft +
        (direction === "right" ? scrollAmount : -scrollAmount);
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: "smooth",
      });
    }
  };

  const handleVideoClick = (videoId: string) => {
    if (playingVideoId === videoId) {
      // Pause current video
      const video = videoRefs.current[videoId];
      if (video) {
        video.pause();
      }
      setPlayingVideoId(null);
    } else {
      // Pause previous video if any
      if (playingVideoId && videoRefs.current[playingVideoId]) {
        videoRefs.current[playingVideoId].pause();
      }
      // Play new video
      const video = videoRefs.current[videoId];
      if (video) {
        video.play();
      }
      setPlayingVideoId(videoId);
    }
  };

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
    <div className="py-16 px-4">
      <h2 className="text-3xl font-bold text-white text-center mb-12">
        See What Others Have Created
      </h2>
      
      <div className="relative max-w-[1400px] mx-auto">
        {/* Navigation Buttons */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 text-white bg-black/50 hover:bg-black/70"
          onClick={() => scroll("left")}
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 text-white bg-black/50 hover:bg-black/70"
          onClick={() => scroll("right")}
        >
          <ChevronRight className="h-8 w-8" />
        </Button>

        {/* Scrollable Container */}
        <div 
          ref={scrollContainerRef}
          className="flex gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {videos.map((video) => (
            <Card
              key={video.id}
              className="flex-none w-[300px] snap-center bg-gray-800/50 border-gray-700 overflow-hidden cursor-pointer transform transition-all duration-200 hover:scale-105"
            >
              <div className="relative aspect-[9/16]">
                {/* Thumbnail Image (shown when video is not playing) */}
                {(!playingVideoId || playingVideoId !== video.id) && video.thumbnail_path && (
                  <img
                    src={getStorageUrl(video.thumbnail_path)}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                )}
                
                {/* Video Element */}
                <video
                  ref={(el) => {
                    if (el) videoRefs.current[video.id] = el;
                  }}
                  src={getStorageUrl(video.video_path)}
                  className={`absolute inset-0 w-full h-full object-cover ${
                    playingVideoId === video.id ? 'opacity-100' : 'opacity-0'
                  }`}
                  playsInline
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVideoClick(video.id);
                  }}
                />

                {/* Overlay with controls and info */}
                <div className="absolute inset-0 flex flex-col justify-between p-4 bg-gradient-to-b from-black/60 via-transparent to-black/60">
                  <div>
                    {video.category && (
                      <Badge variant="secondary" className="mb-2">
                        {video.category}
                      </Badge>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {video.title}
                    </h3>
                    {video.description && (
                      <p className="text-sm text-gray-200 line-clamp-2">
                        {video.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Play/Pause Button Overlay */}
                <div 
                  className="absolute inset-0 flex items-center justify-center hover:bg-black/30 transition-colors"
                  onClick={() => handleVideoClick(video.id)}
                >
                  <Button 
                    variant="ghost" 
                    className="text-white opacity-0 hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVideoClick(video.id);
                    }}
                  >
                    {playingVideoId === video.id ? (
                      <PauseCircle className="w-12 h-12" />
                    ) : (
                      <PlayCircle className="w-12 h-12" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
