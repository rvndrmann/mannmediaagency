import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CreateVideoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateVideoDialog = ({
  open,
  onOpenChange,
}: CreateVideoDialogProps) => {
  const [source, setSource] = React.useState("");
  const [storyType, setStoryType] = React.useState("");
  const [readyToGo, setReadyToGo] = React.useState(false);
  const [customMusic, setCustomMusic] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();

  const handleCreateVideo = async () => {
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
          story_type_id: parseInt(storyType),
          ready_to_go: readyToGo,
          background_music: customMusic,
          user_id: session.session.user.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Video created successfully!",
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
      <DialogContent className="max-w-lg">
        <div className="space-y-6">
          <div>
            <Label htmlFor="source">Source</Label>
            <Input
              id="source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Enter source URL or text"
            />
          </div>

          <div>
            <Label htmlFor="storyType">Story Type</Label>
            <Select value={storyType} onValueChange={setStoryType}>
              <SelectTrigger>
                <SelectValue placeholder="Select story type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Type 1</SelectItem>
                <SelectItem value="2">Type 2</SelectItem>
                <SelectItem value="3">Type 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="readyToGo">Ready to Go</Label>
            <Switch
              id="readyToGo"
              checked={readyToGo}
              onCheckedChange={setReadyToGo}
            />
          </div>

          <div>
            <Label htmlFor="customMusic">Custom Music URL (Optional)</Label>
            <Input
              id="customMusic"
              value={customMusic}
              onChange={(e) => setCustomMusic(e.target.value)}
              placeholder="Enter music URL"
            />
          </div>

          <Button
            onClick={handleCreateVideo}
            disabled={isSubmitting || !source || !storyType}
            className="w-full"
          >
            {isSubmitting ? "Creating..." : "Create Video"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};