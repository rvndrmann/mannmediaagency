
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef, useEffect } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { useIsMobile } from "@/hooks/use-mobile";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShowcaseVideo {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  category: string;
  is_visible: boolean;
  story_id: number | null;
  story?: {
    "final_video_with_music": string | null;
  } | null;
}

export const VideoShowcase = () => {
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement }>({});
  const [videoErrors, setVideoErrors] = useState<{ [key: string]: boolean }>({});
  const [loadingVideos, setLoadingVideos] = useState<{ [key: string]: boolean }>({});
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  const autoplayOptions = {
    delay: 4000,
    stopOnInteraction: true,
    stopOnMouseEnter: true,
  };
  
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true },
    [Autoplay(autoplayOptions)]
  );

  const { data: videos, isLoading } = useQuery({
    queryKey: ["showcaseVideos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auth_showcase_videos")
        .select(`
          *,
          story:stories!auth_showcase_videos_story_id_fkey (
            final_video_with_music
          )
        `)
        .eq("is_visible", true)
        .order("order");
      
      if (error) throw error;
      return data as ShowcaseVideo[];
    },
  });

  useEffect(() => {
    if (videos) {
      videos.forEach((video) => {
        const videoEl = videoRefs.current[video.id];
        if (videoEl) {
          videoEl.currentTime = 2;
          videoEl.load();
        }
      });
    }
  }, [videos]);

  const handleVideoError = (videoId: string) => {
    setVideoErrors(prev => ({ ...prev, [videoId]: true }));
    setLoadingVideos(prev => ({ ...prev, [videoId]: false }));
    toast({
      title: "Video Error",
      description: "Unable to load showcase video. Please try again later.",
      variant: "destructive",
    });
  };

  const VideoCard = ({ video }: { video: ShowcaseVideo }) => (
    <div className="space-y-4">
      <div className="group relative aspect-[9/16] rounded-xl overflow-hidden hover:scale-[1.02] transition-all duration-300 cursor-pointer shadow-xl max-h-[400px]">
        {loadingVideos[video.id] && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800/50 z-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}
        
        {videoErrors[video.id] ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800">
            <AlertCircle className="h-12 w-12 text-red-500 mb-2" />
            <span className="text-sm text-gray-300">Video unavailable</span>
          </div>
        ) : (
          <video
            ref={(el) => {
              if (el) {
                videoRefs.current[video.id] = el;
              }
            }}
            className="w-full h-full object-cover"
            playsInline
            preload="auto"
            controls
            crossOrigin="anonymous"
            onLoadedMetadata={(e) => {
              const videoEl = e.currentTarget;
              videoEl.currentTime = 2;
              setLoadingVideos(prev => ({ ...prev, [video.id]: false }));
            }}
            onLoadStart={() => {
              setLoadingVideos(prev => ({ ...prev, [video.id]: true }));
              setVideoErrors(prev => ({ ...prev, [video.id]: false }));
            }}
            onError={() => handleVideoError(video.id)}
            onPlay={() => setPlayingVideoId(video.id)}
            onPause={() => setPlayingVideoId(null)}
            onEnded={() => setPlayingVideoId(null)}
            onClick={(e) => {
              const videoEl = e.currentTarget;
              if (videoEl.paused) {
                document.querySelectorAll('video').forEach(v => {
                  if (v !== videoEl) {
                    v.pause();
                    v.currentTime = 2;
                  }
                });
                videoEl.play();
              } else {
                videoEl.pause();
              }
            }}
          >
            <source 
              src={video.story?.final_video_with_music || video.video_url} 
              type="video/mp4" 
            />
            Your browser does not support the video tag.
          </video>
        )}

        <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <span className="inline-block px-3 py-1 bg-purple-600/90 text-xs font-medium text-white rounded-full">
            {video.category}
          </span>
        </div>

        {!videoErrors[video.id] && (
          <div 
            className={`absolute inset-0 flex items-center justify-center opacity-0 
              ${playingVideoId !== video.id ? 'group-hover:opacity-90' : ''} 
              transition-opacity duration-300 pointer-events-none`}
          >
            <div className="w-16 h-16 bg-purple-600/80 rounded-full flex items-center justify-center shadow-lg">
              <svg
                className="w-8 h-8 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-white text-lg font-bold line-clamp-1">
          {video.title}
        </h3>
        <p className="text-gray-400 text-sm line-clamp-2">
          {video.description}
        </p>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="space-y-4"
          >
            <div className="aspect-[9/16] bg-gray-800 rounded-xl" />
            <div className="h-4 bg-gray-800 rounded w-3/4" />
            <div className="h-3 bg-gray-800 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="flex flex-col space-y-8 px-4">
        {videos?.map((video) => (
          <div key={video.id} className="w-full">
            <VideoCard video={video} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <Carousel
        ref={emblaRef}
        opts={{
          align: "start",
          loop: true,
          dragFree: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-4 flex">
          {videos?.map((video) => (
            <CarouselItem key={video.id} className="pl-4 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/4">
              <VideoCard video={video} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="absolute -left-2 md:-left-4 lg:-left-12 bg-purple-600 hover:bg-purple-700 text-white border-none" />
        <CarouselNext className="absolute -right-2 md:-right-4 lg:-right-12 bg-purple-600 hover:bg-purple-700 text-white border-none" />
      </Carousel>
    </div>
  );
};
