
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
        className="px-8 border-purple-200 text-purple-600 hover:bg-purple-50"
      >
        Cancel
      </Button>
      <Button
        onClick={onSubmit}
        disabled={isSubmitting}
        className="px-8 bg-purple-600 hover:bg-purple-700 text-white CreateVideoDialogSubmitButton"
      >
        {isSubmitting ? "Creating..." : "Create Video (Costs 20 credits)"}
      </Button>
    </div>
  );
};
