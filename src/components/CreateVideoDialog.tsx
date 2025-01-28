import React, { useState } from "react";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useVideoCreation } from "@/hooks/useVideoCreation";
import { StoryTypeSelect } from "./video/StoryTypeSelect";
import { MusicInput } from "./video/MusicInput";

interface CreateVideoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateVideoDialog = ({
  open,
  onOpenChange,
}: CreateVideoDialogProps) => {
  const navigate = useNavigate();
  const {
    userCredits,
    availableVideos,
    script,
    setScript,
    isSubmitting,
    handleCreateVideo,
  } = useVideoCreation(() => {
    onOpenChange(false);
    navigate("/");
  });

  const [readyToGo, setReadyToGo] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-white p-8 rounded-3xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="p-0 hover:bg-transparent">
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
            <span className="text-base text-gray-600">Back to Dashboard</span>
          </div>
          <span className="text-[#9b87f5]">
            {availableVideos} videos available ({userCredits?.credits_remaining || 0} credits)
          </span>
        </div>

        <h2 className="text-4xl font-bold text-[#9b87f5] mb-8">
          Create Your Video
        </h2>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-2xl text-[#9b87f5]">
              Script or Idea <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="Enter your script or idea"
              value={script}
              onChange={(e) => setScript(e.target.value)}
              className="w-full p-4 border border-gray-200 rounded-2xl text-base focus:ring-[#9b87f5] focus:border-[#9b87f5]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-2xl text-[#9b87f5]">
              Story Type <span className="text-red-500">*</span>
            </Label>
            <StoryTypeSelect
              value=""
              onChange={() => {}}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-2xl text-[#9b87f5]">
              Background Music (MP3)
            </Label>
            <MusicInput
              value={selectedFile}
              onChange={setSelectedFile}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-2xl text-[#9b87f5]">Ready to Go</Label>
            <Switch
              checked={readyToGo}
              onCheckedChange={setReadyToGo}
              className="data-[state=checked]:bg-[#9b87f5]"
            />
          </div>
        </div>

        <div className="flex justify-between mt-8">
          <DialogClose asChild>
            <Button
              variant="outline"
              className="text-[#9b87f5] border-[#9b87f5] hover:bg-[#9b87f5]/5 rounded-full px-8"
            >
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleCreateVideo}
            disabled={isSubmitting || !readyToGo}
            className="bg-[#9b87f5] hover:bg-[#9b87f5]/90 text-white rounded-full px-8"
          >
            Create Video
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};