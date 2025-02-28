
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
import { UseAIResponseButton } from "@/components/ai-agent/features/UseAIResponseButton";
import { Message } from "@/types/message";

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
  embeddedMode?: boolean;
  messages?: Message[];
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
  embeddedMode = false,
  messages = [],
}: CreateVideoDialogProps) => {
  const [source, setSource] = useState(initialScript);
  const [readyToGo, setReadyToGo] = useState(initialReadyToGo);
  const [style, setStyle] = useState<string>(initialStyle || "Explainer");
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
    if (creditsRemaining < 20) {
      toast({
        title: "Insufficient Credits",
        description: "You need at least 20 credits to create a video.",
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

  const handleAiScriptGeneration = (aiText: string) => {
    setSource(aiText);
    toast({
      title: "Script Updated",
      description: "The AI response has been used as your script."
    });
  };

  // Conditional content for Dialog or Embedded form
  const content = (
    <div className={embeddedMode ? "space-y-6" : ""}>
      {embeddedMode ? (
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-purple-600">Create Your Video</h2>
          <div className="text-right text-sm">
            <div className="text-purple-600">Available Credits: {creditsRemaining}</div>
            <div className="text-xs text-gray-500">Cost: 20 credits per video</div>
          </div>
        </div>
      ) : (
        <DialogHeaderSection
          onClose={onClose}
          availableVideos={availableVideos}
          creditsRemaining={creditsRemaining}
        />
      )}
      
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between items-center mb-2">
            <Label htmlFor="source" className="text-xl text-purple-600">
              Script <span className="text-red-500">*</span>
            </Label>
            {messages && messages.length > 0 && (
              <UseAIResponseButton 
                messages={messages} 
                onUseResponse={handleAiScriptGeneration} 
              />
            )}
          </div>
          <ScriptInputSection
            source={source}
            onSourceChange={setSource}
          />
        </div>

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

        {/* IMPORTANT: Only show action buttons when NOT in embedded mode */}
        {!embeddedMode && (
          <DialogActionsSection
            onClose={onClose}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}
        
        {/* Add a truly hidden button for programmatic submission in embedded mode */}
        {embeddedMode && (
          <button 
            type="button"
            onClick={handleSubmit}
            className="!hidden embedded-video-submit-button CreateVideoDialogSubmitButton"
            aria-hidden="true"
            data-testid="embedded-video-submit"
          >
            Submit
          </button>
        )}
      </div>
    </div>
  );

  // Render either as a Dialog or directly (for embedded use)
  return embeddedMode ? (
    <div className="p-4 rounded-lg shadow-md bg-gray-900 border border-gray-800 faceless-video-form">
      {content}
    </div>
  ) : (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        {content}
      </DialogContent>
    </Dialog>
  );
};
