
import { Sidebar } from "@/components/Sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { StoryMetadataManager } from "@/components/video/StoryMetadataManager";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StoriesList } from "@/components/video/StoriesList";

const Metadata = () => {
  const { storyId } = useParams<{ storyId?: string }>();
  const navigate = useNavigate();

  const { data: stories, isLoading } = useQuery({
    queryKey: ["stories-without-metadata"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select(`
          *,
          story_metadata (
            id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: selectedStory, isLoading: storyLoading } = useQuery({
    queryKey: ["story", storyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .eq("stories id", parseInt(storyId || "0"))
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!storyId,
  });

  const handleStorySelect = (id: number) => {
    navigate(`/metadata/${id}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex flex-col min-h-screen w-full bg-background">
        <div className="flex flex-1">
          <Sidebar />
          <div className="flex-1">
            <div className="p-8">
              <div className="flex items-center mb-8">
                <Button 
                  variant="ghost" 
                  onClick={() => navigate("/")}
                  className="mr-4 text-white hover:bg-white/10"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <h1 className="text-3xl font-bold text-white">Story Metadata Manager</h1>
              </div>
            </div>

            <div className="flex gap-6 px-8">
              {/* Left panel: Stories list */}
              <div className="w-1/3">
                <StoriesList 
                  stories={stories || []}
                  selectedStoryId={storyId ? parseInt(storyId) : undefined}
                  onStorySelect={handleStorySelect}
                />
              </div>

              {/* Right panel: Metadata manager */}
              <div className="flex-1">
                {storyId ? (
                  <StoryMetadataManager storyId={parseInt(storyId)} />
                ) : (
                  <div className="text-center text-white/70 py-8 bg-gray-800/50 rounded-lg">
                    Select a story from the list to manage its metadata
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Metadata;
