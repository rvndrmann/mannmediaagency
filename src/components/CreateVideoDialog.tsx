import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { VideoLanguageStep } from "./video/VideoLanguageStep";
import { VideoVoiceStep } from "./video/VideoVoiceStep";
import { VideoScriptStep } from "./video/VideoScriptStep";
import { ProgressBar } from "./video/ProgressBar";

interface CreateVideoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateVideoDialog = ({
  open,
  onOpenChange,
}: CreateVideoDialogProps) => {
  const [step, setStep] = React.useState(1);
  const [selectedLanguage, setSelectedLanguage] = React.useState("en-US");
  const [selectedDuration, setSelectedDuration] = React.useState("60");
  const [selectedVoice, setSelectedVoice] = React.useState("david");
  const [topic, setTopic] = React.useState("");
  const [script, setScript] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();

  const popularTopics = [
    "What If You Could Time Travel to Ancient Egypt?",
    "5 Hidden Gems in Paris",
    "Morning Routine of a CEO",
    "Life in a World Without Smartphones",
    "How to Make the Perfect Avocado Toast",
    "AI Assistant Falls in Love with User",
  ];

  const handleNext = () => {
    setStep((prev) => prev + 1);
  };

  const handlePrevious = () => {
    setStep((prev) => prev - 1);
  };

  const handleGenerateScript = () => {
    console.log("Generating script for topic:", topic);
    setScript("Your script will appear here. You can edit it after generation.");
  };

  const handleCreateVideo = async () => {
    try {
      setIsSubmitting(true);
      console.log("Creating video with script:", script);

      const { data, error } = await supabase
        .from("stories")
        .insert([{ source: script }])
        .select();

      if (error) {
        console.error("Error creating video:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to create video. Please try again.",
        });
        return;
      }

      console.log("Video created successfully:", data);
      toast({
        title: "Success",
        description: "Video created successfully!",
      });
      onOpenChange(false); // Close dialog

      // Reset form
      setStep(1);
      setTopic("");
      setScript("");
    } catch (error) {
      console.error("Error creating video:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-gradient-to-br from-white to-purple-50 backdrop-blur-xl border border-purple-100 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-purple-900">
            Create Your Video
          </DialogTitle>
        </DialogHeader>

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

        <div className="flex justify-between mt-4 pt-2 border-t border-purple-100">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={step === 1 || isSubmitting}
            size="sm"
            className="text-purple-700 border-purple-200 hover:bg-purple-50"
          >
            Previous
          </Button>
          <Button
            onClick={step === 3 ? handleCreateVideo : handleNext}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-sm"
            size="sm"
          >
            {isSubmitting ? "Creating..." : step === 3 ? "Create Video" : "Next"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};