import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session?.user.id) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "You must be logged in to create a video",
        });
        return;
      }

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

      if (error) throw error;

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
          <div className="space-y-2">
            <Label htmlFor="source" className="text-lg text-purple-700">
              Script or Idea <span className="text-red-500">*</span>
            </Label>
            <Input
              id="source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Enter your script or idea"
              className="w-full p-2 border border-purple-100 rounded-lg focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="storyType" className="text-lg text-purple-700">
              Story Type <span className="text-red-500">*</span>
            </Label>
            <Select value={storyType} onValueChange={setStoryType}>
              <SelectTrigger className="w-full border border-purple-100">
                <SelectValue placeholder="Select a story type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Educational</SelectItem>
                <SelectItem value="2">Entertainment</SelectItem>
                <SelectItem value="3">Marketing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="backgroundMusic" className="text-lg text-purple-700">
              Background Music
            </Label>
            <Input
              id="backgroundMusic"
              value={backgroundMusic}
              onChange={(e) => setBackgroundMusic(e.target.value)}
              placeholder="Enter music URL or leave empty for default"
              className="w-full p-2 border border-purple-100 rounded-lg focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="readyToGo" className="text-lg text-purple-700">
              Ready to Go
            </Label>
            <Switch
              id="readyToGo"
              checked={readyToGo}
              onCheckedChange={setReadyToGo}
            />
          </div>
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