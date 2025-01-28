import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { VideoLanguageStep } from "./video/VideoLanguageStep";
import { VideoVoiceStep } from "./video/VideoVoiceStep";
import { VideoScriptStep } from "./video/VideoScriptStep";
import { ProgressBar } from "./video/ProgressBar";
import { DialogHeader } from "./video/DialogHeader";
import { DialogFooter } from "./video/DialogFooter";
import { useVideoCreation } from "@/hooks/useVideoCreation";

interface CreateVideoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateVideoDialog = ({
  open,
  onOpenChange,
}: CreateVideoDialogProps) => {
  const {
    step,
    selectedLanguage,
    setSelectedLanguage,
    selectedDuration,
    setSelectedDuration,
    selectedVoice,
    setSelectedVoice,
    topic,
    setTopic,
    script,
    setScript,
    isSubmitting,
    userCredits,
    availableVideos,
    hasEnoughCredits,
    handleNext,
    handlePrevious,
    handleGenerateScript,
    handleCreateVideo,
  } = useVideoCreation(() => onOpenChange(false));

  const popularTopics = [
    "What If You Could Time Travel to Ancient Egypt?",
    "5 Hidden Gems in Paris",
    "Morning Routine of a CEO",
    "Life in a World Without Smartphones",
    "How to Make the Perfect Avocado Toast",
    "AI Assistant Falls in Love with User",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-gradient-to-br from-white to-purple-50 backdrop-blur-xl border border-purple-100 shadow-xl">
        <DialogHeader 
          availableVideos={availableVideos}
          creditsRemaining={userCredits?.credits_remaining || 0}
        />

        <ProgressBar step={step} totalSteps={3} />

        {step === 1 && (
          <VideoLanguageStep
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={setSelectedLanguage}
            selectedDuration={selectedDuration}
            setSelectedDuration={setSelectedDuration}
          />
        )}

        {step === 2 && (
          <VideoVoiceStep
            selectedVoice={selectedVoice}
            setSelectedVoice={setSelectedVoice}
          />
        )}

        {step === 3 && (
          <VideoScriptStep
            topic={topic}
            setTopic={setTopic}
            script={script}
            setScript={setScript}
            onGenerateScript={handleGenerateScript}
            popularTopics={popularTopics}
          />
        )}

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
  );
};