import { Button } from "@/components/ui/button";
import { LayoutDashboard, Video, DollarSign, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { IntegrationPanel } from "../IntegrationPanel";

interface NavigationMenuProps {
  hasEnoughCredits: boolean;
}

export const NavigationMenu = ({ hasEnoughCredits }: NavigationMenuProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

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
  );
};