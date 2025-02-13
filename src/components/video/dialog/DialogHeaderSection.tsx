
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
        <div className="text-purple-600 text-right">
          <div>Available Credits: {creditsRemaining}</div>
          <div className="text-sm text-gray-500">Cost: 20 credits per video</div>
        </div>
      </div>
      
      <DialogTitle className="text-4xl font-bold text-purple-600 mb-8">
        Create Your Video
      </DialogTitle>
    </div>
  );
};
