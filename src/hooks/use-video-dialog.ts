
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const useVideoDialog = (script: string) => {
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleCreateVideo = async () => {
    if (!script.trim()) {
      toast({
        title: "Error",
        description: "Please generate or write a script first",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "Please sign in to create a video",
          variant: "destructive",
        });
        return;
      }

      // Check user credits before showing dialog
      const { data: userCredits, error: creditsError } = await supabase
        .from("user_credits")
        .select("credits_remaining")
        .maybeSingle();

      if (creditsError) {
        throw creditsError;
      }

      if (!userCredits || userCredits.credits_remaining < 20) {
        toast({
          title: "Error",
          description: "Not enough credits to create a video. Each video costs 20 credits.",
          variant: "destructive",
        });
        return;
      }

      setIsVideoDialogOpen(true);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to create video. Please try again.",
        variant: "destructive",
      });
    }
  };

  return {
    isVideoDialogOpen,
    setIsVideoDialogOpen,
    handleCreateVideo,
  };
};
