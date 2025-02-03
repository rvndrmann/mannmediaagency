import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useQuery } from "@tanstack/react-query";
import { DialogActions } from "./dialog/DialogActions";
import { MusicUploader } from "./dialog/MusicUploader";
import { StyleSelector } from "./dialog/StyleSelector";

interface CreateVideoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  availableVideos: number;
  creditsRemaining: number;
}

interface StoryType {
  id: number;
  story_type: string | null;
}

export const CreateVideoDialog = ({
  isOpen,
  onClose,
  availableVideos,
  creditsRemaining,
}: CreateVideoDialogProps) => {
  const [source, setSource] = useState("");
  const [readyToGo, setReadyToGo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backgroundMusic, setBackgroundMusic] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [style, setStyle] = useState<string>("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: storyTypes } = useQuery({
    queryKey: ["storyTypes"],
    queryFn: async () => {
      console.log("Fetching story types...");
      const { data, error } = await supabase
        .from("story_type")
        .select("id, story_type");
      
      if (error) {
        console.error("Error fetching story types:", error);
        throw error;
      }
      
      console.log("Fetched story types:", data);
      return data as StoryType[];
    },
  });

  const handleSubmit = async () => {
    if (!source.trim()) {
      toast({
        title: "Error",
        description: "Please enter a script or idea",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("No authenticated session");
      }

      let backgroundMusicUrl = null;
      
      if (backgroundMusic) {
        const fileExt = backgroundMusic.name.split('.').pop();
        const filePath = `${crypto.randomUUID()}.${fileExt}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from('background-music')
          .upload(filePath, backgroundMusic);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('background-music')
          .getPublicUrl(filePath);
          
        backgroundMusicUrl = publicUrl;
      }

      const selectedStoryType = storyTypes?.find(type => type.story_type === style);
      const story_type_id = selectedStoryType?.id || null;

      const { error } = await supabase
        .from("stories")
        .insert([
          {
            source: source.trim(),
            ready_to_go: readyToGo,
            user_id: session.user.id,
            background_music: backgroundMusicUrl,
            story_type_id: story_type_id,
          },
        ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Your video has been created successfully",
      });
      onClose();
    } catch (error) {
      console.error("Error creating video:", error);
      toast({
        title: "Error",
        description: "Failed to create video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogTitle className="sr-only">Create Your Video</DialogTitle>
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 cursor-pointer" onClick={onClose}>
              <X className="h-5 w-5" />
              <span className="text-lg">Back to Dashboard</span>
            </div>
            <span className="text-purple-600">
              {availableVideos} videos available ({creditsRemaining} credits - costs 10 credits per video)
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

            <StyleSelector
              value={style}
              onChange={setStyle}
              storyTypes={storyTypes || []}
            />

            <MusicUploader
              onFileUpload={(file) => {
                setBackgroundMusic(file);
                setUploadProgress(0);
              }}
              uploadProgress={uploadProgress}
            />

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

            <DialogActions
              onClose={onClose}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};