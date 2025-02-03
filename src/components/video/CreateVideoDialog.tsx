import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CreateVideoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  availableVideos: number;
  creditsRemaining: number;
}

export const CreateVideoDialog = ({
  isOpen,
  onClose,
  availableVideos,
  creditsRemaining,
}: CreateVideoDialogProps) => {
  const [source, setSource] = useState("");
  const [readyToGo, setReadyToGo] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    // Handle form submission logic here
    console.log("Submitting:", { source, readyToGo });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 cursor-pointer" onClick={onClose}>
              <X className="h-5 w-5" />
              <span className="text-lg">Back to Dashboard</span>
            </div>
            <span className="text-purple-600">
              {availableVideos} videos available ({creditsRemaining} credits)
            </span>
          </div>
          
          <h2 className="text-4xl font-bold text-purple-600 mb-8">
            Create Your Video
          </h2>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="source" className="text-xl text-purple-600">
                Script or Idea <span className="text-red-500">*</span>
              </Label>
              <Input
                id="source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Enter your script or idea"
                className="w-full p-4 border border-purple-100 rounded-lg focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="readyToGo" className="text-xl text-purple-600">
                Ready to Go
              </Label>
              <Switch
                id="readyToGo"
                checked={readyToGo}
                onCheckedChange={setReadyToGo}
              />
            </div>

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={onClose}
                className="px-8 border-purple-200 text-purple-600 hover:bg-purple-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                className="px-8 bg-purple-600 hover:bg-purple-700 text-white"
              >
                Create Video
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};