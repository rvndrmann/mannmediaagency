
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
          <X className="h-5 w-5" />
          <span className="text-lg">Back to Dashboard</span>
        </div>
        <span className="text-purple-600">
          {availableVideos} videos available ({creditsRemaining} credits - costs 20 credits per video)
        </span>
      </div>
      
      <DialogTitle className="text-4xl font-bold text-purple-600 mb-8">
        Create Your Video
      </DialogTitle>
    </div>
  );
};
