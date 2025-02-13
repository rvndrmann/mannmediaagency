
import { Sidebar } from "@/components/Sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { StoryMetadataManager } from "@/components/video/StoryMetadataManager";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Metadata = () => {
  const { storyId } = useParams<{ storyId?: string }>();
  const navigate = useNavigate();

  const { data: story, isLoading: storyLoading } = useQuery({
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

  return (
    <SidebarProvider>
      <div className="flex flex-col min-h-screen w-full bg-background">
        <div className="flex flex-1">
          <Sidebar />
          <div className="flex-1 p-8">
            <div className="max-w-4xl mx-auto">
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

              {storyId ? (
                <StoryMetadataManager storyId={parseInt(storyId)} />
              ) : (
                <div className="text-center text-white/70 py-8">
                  Please select a story to manage its metadata
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Metadata;
