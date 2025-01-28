import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SourceInput } from "./video/SourceInput";
import { StoryTypeSelect } from "./video/StoryTypeSelect";
import { MusicInput } from "./video/MusicInput";
import { ReadyToGoToggle } from "./video/ReadyToGoToggle";

interface CreateVideoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateVideoDialog = ({
  open,
  onOpenChange,
}: CreateVideoDialogProps) => {
  const [source, setSource] = React.useState("");
  const [readyToGo, setReadyToGo] = React.useState(false);
  const [backgroundMusic, setBackgroundMusic] = React.useState("");
  const [storyType, setStoryType] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();

  console.log("Dialog state:", { source, readyToGo, backgroundMusic, storyType });

  const handleCreateVideo = async () => {
    if (!source || !storyType) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      console.log("Starting video creation...");
      
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session?.user.id) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "You must be logged in to create a video",
        });
        return;
      }

      console.log("Creating story with data:", {
        source,
        user_id: session.session.user.id,
        ready_to_go: readyToGo,
        background_music: backgroundMusic,
        story_type_id: parseInt(storyType)
      });

      const { data, error } = await supabase
        .from("stories")
        .insert({
          source,
          user_id: session.session.user.id,
          ready_to_go: readyToGo,
          background_music: backgroundMusic,
          story_type_id: parseInt(storyType)
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating video:", error);
        throw error;
      }

      console.log("Story created successfully:", data);

      toast({
        title: "Success",
        description: "Video creation started! We'll notify you when it's ready.",
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating video:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create video. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white p-6 rounded-lg">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-purple-600">Create Your Video</h1>
          <div className="text-sm text-purple-600">0 videos available (5 credits)</div>
        </div>

        <div className="space-y-6">
          <SourceInput value={source} onChange={setSource} />
          <StoryTypeSelect value={storyType} onChange={setStoryType} />
          <MusicInput value={backgroundMusic} onChange={setBackgroundMusic} />
          <ReadyToGoToggle checked={readyToGo} onCheckedChange={setReadyToGo} />
        </div>

        <div className="flex justify-between mt-6 pt-4 border-t border-purple-100">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-purple-600 border-purple-200 hover:bg-purple-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateVideo}
            disabled={isSubmitting || !source || !storyType}
            className="bg-purple-600 text-white hover:bg-purple-700"
          >
            {isSubmitting ? "Creating..." : "Create Video"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};