import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export const Dashboard = () => {
  const navigate = useNavigate();

  // Fetch user's stories
  const { data: stories, isLoading: isLoadingStories } = useQuery({
    queryKey: ["userStories"],
    queryFn: async () => {
      console.log("Fetching user stories...");
      const { data: session } = await supabase.auth.getSession();
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .eq('user_id', session.session?.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching stories:", error);
        throw error;
      }
      console.log("Fetched stories:", data);
      return data;
    },
  });

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
          <h1 className="text-xl md:text-2xl font-bold">Your Videos</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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
                {story.final_video_with_music ? (
                  <div className="flex flex-col items-center gap-2">
                    <video 
                      src={story.final_video_with_music} 
                      controls 
                      className="w-full h-full object-cover"
                    />
                    <Button variant="outline" className="mt-2">
                      Download Video
                    </Button>
                  </div>
                ) : (
                  <div className="text-gray-400">Processing...</div>
                )}
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-500 mb-2">
                  Created: {formatDate(story.created_at)}
                </p>
                <p className="text-sm text-gray-500">
                  Status: {story.ready_to_go ? "Ready" : "Processing"}
                </p>
              </div>
            </Card>
          ))
        ) : (
          <Card className="col-span-full p-8 text-center bg-gray-50">
            <div className="flex flex-col items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100">
                <Plus className="w-6 h-6 text-purple-600" />
              </div>
              <div className="text-gray-500">
                No videos created yet. Create your first video now!
              </div>
              <Button 
                onClick={() => navigate("/create-video")}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Video
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};