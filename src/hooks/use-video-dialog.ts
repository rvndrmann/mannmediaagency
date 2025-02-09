
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export const useVideoDialog = (script: string) => {
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleCreateVideo = () => {
    if (!script.trim()) {
      toast({
        title: "Error",
        description: "Please generate or write a script first",
        variant: "destructive",
      });
      return;
    }
    setIsVideoDialogOpen(true);
  };

  return {
    isVideoDialogOpen,
    setIsVideoDialogOpen,
    handleCreateVideo,
  };
};
