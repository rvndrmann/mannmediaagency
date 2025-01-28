import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, LayoutDashboard, Share2, LogOut, Film } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Sidebar as SidebarComponent, SidebarContent, SidebarHeader, SidebarFooter } from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { IntegrationPanel } from "./IntegrationPanel";

export const Sidebar = () => {
  const navigate = useNavigate();
  
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

  const availableStories = Math.floor((userCredits?.credits_remaining || 0) / 20);

  const handleDashboardClick = () => {
    console.log("Navigating to dashboard...");
    navigate("/");
  };

  const handleCreateVideoClick = () => {
    console.log("Navigating to create video...");
    navigate("/create-video");
  };

  return (
    <SidebarComponent>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="text-xl font-bold text-white">Lovable</div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <div className="space-y-2 px-4">
          <Card className="bg-gray-800 border-gray-700 p-4">
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
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
              onClick={handleCreateVideoClick}
            >
              <Film className="mr-2 h-4 w-4" /> Create Video
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