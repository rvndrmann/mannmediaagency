
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Youtube, Instagram } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const IntegrationPanel = () => {
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
    <Sheet>
      <SheetTrigger asChild>
        <Youtube className="mr-2 h-4 w-4" />
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] bg-gray-900 border-gray-800">
        <SheetHeader>
          <SheetTitle className="text-white">Social Media Integrations</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="p-4 rounded-lg border border-gray-800 bg-gray-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Youtube className="h-6 w-6 text-red-500" />
                <div>
                  <h3 className="text-white font-medium">YouTube</h3>
                  <p className="text-sm text-gray-400">Auto-post your videos to YouTube</p>
                </div>
              </div>
              <Button
                variant={isConnected('youtube') ? "destructive" : "secondary"}
                onClick={handleYoutubeConnect}
              >
                {isConnected('youtube') ? 'Disconnect' : 'Connect'}
              </Button>
            </div>
          </div>
          <div className="p-4 rounded-lg border border-gray-800 bg-gray-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Instagram className="h-6 w-6 text-pink-500" />
                <div>
                  <h3 className="text-white font-medium">Instagram</h3>
                  <p className="text-sm text-gray-400">Share your content on Instagram</p>
                </div>
              </div>
              <Button
                variant={isConnected('instagram') ? "destructive" : "secondary"}
                onClick={handleInstagramConnect}
              >
                {isConnected('instagram') ? 'Disconnect' : 'Connect'}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
