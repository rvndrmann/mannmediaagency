import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, LayoutDashboard, Share2, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { Sidebar as SidebarComponent, SidebarContent, SidebarHeader, SidebarFooter } from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Sidebar = () => {
  const { data: userCredits } = useQuery({
    queryKey: ["userCredits"],
    queryFn: async () => {
      console.log("Fetching user credits in sidebar...");
      // Hardcoded 100 credits for testing
      return { credits_remaining: 100 };
    },
  });

  const availableVideos = Math.floor((userCredits?.credits_remaining || 0) / 20);

  return (
    <SidebarComponent>
      <SidebarContent>
        <SidebarHeader>
          <div className="flex items-center justify-between p-4">
            <h1 className="text-xl font-semibold text-white">Studio Labs AI</h1>
          </div>

          <Button
            className="bg-blue-600 hover:bg-blue-700 mb-6 w-full mx-4"
            size="lg"
          >
            <Plus className="mr-2" /> New Video
          </Button>

          <nav className="space-y-2 px-4">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
            >
              <LayoutDashboard className="mr-2" /> Dashboard
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
            >
              <Share2 className="mr-2" /> Integrations
            </Button>
          </nav>

          <Card className="mt-8 mx-4 bg-gray-800/50 border-gray-700">
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-2 text-white">Your Credits:</h3>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-3xl font-bold text-white">{userCredits?.credits_remaining || 0}</span>
                <span className="text-sm text-gray-400 mb-1">Available</span>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-gray-400">Videos left:</span>
                <span className="text-lg font-semibold text-white">{availableVideos}</span>
              </div>
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Add more
              </Button>
              <p className="text-sm text-gray-400 mt-2">
                1 video = 20 credits
              </p>
            </div>
          </Card>
        </SidebarHeader>

        <SidebarFooter>
          <div className="px-4 space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
            >
              <LogOut className="mr-2" /> Log out
            </Button>
          </div>
        </SidebarFooter>
      </SidebarContent>
    </SidebarComponent>
  );
};