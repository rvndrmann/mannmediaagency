import { Button } from "@/components/ui/button";
import { Youtube, Instagram, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

const Integrations = () => {
  const navigate = useNavigate();
  
  const { data: integrations } = useQuery({
    queryKey: ["socialIntegrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_integrations")
        .select("*");
      
      if (error) throw error;
      return data;
    },
  });

  const handleYoutubeConnect = async () => {
    console.log("Connecting to Youtube...");
    toast.info("YouTube integration coming soon!");
  };

  const handleInstagramConnect = async () => {
    console.log("Connecting to Instagram...");
    toast.info("Instagram integration coming soon!");
  };

  const isConnected = (platform: string) => {
    return integrations?.some(integration => integration.platform === platform);
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <div className="fixed top-0 left-0 h-screen">
          <Sidebar />
        </div>
        <div className="flex-1 ml-64">
          <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6">
            <div className="max-w-2xl mx-auto">
              <Button
                variant="ghost"
                className="mb-6 text-gray-300 hover:text-white"
                onClick={() => navigate("/")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>

              <div className="space-y-6">
                <h1 className="text-2xl font-bold">Social Media Integrations</h1>
                <p className="text-gray-400">Connect your social media accounts to automatically share your content.</p>

                <div className="space-y-4">
                  <div className="p-6 rounded-lg border border-gray-700 bg-gray-800/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Youtube className="h-8 w-8 text-red-500" />
                        <div>
                          <h3 className="font-medium">YouTube</h3>
                          <p className="text-sm text-gray-400">Auto-post your videos to YouTube</p>
                        </div>
                      </div>
                      <Button
                        variant={isConnected('youtube') ? "destructive" : "secondary"}
                        onClick={handleYoutubeConnect}
                        className="min-w-[100px]"
                      >
                        {isConnected('youtube') ? 'Disconnect' : 'Connect'}
                      </Button>
                    </div>
                  </div>

                  <div className="p-6 rounded-lg border border-gray-700 bg-gray-800/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Instagram className="h-8 w-8 text-pink-500" />
                        <div>
                          <h3 className="font-medium">Instagram</h3>
                          <p className="text-sm text-gray-400">Share your content on Instagram</p>
                        </div>
                      </div>
                      <Button
                        variant={isConnected('instagram') ? "destructive" : "secondary"}
                        onClick={handleInstagramConnect}
                        className="min-w-[100px]"
                      >
                        {isConnected('instagram') ? 'Disconnect' : 'Connect'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Integrations;