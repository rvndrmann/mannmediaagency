
import { Sidebar } from "@/components/Sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { StoryMetadataManager } from "@/components/video/StoryMetadataManager";
import { ProductMetadataManager } from "@/components/product/ProductMetadataManager";
import { VideoMetadataManager } from "@/components/video/VideoMetadataManager";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StoriesList } from "@/components/video/StoriesList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  const { data: selectedStory } = useQuery({
    queryKey: ["story", parsedStoryId],
    queryFn: async () => {
      if (!parsedStoryId) throw new Error("Invalid story ID");
      
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .eq("stories id", parsedStoryId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!parsedStoryId && !isUUID,
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

                <TabsContent value="stories" className="flex gap-6">
                  <div className="w-1/3">
                    <StoriesList 
                      stories={stories || []}
                      selectedStoryId={parsedStoryId}
                      onStorySelect={handleStorySelect}
                    />
                  </div>
                  <div className="flex-1">
                    {parsedStoryId ? (
                      <StoryMetadataManager storyId={parsedStoryId} />
                    ) : (
                      <div className="text-center text-white/70 py-8 bg-gray-800/50 rounded-lg">
                        Select a story from the list to manage its metadata
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="images" className="flex gap-6">
                  <div className="w-1/3">
                    <div className="space-y-4">
                      {images?.map((image) => (
                        <div
                          key={image.id}
                          className={`p-4 rounded-lg cursor-pointer transition-colors ${
                            image.id === storyId
                              ? "bg-purple-600"
                              : "bg-gray-800 hover:bg-gray-700"
                          }`}
                          onClick={() => handleImageSelect(image.id)}
                        >
                          <img
                            src={image.result_url}
                            alt={image.prompt}
                            className="w-full h-32 object-cover rounded-md mb-2"
                          />
                          <p className="text-sm text-white/90 line-clamp-2">
                            {image.prompt}
                          </p>
                          <p className="text-xs text-white/60 mt-1">
                            {new Date(image.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1">
                    {isUUID && storyId && !videos?.some(v => v.id === storyId) ? (
                      <ProductMetadataManager imageJobId={storyId} />
                    ) : (
                      <div className="text-center text-white/70 py-8 bg-gray-800/50 rounded-lg">
                        Select an image from the list to manage its metadata
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="videos" className="flex gap-6">
                  <div className="w-1/3">
                    <div className="space-y-4">
                      {videos?.map((video) => (
                        <div
                          key={video.id}
                          className={`p-4 rounded-lg cursor-pointer transition-colors ${
                            video.id === storyId
                              ? "bg-purple-600"
                              : "bg-gray-800 hover:bg-gray-700"
                          }`}
                          onClick={() => handleVideoSelect(video.id)}
                        >
                          {video.result_url && (
                            <video
                              src={video.result_url}
                              className="w-full h-32 object-cover rounded-md mb-2"
                            />
                          )}
                          <p className="text-sm text-white/90 line-clamp-2">
                            {video.prompt}
                          </p>
                          <p className="text-xs text-white/60 mt-1">
                            {new Date(video.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1">
                    {isUUID && storyId && videos?.some(v => v.id === storyId) ? (
                      <VideoMetadataManager videoJobId={storyId} />
                    ) : (
                      <div className="text-center text-white/70 py-8 bg-gray-800/50 rounded-lg">
                        Select a video from the list to manage its metadata
                      </div>
                    )}
                  </div>
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
