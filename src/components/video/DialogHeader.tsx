import { DialogHeader as BaseDialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { X } from "lucide-react";

interface DialogHeaderProps {
  availableVideos: number;
  creditsRemaining: number;
}

export const DialogHeader = ({ availableVideos, creditsRemaining }: DialogHeaderProps) => {
  return (
    <BaseDialogHeader className="relative">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <X className="h-5 w-5" />
          <span className="text-lg">Back to Dashboard</span>
        </div>
        <span className="text-purple-600">
          {availableVideos} videos available ({creditsRemaining} credits)
        </span>
      </div>
      <DialogTitle className="text-4xl font-bold text-purple-600">
        Create Your Video
      </DialogTitle>
    </BaseDialogHeader>
  );
};