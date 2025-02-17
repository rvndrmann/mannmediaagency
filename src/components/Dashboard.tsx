
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { StoryCard } from "./dashboard/StoryCard";
import { EmptyState } from "./dashboard/EmptyState";
import { AnnouncementBanner } from "./announcements/AnnouncementBanner";

export const Dashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  const { data: stories, isLoading: isLoadingStories } = useQuery({
    queryKey: ["userStories"],
    queryFn: async () => {
      console.log("Fetching stories...");
      const { data, error } = await supabase
        .from("stories")
        .select(`
          *,
          story_metadata (
            seo_title,
            instagram_hashtags
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching stories:", error);
        throw error;
      }

      const availableStories = data?.filter(story => 
        story.final_video_with_music !== null && 
        story["stories id"] !== null && 
        story["stories id"] !== undefined
      ) || [];
      
      console.log("Fetched available stories:", availableStories);
      return availableStories;
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

  const handleVideoLoad = async (story: any, duration: number) => {
    if (story["stories id"] && duration && duration !== story.video_length_seconds) {
      const { error } = await supabase
        .from("stories")
        .update({ video_length_seconds: duration })
        .eq("stories id", story["stories id"]);

      if (error) {
        console.error("Error updating video length:", error);
      }
    }
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
      <AnnouncementBanner />
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
            <StoryCard 
              key={story["stories id"]} 
              story={story}
              onVideoLoad={handleVideoLoad}
            />
          ))
        ) : (
          <EmptyState
            hasEnoughCredits={hasEnoughCredits}
            creditsRemaining={userCredits?.credits_remaining || 0}
            onCreateOrPurchase={handleCreateOrPurchase}
          />
        )}
      </div>
    </div>
  );
};
