import { Button } from "@/components/ui/button";

interface DialogFooterProps {
  step: number;
  isSubmitting: boolean;
  availableVideos: number;
  hasEnoughCredits: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onCreateVideo: () => void;
}

export const DialogFooter = ({
  step,
  isSubmitting,
  availableVideos,
  hasEnoughCredits,
  onPrevious,
  onNext,
  onCreateVideo,
}: DialogFooterProps) => {
  return (
    <div className="flex justify-between mt-4 pt-2 border-t border-purple-100">
      <Button
        variant="outline"
        onClick={onPrevious}
        disabled={step === 1 || isSubmitting}
        size="sm"
        className="text-purple-700 border-purple-200 hover:bg-purple-50"
      >
        Previous
      </Button>
      <Button
        onClick={step === 3 ? onCreateVideo : onNext}
        disabled={isSubmitting || (step === 3 && !hasEnoughCredits)}
        className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-sm"
        size="sm"
      >
        {isSubmitting
          ? "Creating..."
          : step === 3
          ? `Create Video (${availableVideos} videos left)`
          : "Next"}
      </Button>
    </div>
  );
};