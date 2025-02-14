
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { ShowcaseVideo } from "./types/showcase";
import { LoadingSkeleton } from "./showcase/LoadingSkeleton";
import { MobileShowcase } from "./showcase/MobileShowcase";
import { VideoCard } from "./showcase/VideoCard";

export const VideoShowcase = () => {
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
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

  const handleVideoError = (videoId: string) => {
    setVideoErrors(prev => ({ ...prev, [videoId]: true }));
    setLoadingVideos(prev => ({ ...prev, [videoId]: false }));
    toast({
      title: "Video Error",
      description: "Unable to load showcase video. Please try again later.",
      variant: "destructive",
    });
  };

  const handleVideoLoad = (videoId: string) => {
    setLoadingVideos(prev => ({ ...prev, [videoId]: false }));
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isMobile) {
    return (
      <MobileShowcase
        videos={videos || []}
        videoErrors={videoErrors}
        loadingVideos={loadingVideos}
        playingVideoId={playingVideoId}
        onVideoError={handleVideoError}
        onVideoLoad={handleVideoLoad}
        onPlayStateChange={setPlayingVideoId}
      />
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
              <VideoCard
                video={video}
                onVideoError={handleVideoError}
                onVideoLoad={handleVideoLoad}
                isLoading={loadingVideos[video.id]}
                hasError={videoErrors[video.id]}
                isPlaying={playingVideoId === video.id}
                onPlayStateChange={setPlayingVideoId}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="absolute -left-2 md:-left-4 lg:-left-12 bg-purple-600 hover:bg-purple-700 text-white border-none" />
        <CarouselNext className="absolute -right-2 md:-right-4 lg:-right-12 bg-purple-600 hover:bg-purple-700 text-white border-none" />
      </Carousel>
    </div>
  );
};
