import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LayoutDashboard, Share2, LogOut, DollarSign, User, Video } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Sidebar as SidebarComponent, SidebarContent, SidebarHeader, SidebarFooter } from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { IntegrationPanel } from "./IntegrationPanel";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";

export const Sidebar = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
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

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    },
  });

  const availableStories = Math.floor((userCredits?.credits_remaining || 0) / 10);
  const hasEnoughCredits = (userCredits?.credits_remaining || 0) >= 10;

  const handleCreateVideo = () => {
    if (!hasEnoughCredits) {
      toast({
        title: "Insufficient Credits",
        description: "You need at least 10 credits to create a video. Please purchase more credits.",
        variant: "destructive",
      });
      navigate("/plans");
      return;
    }
    navigate("/create-video");
  };

  const handleDashboardClick = () => {
    console.log("Navigating to dashboard...");
    navigate("/");
  };

  return (
    <SidebarComponent>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="text-xl font-bold text-white">Lovable</div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <div className="space-y-4 px-4">
          {/* Profile Section */}
          <Card className="bg-gray-800 border-gray-700 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">{user?.email}</div>
                <div className="text-xs text-gray-400">Free Plan</div>
              </div>
            </div>
            <div className="text-sm text-gray-400">Available Stories</div>
            <div className="text-2xl font-bold text-white">{availableStories}</div>
            <div className="text-xs text-gray-400 mt-1">
              ({userCredits?.credits_remaining || 0} credits)
            </div>
          </Card>

          <nav className="space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
              onClick={handleDashboardClick}
            >
              <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
            </Button>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800 ${
                      !hasEnoughCredits ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    onClick={handleCreateVideo}
                    disabled={!hasEnoughCredits}
                  >
                    <Video className="mr-2 h-4 w-4" /> Create Video
                  </Button>
                </div>
              </TooltipTrigger>
              {!hasEnoughCredits && (
                <TooltipContent>
                  <p>You need at least 10 credits to create a video</p>
                </TooltipContent>
              )}
            </Tooltip>

            <Button
              variant="ghost"
              className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
              onClick={() => navigate("/plans")}
            >
              <DollarSign className="mr-2 h-4 w-4" /> Plans & Billing
            </Button>
            <IntegrationPanel />
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
            >
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
          </nav>
        </div>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-4">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
            onClick={async () => {
              await supabase.auth.signOut();
            }}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </SidebarFooter>
    </SidebarComponent>
  );
};