
import { Sidebar } from "@/components/Sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StoriesTabContent } from "@/components/video/StoriesTabContent";
import { ImagesTabContent } from "@/components/video/ImagesTabContent";
import { VideosTabContent } from "@/components/video/VideosTabContent";

const Metadata = () => {
  const { storyId } = useParams<{ storyId?: string }>();
  const navigate = useNavigate();

  // Determine if the ID is for a story, video, or image
  const isUUID = storyId?.includes('-');
  const parsedStoryId = !isUUID && storyId ? parseInt(storyId) : undefined;

  const { data: stories, isLoading: storiesLoading } = useQuery({
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

  const { data: images, isLoading: imagesLoading } = useQuery({
    queryKey: ["product-images"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("image_generation_jobs")
        .select(`
          *,
          product_image_metadata (
            id
          )
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: videos, isLoading: videosLoading } = useQuery({
    queryKey: ["video-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_generation_jobs")
        .select(`
          *,
          video_metadata (
            id
          )
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleStorySelect = (id: number) => {
    navigate(`/metadata/${id}`);
  };

  const handleImageSelect = (id: string) => {
    navigate(`/metadata/${id}`);
  };

  const handleVideoSelect = (id: string) => {
    navigate(`/metadata/${id}`);
  };

  if (storiesLoading || imagesLoading || videosLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  // Determine initial tab based on the ID type
  let initialTab = 'stories';
  if (isUUID) {
    // Check if it's a video or image ID
    const isVideo = videos?.some(v => v.id === storyId);
    initialTab = isVideo ? 'videos' : 'images';
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
                <h1 className="text-3xl font-bold text-white">Metadata Manager</h1>
              </div>
            </div>

            <div className="px-8">
              <Tabs defaultValue={initialTab} className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="stories">Stories</TabsTrigger>
                  <TabsTrigger value="images">Product Images</TabsTrigger>
                  <TabsTrigger value="videos">Videos</TabsTrigger>
                </TabsList>

                <TabsContent value="stories">
                  <StoriesTabContent 
                    stories={stories || []}
                    selectedStoryId={parsedStoryId}
                    onStorySelect={handleStorySelect}
                  />
                </TabsContent>

                <TabsContent value="images">
                  <ImagesTabContent 
                    images={images || []}
                    selectedId={storyId}
                    onImageSelect={handleImageSelect}
                    showMetadata={isUUID && !!storyId && !videos?.some(v => v.id === storyId)}
                  />
                </TabsContent>

                <TabsContent value="videos">
                  <VideosTabContent 
                    videos={videos || []}
                    selectedId={storyId}
                    onVideoSelect={handleVideoSelect}
                    showMetadata={isUUID && !!storyId && videos?.some(v => v.id === storyId)}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Metadata;
