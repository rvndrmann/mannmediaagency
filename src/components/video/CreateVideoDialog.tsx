
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
  const [isLocallySubmitting, setIsLocallySubmitting] = useState(false); // Add local loading state
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

  // Remove isSubmitting from the hook destructuring if it's not needed elsewhere
  const { createVideo } = useVideoCreation({
    onSuccess: () => {
      setIsLocallySubmitting(false); // Ensure state is reset on success before closing
      onClose();
    }
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
    if (creditsRemaining < 20) {
      toast({
        title: "Insufficient Credits",
        description: "You need at least 20 credits to create a video.",
        variant: "destructive",
      });
      return;
    }

    setIsLocallySubmitting(true);
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error("Video creation timed out after 30 seconds."));
        }, 30000); // 30 seconds timeout
      });

      // Race the createVideo call against the timeout
      await Promise.race([
        createVideo({
          source,
          readyToGo,
          backgroundMusicUrl,
          productPhotoUrl,
          style,
        }),
        timeoutPromise,
      ]);

      // If createVideo finished successfully, the onSuccess callback in useVideoCreation
      // will handle resetting state and closing. We just need to clear the timeout here.
      if (timeoutId) clearTimeout(timeoutId);

    } catch (error) {
      // Clear timeout if it exists (important in case of error)
      if (timeoutId) clearTimeout(timeoutId);

      // Check if it was our timeout error
      if (error instanceof Error && error.message.includes("timed out")) {
        toast({
          title: "Timeout",
          description: "Video creation is taking longer than expected. Please check back later or try again.",
          // Use "default" variant as "warning" might not be defined
          variant: "default",
        });
      } else {
        // Log other errors, but assume the hook's error handling shows a toast
        console.error("Submit handler caught error:", error);
      }
      // Explicitly reset local state here in the catch block for robustness
      setIsLocallySubmitting(false);

    } finally {
      // Ensure timeout is always cleared
      if (timeoutId) clearTimeout(timeoutId);
      // Final safety net to reset submitting state
      setIsLocallySubmitting(false);
    }
  };

  // The rest of the component remains the same from line 113 onwards
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* Added overflow-y-auto and max-h for scrolling */}
      <DialogContent className="sm:max-w-[600px] overflow-y-auto max-h-[90vh]">
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
            <Label htmlFor="readyToGo" className="text-xl text-primary">
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
            isSubmitting={isLocallySubmitting} // Pass local state to actions
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
