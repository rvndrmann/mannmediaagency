
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
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
import { VideoCard } from "./showcase/VideoCard";
import { LoadingSkeleton } from "./showcase/LoadingSkeleton";
import { MobileShowcase } from "./showcase/MobileShowcase";

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

  // Query to fetch videos
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

  // Mutation to store video
  const storeVideoMutation = useMutation({
    mutationFn: async (video: { url: string, type: string, storyId?: number }) => {
      const response = await fetch('/api/store-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoUrl: video.url,
          videoType: video.type,
          storyId: video.storyId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to store video');
      }

      return response.json();
    },
    onError: (error) => {
      console.error('Failed to store video:', error);
      toast({
        title: "Storage Error",
        description: "Failed to store video in our system. Using original source.",
        variant: "destructive",
      });
    },
  });

  // Effect to trigger video storage for new videos
  useEffect(() => {
    if (videos) {
      videos.forEach(async (video) => {
        const videoUrl = video.story?.final_video_with_music || video.video_url;
        
        // Check if video is already stored
        const { data: storedVideo } = await supabase
          .from('stored_videos')
          .select('*')
          .eq('original_url', videoUrl)
          .maybeSingle();

        // If not stored, trigger storage
        if (!storedVideo) {
          storeVideoMutation.mutate({
            url: videoUrl,
            type: 'showcase',
            storyId: video.story_id || undefined
          });
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
