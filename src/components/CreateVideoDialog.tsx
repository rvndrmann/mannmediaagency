import React from "react";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SourceInput } from "./video/SourceInput";
import { StoryTypeSelect } from "./video/StoryTypeSelect";
import { MusicInput } from "./video/MusicInput";
import { ReadyToGoToggle } from "./video/ReadyToGoToggle";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";

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
  const [backgroundMusic, setBackgroundMusic] = React.useState<File | null>(null);
  const [storyType, setStoryType] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

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
      console.log("Starting video creation with data:", {
        source,
        storyType,
        readyToGo,
        hasBackgroundMusic: !!backgroundMusic
      });
      
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session?.user.id) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "You must be logged in to create a video",
        });
        return;
      }

      let musicUrl = null;
      if (backgroundMusic) {
        const fileExt = backgroundMusic.name.split('.').pop();
        const filePath = `${crypto.randomUUID()}.${fileExt}`;
        
        console.log("Uploading background music:", filePath);
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('background-music')
          .upload(filePath, backgroundMusic);

        if (uploadError) {
          console.error("Error uploading music:", uploadError);
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('background-music')
          .getPublicUrl(filePath);

        musicUrl = publicUrl;
        console.log("Music uploaded successfully:", musicUrl);
      }

      const { data, error } = await supabase
        .from("stories")
        .insert({
          source,
          user_id: session.session.user.id,
          ready_to_go: readyToGo,
          background_music: musicUrl,
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
      
      navigate("/");
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

  const handleCancel = () => {
    navigate("/");
  };

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px] bg-white p-6 rounded-lg">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-purple-600">Create Your Video</h1>
            <div className="flex items-center gap-4">
              <div className="text-sm text-purple-600">0 videos available (5 credits)</div>
              <DialogClose asChild>
                <Button 
                  variant="ghost" 
                  className="h-6 w-6 p-0 hover:bg-purple-50"
                  onClick={handleCancel}
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
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
              onClick={handleCancel}
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
    </TooltipProvider>
  );
};