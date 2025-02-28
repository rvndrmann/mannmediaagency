import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStoryCreation } from "@/hooks/use-story-creation";
import { useVideoCreation } from "@/hooks/use-video-creation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { DialogActionsSection } from "./dialog/DialogActionsSection";
import { toast } from "sonner";
import { UseAIResponseButton } from "@/components/ai-agent/features/UseAIResponseButton";
import { Message } from "@/types/message";

interface FacelessVideoFormProps {
  messages: Message[];
  creditsRemaining: number | undefined;
}

export function FacelessVideoForm({ messages, creditsRemaining }: FacelessVideoFormProps) {
  const [script, setScript] = useState("");
  const [style, setStyle] = useState("Explainer");
  const [readyToGo, setReadyToGo] = useState(false);
  const [backgroundMusic, setBackgroundMusic] = useState<string | null>(null);
  const [productPhotoUrl, setProductPhotoUrl] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { isCreating, createStory } = useStoryCreation();
  const { isSubmitting, createVideo } = useVideoCreation({
    onSuccess: () => {
      setIsDialogOpen(false);
      setScript("");
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!script.trim()) {
      toast.error("Please generate or write a script first");
      return;
    }

    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
  };

  const handleCreateVideo = async () => {
    const success = await createStory({
      script,
      style,
      readyToGo,
      backgroundMusic,
      productPhotoUrl
    });

    if (success) {
      setIsDialogOpen(false);
      setScript("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="faceless-video-form">
      <div className="space-y-6 p-6">
        <div>
          <Label htmlFor="script" className="text-white">Video Script</Label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Textarea
                id="script"
                placeholder="Write a script or generate one using AI..."
                value={script}
                onChange={(e) => setScript(e.target.value)}
                className="bg-gray-900 border-gray-700 text-white resize-none"
              />
            </div>
            <UseAIResponseButton
              messages={messages}
              onUseResponse={setScript}
              variant="compact"
              className="shrink-0"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="style" className="text-white">Video Style</Label>
          <Select value={style} onValueChange={setStyle}>
            <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
              <SelectValue placeholder="Select a style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Explainer">Explainer</SelectItem>
              <SelectItem value="Review">Review</SelectItem>
              <SelectItem value="Tutorial">Tutorial</SelectItem>
              <SelectItem value="Testimonial">Testimonial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white">
          Create Video (Costs 20 credits)
        </Button>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-gray-900 border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle>Confirm Video Creation</DialogTitle>
              <DialogDescription>
                Creating this video will cost 20 credits. Do you want to proceed?
              </DialogDescription>
            </DialogHeader>
            <DialogActionsSection
              onClose={handleDialogClose}
              onSubmit={handleCreateVideo}
              isSubmitting={isCreating}
            />
          </DialogContent>
        </Dialog>
      </div>
    </form>
  );
}
