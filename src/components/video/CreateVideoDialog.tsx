
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DialogHeaderSection } from "./dialog/DialogHeaderSection";
import { ScriptInputSection } from "./dialog/ScriptInputSection";
import { StyleSelectorSection } from "./dialog/StyleSelectorSection";
import { MusicUploaderSection } from "./dialog/MusicUploaderSection";
import { DialogActionsSection } from "./dialog/DialogActionsSection";

interface CreateVideoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  availableVideos: number;
  creditsRemaining: number;
  initialScript?: string;
  initialStyle?: string;
  initialReadyToGo?: boolean;
  initialBackgroundMusic?: string | null;
}

export const CreateVideoDialog = ({
  isOpen,
  onClose,
  availableVideos,
  creditsRemaining,
  initialScript = "",
  initialStyle = "",
  initialReadyToGo = false,
  initialBackgroundMusic = null,
}: CreateVideoDialogProps) => {
  const [source, setSource] = useState(initialScript);
  const [readyToGo, setReadyToGo] = useState(initialReadyToGo);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backgroundMusic, setBackgroundMusic] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(initialBackgroundMusic);
  const [style, setStyle] = useState<string>(initialStyle);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setUploadProgress(0);
      setUploadedFileName(null);

      try {
        const fileExt = file.name.split('.').pop();
        const filePath = `${crypto.randomUUID()}.${fileExt}`;

        const reader = new FileReader();
        reader.onload = async (event) => {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const blob = new Blob([arrayBuffer], { type: file.type });
          
          const { error: uploadError } = await supabase.storage
            .from('background-music')
            .upload(filePath, blob, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            throw uploadError;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('background-music')
            .getPublicUrl(filePath);
          
          setUploadProgress(100);
          setUploadedFileName(file.name);
        };

        reader.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = (event.loaded / event.total) * 100;
            setUploadProgress(percent);
          }
        };

        reader.readAsArrayBuffer(file);
      } catch (error) {
        console.error('Upload error:', error);
        toast({
          title: "Error",
          description: "Failed to upload background music",
          variant: "destructive",
        });
        setUploadProgress(0);
        setUploadedFileName(null);
      }
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
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("No authenticated user found");
      }

      let backgroundMusicUrl = null;
      
      if (backgroundMusic) {
        const fileExt = backgroundMusic.name.split('.').pop();
        const filePath = `${crypto.randomUUID()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('background-music')
          .upload(filePath, backgroundMusic);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('background-music')
          .getPublicUrl(filePath);
          
        backgroundMusicUrl = publicUrl;
      }

      const { data: storyTypes } = await supabase
        .from("story_type")
        .select("id, story_type");

      const selectedStoryType = storyTypes?.find(type => type.story_type === style);
      const story_type_id = selectedStoryType?.id || null;

      const { error } = await supabase
        .from("stories")
        .insert([
          {
            source: source.trim(),
            ready_to_go: readyToGo,
            background_music: backgroundMusicUrl || initialBackgroundMusic,
            story_type_id: story_type_id,
            user_id: user.id
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
        <DialogHeaderSection
          onClose={onClose}
          availableVideos={availableVideos}
          creditsRemaining={creditsRemaining}
        />
        
        <div className="space-y-6">
          <ScriptInputSection
            source={source}
            onSourceChange={setSource}
          />

          <StyleSelectorSection
            style={style}
            onStyleChange={setStyle}
          />

          <MusicUploaderSection
            uploadProgress={uploadProgress}
            uploadedFileName={uploadedFileName}
            onFileChange={handleFileChange}
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

          <DialogActionsSection
            onClose={onClose}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
