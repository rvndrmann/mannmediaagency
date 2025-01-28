import { DialogHeader as BaseDialogHeader, DialogTitle } from "@/components/ui/dialog";

interface DialogHeaderProps {
  availableVideos: number;
  creditsRemaining: number;
}

export const DialogHeader = ({ availableVideos, creditsRemaining }: DialogHeaderProps) => {
  return (
    <BaseDialogHeader>
      <DialogTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-purple-900">
        Create Your Video
      </DialogTitle>
      <div className="text-sm text-purple-600">
        {availableVideos} videos available ({creditsRemaining} credits)
      </div>
    </BaseDialogHeader>
  );
};