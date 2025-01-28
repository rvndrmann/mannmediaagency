import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Video, Film } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { CreateVideoDialog } from "@/components/CreateVideoDialog";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VideoCreationBar } from "@/components/VideoCreationBar";

export const Dashboard = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

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

  // Fetch user's stories
  const { data: stories, isLoading: isLoadingStories } = useQuery({
    queryKey: ["userStories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Calculate available stories (20 credits per story)
  const availableStories = Math.floor((userCredits?.credits_remaining || 0) / 20);

  // Format date function
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

  return (
    <div className="flex-1 p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-xl md:text-2xl font-bold">Your Dashboard</h1>
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600 hidden sm:block">
          Upgrade now!
        </Button>
      </div>

      <VideoCreationBar 
        availableStories={availableStories}
        creditsRemaining={userCredits?.credits_remaining || 0}
        onCreateClick={() => setCreateDialogOpen(true)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mt-8">
        {isLoadingStories ? (
          <Card className="p-6">
            <div className="animate-pulse flex flex-col gap-4">
              <div className="h-40 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </Card>
        ) : stories && stories.length > 0 ? (
          stories.map((story) => (
            <Card key={story["stories id"]} className="overflow-hidden">
              <div className="aspect-video bg-gray-100 flex items-center justify-center">
                <div className="text-gray-400">Story #{story["stories id"]}</div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500">#{story["stories id"]}</span>
                </div>
                <p className="text-sm text-gray-500 mb-2">
                  Created at: {formatDate(story.created_at)}
                </p>
                {story.source && (
                  <p className="text-sm text-gray-500 mb-4">
                    Source: {story.source}
                  </p>
                )}
              </div>
            </Card>
          ))
        ) : (
          <Card className="col-span-2 p-8 text-center bg-gray-50">
            <div className="text-gray-500">
              No stories created yet. Click the "Create New Story" button to get started!
            </div>
          </Card>
        )}
      </div>

      <CreateVideoDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
      />

      {/* Mobile upgrade button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t sm:hidden">
        <Button className="w-full bg-orange-500 hover:bg-orange-600">
          Upgrade now!
        </Button>
      </div>
    </div>
  );
};