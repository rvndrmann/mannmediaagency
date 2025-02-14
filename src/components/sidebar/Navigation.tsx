
import { Button } from "@/components/ui/button";
import { LayoutDashboard, DollarSign, Video, Bot, Link2, Settings, Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export const Navigation = () => {
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

  const hasEnoughCredits = (userCredits?.credits_remaining || 0) >= 10;
  const hasMinimumCreditsForAI = (userCredits?.credits_remaining || 0) >= 1;

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

  return (
    <nav className="space-y-1">
      <Button
        variant="ghost"
        className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
        onClick={() => navigate("/")}
      >
        <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
      </Button>

      <Button
        variant="ghost"
        className={`w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800 ${
          !hasMinimumCreditsForAI ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        onClick={() => navigate("/ai-agent")}
        disabled={!hasMinimumCreditsForAI}
      >
        <Bot className="mr-2 h-4 w-4" /> AI Agent
      </Button>

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

      <div className="space-y-1">
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800 opacity-50 cursor-not-allowed"
          disabled={true}
        >
          <Video className="mr-2 h-4 w-4" /> Video Editor
        </Button>
        <div className="text-xs text-red-500 pl-10">Coming Soon</div>
      </div>

      <Button
        variant="ghost"
        className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
        onClick={() => navigate("/product-shoot")}
      >
        <Camera className="mr-2 h-4 w-4" /> Product Shoot
      </Button>

      <Button
        variant="ghost"
        className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
        onClick={() => navigate("/metadata")}
      >
        <Settings className="mr-2 h-4 w-4" /> Metadata Manager
      </Button>

      <Button
        variant="ghost"
        className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
        onClick={() => navigate("/plans")}
      >
        <DollarSign className="mr-2 h-4 w-4" /> Plans & Billing
      </Button>
      
      <div className="space-y-1">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800 opacity-50 cursor-not-allowed"
          disabled={true}
        >
          <Link2 className="mr-2 h-4 w-4" /> Integration
        </Button>
        <div className="text-xs text-red-500 pl-10">Coming Soon</div>
      </div>
    </nav>
  );
};
