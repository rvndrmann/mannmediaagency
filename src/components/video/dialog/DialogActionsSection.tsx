
import { Button } from "@/components/ui/button";

interface DialogActionsSectionProps {
  onClose: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export const DialogActionsSection = ({
  onClose,
  onSubmit,
  isSubmitting,
}: DialogActionsSectionProps) => {
  return (
    <div className="flex justify-between pt-4">
      <Button
        variant="outline"
        onClick={onClose}
        disabled={isSubmitting}
        className="px-8"
      >
        Cancel
      </Button>
      <Button
        onClick={onSubmit}
        disabled={isSubmitting}
        className="px-8"
      >
        {isSubmitting ? "Creating..." : "Create Video (20 credits)"}
      </Button>
    </div>
  );
};
