
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/integrations/supabase/client";
import { VideoTemplate } from "@/types/custom-order";
import { useUser } from "@/hooks/use-user";
import { Loader2, CreditCard, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function VideoTemplates() {
  const [templates, setTemplates] = useState<VideoTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, userCredits } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTemplates = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("video_templates")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setTemplates(data || []);
      } catch (error) {
        console.error("Error fetching templates:", error);
        toast.error("Failed to load video templates");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const handleCreateVideo = () => {
    navigate("/product-shoot");
  };

  return (
    <Layout>
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6">
              <h1 className="text-3xl font-bold">Video Templates</h1>
              <p className="text-gray-400 mt-2">
                Create amazing videos using these pre-designed templates. First upload or create 
                a product image, then select a template to generate your video.
              </p>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg mb-6">
              <h2 className="text-xl font-semibold mb-4">How it works</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="flex justify-center items-center h-12 w-12 rounded-full bg-purple-600 mb-4">1</div>
                  <h3 className="font-semibold mb-2">Create or upload an image</h3>
                  <p className="text-sm text-gray-300">
                    Use our product shoot tool to create a professional image or upload your own.
                  </p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="flex justify-center items-center h-12 w-12 rounded-full bg-purple-600 mb-4">2</div>
                  <h3 className="font-semibold mb-2">Select a template</h3>
                  <p className="text-sm text-gray-300">
                    Choose from our library of video templates with different styles and effects.
                  </p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="flex justify-center items-center h-12 w-12 rounded-full bg-purple-600 mb-4">3</div>
                  <h3 className="font-semibold mb-2">Generate your video</h3>
                  <p className="text-sm text-gray-300">
                    Our AI will create a professional video based on your image and the selected template.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <Button 
                  size="lg" 
                  onClick={handleCreateVideo}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Video className="mr-2 h-5 w-5" />
                  Start Creating Videos
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
              </div>
            ) : (
              <div>
                <h2 className="text-2xl font-semibold mb-4">Available Templates</h2>
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="mb-6">
                    <TabsTrigger value="all">All Templates</TabsTrigger>
                    <TabsTrigger value="portrait">Portrait</TabsTrigger>
                    <TabsTrigger value="landscape">Landscape</TabsTrigger>
                    <TabsTrigger value="square">Square</TabsTrigger>
                  </TabsList>

                  <TabsContent value="all" className="mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {templates.map((template) => (
                        <TemplateCard 
                          key={template.id} 
                          template={template} 
                          userCredits={userCredits?.credits_remaining || 0}
                          onSelectTemplate={() => navigate("/product-shoot")}
                        />
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="portrait" className="mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {templates
                        .filter(t => t.aspect_ratio === "9:16")
                        .map((template) => (
                          <TemplateCard 
                            key={template.id} 
                            template={template} 
                            userCredits={userCredits?.credits_remaining || 0}
                            onSelectTemplate={() => navigate("/product-shoot")}
                          />
                        ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="landscape" className="mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {templates
                        .filter(t => t.aspect_ratio === "16:9")
                        .map((template) => (
                          <TemplateCard 
                            key={template.id} 
                            template={template} 
                            userCredits={userCredits?.credits_remaining || 0}
                            onSelectTemplate={() => navigate("/product-shoot")}
                          />
                        ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="square" className="mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {templates
                        .filter(t => t.aspect_ratio === "1:1")
                        .map((template) => (
                          <TemplateCard 
                            key={template.id} 
                            template={template} 
                            userCredits={userCredits?.credits_remaining || 0}
                            onSelectTemplate={() => navigate("/product-shoot")}
                          />
                        ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </main>
      </div>
    </Layout>
  );
}

interface TemplateCardProps {
  template: VideoTemplate;
  userCredits: number;
  onSelectTemplate: () => void;
}

function TemplateCard({ template, userCredits, onSelectTemplate }: TemplateCardProps) {
  const hasEnoughCredits = userCredits >= template.credits_cost;
  
  return (
    <div className="rounded-lg overflow-hidden border border-gray-700 bg-black/30 flex flex-col h-full">
      <div className="aspect-video relative overflow-hidden">
        <img 
          src={template.thumbnail_url} 
          alt={template.name} 
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {template.aspect_ratio}
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-white">{template.name}</h3>
        <p className="text-sm text-gray-400 mt-1 mb-4 flex-1">{template.description}</p>
        <div className="flex justify-between items-center mt-auto">
          <div className="flex items-center text-purple-400 text-sm">
            <CreditCard className="h-4 w-4 mr-1" />
            <span>{template.credits_cost} credits</span>
          </div>
          <Button 
            size="sm" 
            onClick={onSelectTemplate}
            disabled={!hasEnoughCredits}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Video className="h-4 w-4 mr-1" />
            Use Template
          </Button>
        </div>
      </div>
    </div>
  );
}
