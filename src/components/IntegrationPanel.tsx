
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Youtube, Instagram } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";

export const IntegrationPanel = () => {
  const { data: integrations, refetch: refetchIntegrations } = useQuery({
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to connect Instagram");
      return;
    }

    if (isConnected('instagram')) {
      // Disconnect Instagram
      const { error } = await supabase
        .from('social_integrations')
        .delete()
        .eq('platform', 'instagram')
        .eq('user_id', user.id);

      if (error) {
        toast.error("Failed to disconnect Instagram");
        return;
      }

      await refetchIntegrations();
      toast.success("Instagram disconnected successfully");
      return;
    }

    // Instagram OAuth configuration
    const instagramClientId = import.meta.env.VITE_INSTAGRAM_CLIENT_ID;
    const redirectUri = `${window.location.origin}/integrations`;
    const scope = 'instagram_basic,instagram_content_publish';
    
    const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${instagramClientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`;
    
    window.location.href = authUrl;
  };

  // Handle OAuth redirect
  useEffect(() => {
    const handleInstagramCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      
      if (code) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('No user found');

          const response = await supabase.functions.invoke('instagram-auth', {
            body: { code, user_id: user.id },
          });

          if (response.error) throw new Error(response.error);

          await refetchIntegrations();
          toast.success('Instagram connected successfully!');
          
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
          console.error('Instagram auth error:', error);
          toast.error('Failed to connect Instagram');
        }
      }
    };

    handleInstagramCallback();
  }, [refetchIntegrations]);

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
