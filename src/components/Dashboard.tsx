
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Video, DollarSign, ArrowRight } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";

export const Dashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch user credits
  const { data: userCredits } = useQuery({
    queryKey: ["userCredits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_credits")
        .select("credits_remaining")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const hasEnoughCredits = (userCredits?.credits_remaining || 0) >= 10;

  // Fetch stories with metadata
  const { data: stories, isLoading: isLoadingStories } = useQuery({
    queryKey: ["userStories"],
    queryFn: async () => {
      console.log("Fetching stories...");
      const { data, error } = await supabase
        .from("stories")
        .select(`
          *,
          story_metadata (
            seo_title
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching stories:", error);
        throw error;
      }
      console.log("Fetched stories:", data);
      return data;
    },
  });

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stories'
        },
        (payload) => {
          console.log('Real-time update received:', payload);
          queryClient.invalidateQueries({ queryKey: ["userStories"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleDownload = async (videoUrl: string) => {
    try {
      const response = await fetch(videoUrl, {
        mode: 'no-cors'  // Use no-cors mode to bypass CORS restrictions
      });
      
      // Since no-cors mode returns an opaque response, 
      // we'll fall back to direct download
      const link = document.createElement('a');
      link.href = videoUrl;
      link.setAttribute('download', `mann-media-video-${Date.now()}.mp4`);
      link.setAttribute('target', '_blank');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download Started",
        description: "Your video download has begun",
      });
    } catch (error) {
      console.error('Error downloading video:', error);
      // Even if fetch fails, try direct download as fallback
      const link = document.createElement('a');
      link.href = videoUrl;
      link.setAttribute('download', `mann-media-video-${Date.now()}.mp4`);
      link.setAttribute('target', '_blank');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download Started",
        description: "Your video download has begun",
      });
    }
  };

  const updateVideoLength = async (story: any, duration: number) => {
    if (story.video_length_seconds === null) {
      const { error } = await supabase
        .from("stories")
        .update({ video_length_seconds: Math.round(duration) })
        .eq("stories id", story["stories id"]);

      if (error) {
        console.error('Error updating video length:', error);
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleCreateOrPurchase = () => {
    if (!hasEnoughCredits) {
      toast({
        title: "Insufficient Credits",
        description: "You need at least 10 credits to create a video. Please purchase more credits.",
        variant: "destructive",
      });
      navigate("/plans");
      return;
    }
    navigate("/create-video");
  };

  return (
    <div className="flex-1 p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-xl md:text-2xl font-bold">Your Videos</h1>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 place-items-start">
        {isLoadingStories ? (
          <Card className="p-4 w-full max-w-[300px]">
            <div className="animate-pulse flex flex-col gap-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          </Card>
        ) : stories && stories.length > 0 ? (
          stories.map((story) => (
            <Card key={story["stories id"]} className="overflow-hidden w-full max-w-[300px]">
              <div className="p-2 border-b border-gray-200">
                <Badge variant="secondary" className="text-xs">
                  Story #{story["stories id"]}
                </Badge>
              </div>
              <div className="aspect-video bg-gray-100">
                {story.final_video_with_music ? (
                  <div className="flex flex-col items-center gap-1 p-2">
                    <video 
                      src={story.final_video_with_music} 
                      controls 
                      className="w-full h-full object-cover rounded"
                      onLoadedMetadata={(e) => {
                        const video = e.target as HTMLVideoElement;
                        updateVideoLength(story, video.duration);
                      }}
                    />
                    <div className="flex items-center justify-between w-full mt-1">
                      {story.video_length_seconds && (
                        <div className="flex items-center text-xs text-gray-600">
                          <Video className="w-3 h-3 mr-1" />
                          {formatDuration(story.video_length_seconds)}
                          <div className="ml-2 flex items-center text-blue-500">
                            <span className="text-xs">Click three dots to download</span>
                            <ArrowRight className="w-3 h-3 ml-1" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-gray-400 text-sm">Processing...</div>
                  </div>
                )}
              </div>
              <div className="p-2 space-y-2">
                {story.story_metadata?.seo_title && (
                  <p className="text-sm font-medium line-clamp-2">
                    {story.story_metadata.seo_title}
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  Created: {formatDate(story.created_at)}
                </p>
                <p className="text-xs text-gray-500">
                  Status: {story.ready_to_go ? "Ready" : "Processing"}
                </p>
              </div>
            </Card>
          ))
        ) : (
          <Card className="col-span-full p-6 text-center bg-gray-50 w-full max-w-md">
            <div className="flex flex-col items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100">
                {hasEnoughCredits ? (
                  <Plus className="w-6 h-6 text-purple-600" />
                ) : (
                  <DollarSign className="w-6 h-6 text-purple-600" />
                )}
              </div>
              <div className="space-y-2">
                <div className="text-gray-500">
                  {hasEnoughCredits ? (
                    "No videos created yet. Create your first video now!"
                  ) : (
                    <>
                      <p>You need at least 10 credits to create a video.</p>
                      <p className="text-sm">Current balance: {userCredits?.credits_remaining || 0} credits</p>
                    </>
                  )}
                </div>
              </div>
              <Button 
                onClick={handleCreateOrPurchase}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {hasEnoughCredits ? (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Video
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4 mr-2" />
                    Purchase Credits
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
