
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { DialogHeaderSection } from "./dialog/DialogHeaderSection";
import { ScriptInputSection } from "./dialog/ScriptInputSection";
import { StyleSelectorSection } from "./dialog/StyleSelectorSection";
import { MusicUploaderSection } from "./dialog/MusicUploaderSection";
import { ProductPhotoSection } from "./dialog/ProductPhotoSection";
import { DialogActionsSection } from "./dialog/DialogActionsSection";
import { useSupabaseUpload } from "@/hooks/use-supabase-upload";
import { useVideoCreation } from "@/hooks/use-video-creation";

interface CreateVideoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  availableVideos: number;
  creditsRemaining: number;
  initialScript?: string;
  initialStyle?: string;
  initialReadyToGo?: boolean;
  initialBackgroundMusic?: string | null;
  initialProductPhoto?: string | null;
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
  initialProductPhoto = null,
}: CreateVideoDialogProps) => {
  const [source, setSource] = useState(initialScript);
  const [readyToGo, setReadyToGo] = useState(initialReadyToGo);
  const [style, setStyle] = useState<string>(initialStyle);
  const [backgroundMusicUrl, setBackgroundMusicUrl] = useState<string | null>(initialBackgroundMusic);
  const [productPhotoUrl, setProductPhotoUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const {
    uploadProgress: musicUploadProgress,
    uploadedFileName: musicFileName,
    handleFileUpload: handleMusicUpload
  } = useSupabaseUpload(initialBackgroundMusic);

  const {
    uploadProgress: photoUploadProgress,
    uploadedFileName: photoFileName,
    previewUrl: photoPreviewUrl,
    handleFileUpload: handlePhotoUpload
  } = useSupabaseUpload(initialProductPhoto);

  const { isSubmitting, createVideo } = useVideoCreation({
    onSuccess: onClose
  });

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await handlePhotoUpload(file, 'product-photos', 'image');
      if (url) setProductPhotoUrl(url);
    }
  };

  const handleMusicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await handleMusicUpload(file, 'background-music', 'audio');
      if (url) setBackgroundMusicUrl(url);
    }
  };

  const handleSubmit = async () => {
    if (creditsRemaining < 10) {
      toast({
        title: "Insufficient Credits",
        description: "You need at least 10 credits to create a video.",
        variant: "destructive",
      });
      return;
    }

    await createVideo({
      source,
      readyToGo,
      backgroundMusicUrl,
      productPhotoUrl,
      style
    });
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

          <ProductPhotoSection
            uploadProgress={photoUploadProgress}
            uploadedFileName={photoFileName}
            previewUrl={photoPreviewUrl}
            onFileChange={handlePhotoChange}
          />

          <StyleSelectorSection
            style={style}
            onStyleChange={setStyle}
          />

          <MusicUploaderSection
            uploadProgress={musicUploadProgress}
            uploadedFileName={musicFileName}
            onFileChange={handleMusicChange}
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
