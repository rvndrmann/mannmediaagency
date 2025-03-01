
import { InputPanel as ImageToVideoInputPanel } from "@/components/image-to-video/InputPanel";
import { GenerateButton } from "./GenerateButton";
import { Video } from "lucide-react";
import { Message } from "@/types/message";
import { ImageToVideoProps } from "../types";

interface ImageToVideoPanelProps {
  imageToVideo: ImageToVideoProps;
  messages: Message[];
}

export const ImageToVideoPanel = ({ imageToVideo, messages }: ImageToVideoPanelProps) => {
  const showGenerateButton = () => {
    // Always show the button, but disable it if conditions aren't met
    const isDisabled = !imageToVideo.prompt || !imageToVideo.previewUrl || imageToVideo.isGenerating;
    
    return (
      <GenerateButton 
        onClick={() => imageToVideo.onGenerate(imageToVideo.prompt, imageToVideo.aspectRatio)}
        disabled={isDisabled}
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
          // Forward prompt changes to parent
          imageToVideo.onPromptChange?.(newPrompt);
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
          // Forward aspect ratio changes to parent
          imageToVideo.onAspectRatioChange?.(newAspectRatio);
        }}
        messages={messages}
      />
      {showGenerateButton()}
    </div>
  );
};
