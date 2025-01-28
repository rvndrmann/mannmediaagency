import React from "react";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { VideoLanguageStep } from "./video/VideoLanguageStep";
import { ProgressBar } from "./video/ProgressBar";
import { useVideoCreation } from "@/hooks/useVideoCreation";
import { DialogFooter } from "./video/DialogFooter";
import { DialogHeader } from "./video/DialogHeader";

interface CreateVideoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateVideoDialog = ({
  open,
  onOpenChange,
}: CreateVideoDialogProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    step,
    selectedLanguage,
    setSelectedLanguage,
    selectedDuration,
    setSelectedDuration,
    isSubmitting,
    userCredits,
    availableVideos,
    hasEnoughCredits,
    handleNext,
    handlePrevious,
    handleCreateVideo,
  } = useVideoCreation(() => {
    onOpenChange(false);
    navigate("/");
  });

  const handleCancel = () => {
    navigate("/");
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <VideoLanguageStep
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={setSelectedLanguage}
            selectedDuration={selectedDuration}
            setSelectedDuration={setSelectedDuration}
          />
        );
      // Additional steps will be added here
      default:
        return null;
    }
  };

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px] bg-white p-6 rounded-lg">
          <DialogHeader 
            availableVideos={availableVideos} 
            creditsRemaining={userCredits?.credits_remaining || 0} 
          />
          
          <ProgressBar step={step} totalSteps={3} />
          
          {renderStep()}

          <DialogFooter
            step={step}
            isSubmitting={isSubmitting}
            availableVideos={availableVideos}
            hasEnoughCredits={hasEnoughCredits}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onCreateVideo={handleCreateVideo}
          />
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};
