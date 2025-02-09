
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
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

      // This will trigger the decrease_credits function via the after_story_created trigger
      const { error } = await supabase
        .from("stories")
        .insert([
          {
            source: script.trim(),
            ready_to_go: true,
            user_id: user.id
          },
        ]);

      if (error) {
        console.error("Error creating story:", error);
        toast({
          title: "Error",
          description: error.message,
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
