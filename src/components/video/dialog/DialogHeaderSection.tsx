
import { DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";

interface DialogHeaderSectionProps {
  onClose: () => void;
  availableVideos: number;
  creditsRemaining: number;
}

export const DialogHeaderSection = ({
  onClose,
  availableVideos,
  creditsRemaining,
}: DialogHeaderSectionProps) => {
  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 cursor-pointer" onClick={onClose}>
          <X className="h-4 w-4" />
          <span className="text-base">Back to Dashboard</span>
        </div>
        <div className="text-primary text-right text-sm">
          <div>Available Credits: {creditsRemaining}</div>
          <div className="text-sm text-muted-foreground">Cost: 20 credits per video</div>
        </div>
      </div>
      
      <DialogTitle className="text-2xl font-bold text-primary mb-4">
        Create Your Video
      </DialogTitle>
    </div>
  );
};
