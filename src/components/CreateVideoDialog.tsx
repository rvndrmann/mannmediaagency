import React from "react";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ProgressBar } from "./video/ProgressBar";
import { VideoLanguageStep } from "./video/VideoLanguageStep";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";

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
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleCancel = () => {
    navigate("/");
  };

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px] bg-white p-6 rounded-lg">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="hover:bg-purple-50"
                onClick={handleCancel}
              >
                <X className="h-4 w-4 mr-1" />
                Back to Dashboard
              </Button>
            </div>
            <div className="text-sm text-purple-600">0 videos available (5 credits)</div>
          </div>

          <h1 className="text-2xl font-bold text-purple-600 mb-6">Create Your Video</h1>
          
          <ProgressBar step={step} totalSteps={3} />

          {step === 1 && (
            <VideoLanguageStep
              selectedLanguage={selectedLanguage}
              setSelectedLanguage={setSelectedLanguage}
              selectedDuration={selectedDuration}
              setSelectedDuration={setSelectedDuration}
            />
          )}

          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={step === 1 || isSubmitting}
              className="text-purple-600 border-purple-200 hover:bg-purple-50"
            >
              Previous
            </Button>
            <Button
              onClick={handleNext}
              disabled={isSubmitting}
              className="bg-purple-600 text-white hover:bg-purple-700"
            >
              Next
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};