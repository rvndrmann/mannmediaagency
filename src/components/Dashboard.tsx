import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Check, Menu } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { CreateVideoDialog } from "@/components/CreateVideoDialog";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Dashboard = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Fetch user credits
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

  // Calculate available videos (20 credits per video)
  const availableVideos = Math.floor((userCredits?.credits_remaining || 0) / 20);

  return (
    <div className="flex-1 p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-xl md:text-2xl font-bold">Your Dashboard</h1>
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600 hidden sm:block">
          Upgrade now!
        </Button>
      </div>

      <div className="text-gray-600 mb-8 flex items-center gap-2">
        {availableVideos} Videos Left ({userCredits?.credits_remaining || 0} credits)
        <span className="text-gray-400 cursor-help" title="1 video requires 20 credits">
          ⓘ
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <Card 
          className="border-dashed border-2 border-blue-300 p-6 md:p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="w-8 h-8 md:w-12 md:h-12 text-blue-500 mb-4" />
          <h3 className="text-blue-500 font-medium">Create New Video</h3>
          <p className="text-sm text-gray-500 mt-2">
            {userCredits?.credits_remaining || 0} credits remaining
          </p>
        </Card>

        <Card className="p-6 md:p-8">
          <h3 className="text-lg md:text-xl font-bold mb-4">Simple, yet crazy powerful.</h3>
          <ul className="space-y-3">
            <li className="flex items-center gap-2">
              <Check className="text-green-500" />
              <span>No watermark</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="text-green-500" />
              <span>Access premium voices</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="text-green-500" />
              <span>High-quality images</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="text-green-500" />
              <span>Auto-posting features in 13 languages</span>
            </li>
          </ul>
          <Button className="w-full mt-6 bg-black text-white hover:bg-gray-800">
            Upgrade now!
          </Button>
        </Card>

        <Card className="overflow-hidden">
          <div className="aspect-video bg-gray-100">
            {/* Video thumbnail would go here */}
          </div>
          <div className="p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500">#e6b6</span>
              <span className="text-green-500 font-medium">COMPLETED</span>
            </div>
            <h3 className="font-medium mb-2 line-clamp-2">
              "Late Night Drives: Are You Ready for Ghostly Encounters?"
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Created at: January 16, 2025 11:44AM
            </p>
            <Button className="w-full bg-green-500 hover:bg-green-600 mb-4">
              Download Video
            </Button>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="font-medium mb-2">✨ Upgrade to Premium for:</p>
              <ul className="text-sm space-y-1">
                <li className="text-green-600">• Better voices & scripts</li>
                <li className="text-green-600">• No watermark</li>
                <li className="text-green-600">• Higher quality videos</li>
              </ul>
              <Button variant="link" className="w-full text-blue-500 mt-2">
                Upgrade Now →
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <CreateVideoDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
      />

      {/* Mobile upgrade button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t sm:hidden">
        <Button className="w-full bg-orange-500 hover:bg-orange-600">
          Upgrade now!
        </Button>
      </div>
    </div>
  );
};