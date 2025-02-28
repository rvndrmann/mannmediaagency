
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CreateVideoDialog } from "@/components/video/CreateVideoDialog";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const CreateVideo = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
            className="mr-4 text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-white">Product Video</h1>
        </div>
        
        <Card className="p-6 glass-card">
          <div className="text-center space-y-4">
            <div className="p-3 rounded-full bg-white/10 inline-block">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white">Start Creating</h2>
            <p className="text-gray-400">
              You have {availableVideos} videos available ({userCredits?.credits_remaining || 0} credits)
            </p>
            <Button 
              onClick={handleCreateVideo}
              disabled={!hasEnoughCredits}
              className="bg-white/10 hover:bg-white/20 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Video
            </Button>
          </div>
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
