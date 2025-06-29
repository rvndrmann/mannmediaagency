
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CreateVideoDialog } from "@/components/video/CreateVideoDialog";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const CreateVideo = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    data: userCredits,
    isLoading: isCreditsLoading,
    isError: isCreditsError,
  } = useQuery({
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

  const availableVideos = Math.floor((userCredits?.credits_remaining || 0) / 20);
  const hasEnoughCredits = (userCredits?.credits_remaining || 0) >= 20;

  const handleCreateVideo = () => {
    if (!hasEnoughCredits) {
      toast({
        title: "Insufficient Credits",
        description: "You need at least 20 credits to create a video.",
        variant: "destructive",
      });
      return;
    }
    setIsDialogOpen(true);
  };

  return (
    <div className="flex-1 p-8 bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mr-4 text-foreground hover:bg-accent"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Product Video</h1>
        </div>
        
        <Card className="p-6 bg-card text-card-foreground border-border min-h-[320px] flex items-center justify-center">
          {isCreditsLoading ? (
            <div className="w-full flex flex-col items-center justify-center space-y-4 animate-pulse">
              <div className="p-3 rounded-full bg-muted inline-block">
                <Plus className="w-6 h-6 text-muted-foreground opacity-50" />
              </div>
              <div className="h-6 w-40 bg-muted rounded mb-2" />
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-10 w-48 bg-muted rounded mt-4" />
            </div>
          ) : isCreditsError ? (
            <div className="text-center text-destructive">
              Failed to load credits. Please refresh the page.
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="p-3 rounded-full bg-primary/10 inline-block">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Start Creating</h2>
              
              <div className="flex flex-col items-center gap-2">
                <p className="text-muted-foreground">
                  You have {userCredits?.credits_remaining || 0} credits available
                </p>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 cursor-help">
                        <Info className="w-3.5 h-3.5" />
                        <span>Credit usage info</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-card text-card-foreground border-border">
                      <p>Each video requires 20 credits</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <Button
                onClick={handleCreateVideo}
                disabled={!hasEnoughCredits}
                className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Video
              </Button>
              
              {!hasEnoughCredits && (
                <div className="text-sm text-amber-500">
                  <Button
                    variant="link"
                    onClick={() => navigate("/plans")}
                    className="text-amber-500 hover:text-amber-400 p-0 h-auto font-normal underline"
                  >
                    Get more credits
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>

        <CreateVideoDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          availableVideos={availableVideos}
          creditsRemaining={userCredits?.credits_remaining || 0}
        />
      </div>
    </div>
  );
};

export default CreateVideo;
