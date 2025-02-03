import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { X, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backgroundMusic, setBackgroundMusic] = useState<File | null>(null);
  const [style, setStyle] = useState<string>("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        toast({
          title: "Error",
          description: "Please upload an audio file",
          variant: "destructive",
        });
        return;
      }
      setBackgroundMusic(file);
    }
  };

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

      const { error } = await supabase
        .from("stories")
        .insert([
          {
            source: source.trim(),
            ready_to_go: readyToGo,
            user_id: session.user.id,
            background_music: backgroundMusicUrl,
            story_type: style,
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

            <div className="space-y-2">
              <Label htmlFor="style" className="text-xl text-purple-600">
                Style
              </Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cinematic">Cinematic</SelectItem>
                  <SelectItem value="documentary">Documentary</SelectItem>
                  <SelectItem value="animation">Animation</SelectItem>
                  <SelectItem value="vlog">Vlog</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="backgroundMusic" className="text-xl text-purple-600">
                Background Music
              </Label>
              <div className="flex items-center gap-4">
                <Input
                  id="backgroundMusic"
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  className="w-full p-2 border border-purple-100 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                />
                {backgroundMusic && (
                  <span className="text-sm text-green-600">
                    {backgroundMusic.name}
                  </span>
                )}
              </div>
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
                disabled={isSubmitting}
                className="px-8 border-purple-200 text-purple-600 hover:bg-purple-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-8 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isSubmitting ? "Creating..." : "Create Video"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};