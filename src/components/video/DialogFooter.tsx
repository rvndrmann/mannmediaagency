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
    <div className="flex justify-between mt-8">
      <Button
        variant="outline"
        onClick={onPrevious}
        disabled={step === 1 || isSubmitting}
        size="lg"
        className="text-purple-600 border-purple-100 hover:bg-purple-50 rounded-full px-8"
      >
        Previous
      </Button>
      <Button
        onClick={step === 3 ? onCreateVideo : onNext}
        disabled={isSubmitting || (step === 3 && !hasEnoughCredits)}
        className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-8"
        size="lg"
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