
import { InputPanel as ImageToVideoInputPanel } from "@/components/image-to-video/InputPanel";
import { GenerateButton } from "./GenerateButton";
import { Video } from "lucide-react";
import { Message } from "@/types/message";

interface ImageToVideoPanelProps {
  imageToVideo: {
    isMobile: boolean;
    previewUrl: string | null;
    prompt: string;
    aspectRatio: string;
    onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onClearFile: () => void;
    creditsRemaining: number;
    isGenerating: boolean;
    onGenerate: (prompt: string, aspectRatio: string) => void;
    onSelectFromHistory?: (jobId: string, imageUrl: string) => void;
  };
  messages: Message[];
}

export const ImageToVideoPanel = ({ imageToVideo, messages }: ImageToVideoPanelProps) => {
  const renderGenerateButton = () => {
    if (!imageToVideo.prompt || !imageToVideo.previewUrl || imageToVideo.isGenerating) return null;
    
    return (
      <GenerateButton 
        onClick={() => imageToVideo.onGenerate(imageToVideo.prompt, imageToVideo.aspectRatio)}
        disabled={imageToVideo.isGenerating}
        icon={<Video className="mr-2 h-4 w-4" />}
        label="Generate Video"
        creditCost="1 credit"
        position="fixed"
      />
    );
  };

  return (
    <div className="relative h-full">
      <ImageToVideoInputPanel
        isMobile={imageToVideo.isMobile}
        prompt={imageToVideo.prompt}
        onPromptChange={(newPrompt) => {
          // This is a pass-through since we don't have direct access to setPrompt
          if (imageToVideo.onGenerate) {
            // We'll just update in the parent component when generating
          }
        }}
        previewUrl={imageToVideo.previewUrl}
        onFileSelect={imageToVideo.onFileSelect}
        onClearFile={imageToVideo.onClearFile}
        onSelectFromHistory={imageToVideo.onSelectFromHistory || ((jobId, imageUrl) => {})}
        onGenerate={imageToVideo.onGenerate}
        isGenerating={imageToVideo.isGenerating}
        creditsRemaining={imageToVideo.creditsRemaining}
        aspectRatio={imageToVideo.aspectRatio}
        onAspectRatioChange={(newAspectRatio) => {
          // This is a pass-through since we don't have direct access to setAspectRatio
          if (imageToVideo.onGenerate) {
            // We'll just update in the parent component when generating
          }
        }}
        messages={messages}
      />
      {renderGenerateButton()}
    </div>
  );
};
