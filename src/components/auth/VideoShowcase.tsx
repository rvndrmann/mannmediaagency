
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

interface ShowcaseVideo {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  category: string;
  is_visible: boolean;
}

export const VideoShowcase = () => {
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement }>({});
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
        .select("*")
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

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((i) => (
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

  return (
    <div className="relative w-full px-4 md:px-8 lg:px-12">
      <Carousel
        ref={emblaRef}
        opts={{
          align: "start",
          loop: true,
          dragFree: true,
          slidesToScroll: 1,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
          {videos?.map((video) => (
            <CarouselItem key={video.id} className="pl-4 basis-full sm:basis-1/3 lg:basis-1/6">
              <div className="space-y-4">
                <div className="group relative aspect-[9/16] rounded-xl overflow-hidden hover:scale-[1.02] transition-all duration-300 cursor-pointer shadow-xl">
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
                    onLoadedMetadata={(e) => {
                      const videoEl = e.currentTarget;
                      videoEl.currentTime = 2;
                    }}
                    onLoadedData={(e) => {
                      const videoEl = e.currentTarget;
                      videoEl.currentTime = 2;
                    }}
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
                    <source src={video.video_url} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>

                  <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <span className="inline-block px-3 py-1 bg-purple-600/90 text-xs font-medium text-white rounded-full">
                      {video.category}
                    </span>
                  </div>

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
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="absolute -left-2 md:-left-4 lg:-left-12 bg-purple-600 hover:bg-purple-700 text-white border-none" />
        <CarouselNext className="absolute -right-2 md:-right-4 lg:-right-12 bg-purple-600 hover:bg-purple-700 text-white border-none" />
      </Carousel>
    </div>
  );
};
