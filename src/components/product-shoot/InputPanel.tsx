
import { ImageUploader } from "./ImageUploader";
import { PromptInput } from "./input-panel/PromptInput";
import { ImageSizeSelector } from "./input-panel/ImageSizeSelector";
import { RangeSlider } from "./input-panel/RangeSlider";
import { OutputFormatSelector } from "./input-panel/OutputFormatSelector";
import { GenerateButton } from "./input-panel/GenerateButton";
import { Header } from "./input-panel/Header";
import { Message } from "@/types/message";
import { ImageSize } from "@/hooks/use-product-shot-v1";
import { Button } from "@/components/ui/button";
import { VideoIcon } from "lucide-react";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface InputPanelProps {
  onGenerate: () => void;
  isMobile?: boolean;
  prompt?: string;
  previewUrl?: string | null;
  imageSize?: ImageSize;
  inferenceSteps?: number;
  guidanceScale?: number;
  outputFormat?: string;
  creditsRemaining?: number;
  isGenerating?: boolean;
  onPromptChange?: (value: string) => void;
  onFileSelect?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFile?: () => void;
  onImageSizeChange?: (value: ImageSize) => void;
  onInferenceStepsChange?: (value: number) => void;
  onGuidanceScaleChange?: (value: number) => void;
  onOutputFormatChange?: (value: string) => void;
  messages?: Message[];
  onVideoTemplatesClick?: () => void;
}

export const InputPanel = ({ onGenerate, ...props }: InputPanelProps) => {
  const defaultIsMobile = useIsMobile();
  const isMobile = props.isMobile ?? defaultIsMobile;
  const [prompt, setPrompt] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Handle file selection if not provided by props
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (props.onFileSelect) {
      props.onFileSelect(e);
      return;
    }
    
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };
  
  // Handle clearing file if not provided by props
  const handleClearFile = () => {
    if (props.onClearFile) {
      props.onClearFile();
      return;
    }
    
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };
  
  // Use props values or defaults
  const currentPrompt = props.prompt ?? prompt;
  const currentPreviewUrl = props.previewUrl ?? previewUrl;
  const currentImageSize = props.imageSize ?? "768x768";
  const currentInferenceSteps = props.inferenceSteps ?? 30;
  const currentGuidanceScale = props.guidanceScale ?? 7.5;
  const currentOutputFormat = props.outputFormat ?? "PNG";
  const currentCreditsRemaining = props.creditsRemaining ?? 0;
  const currentIsGenerating = props.isGenerating ?? false;
  const currentMessages = props.messages ?? [];
  
  // Handle prompt change if not provided by props
  const handlePromptChange = (value: string) => {
    if (props.onPromptChange) {
      props.onPromptChange(value);
      return;
    }
    
    setPrompt(value);
  };
  
  return (
    <div className="space-y-6 p-4">
      {!isMobile && <Header creditsRemaining={currentCreditsRemaining} />}

      <div className="space-y-4">
        <ImageUploader
          previewUrl={currentPreviewUrl}
          onFileSelect={handleFileSelect}
          onClear={handleClearFile}
        />

        <PromptInput 
          prompt={currentPrompt}
          onPromptChange={handlePromptChange}
          messages={currentMessages}
        />

        <div className="space-y-4">
          <ImageSizeSelector 
            imageSize={currentImageSize}
            onImageSizeChange={props.onImageSizeChange || (() => {})}
          />

          <RangeSlider
            label="Inference Steps"
            value={currentInferenceSteps}
            min={1}
            max={20}
            onChange={props.onInferenceStepsChange || (() => {})}
            description="Higher values = more detailed results"
          />

          <RangeSlider
            label="Guidance Scale"
            value={currentGuidanceScale}
            min={1}
            max={7}
            step={0.1}
            onChange={props.onGuidanceScaleChange || (() => {})}
            description="Controls prompt adherence"
          />

          <OutputFormatSelector
            outputFormat={currentOutputFormat}
            onOutputFormatChange={props.onOutputFormatChange || (() => {})}
          />
        </div>

        <div className="space-y-3">
          <GenerateButton
            isGenerating={currentIsGenerating}
            disabled={currentIsGenerating || !currentPrompt?.trim() || !currentPreviewUrl}
            onClick={onGenerate}
          />

          {currentPreviewUrl && props.onVideoTemplatesClick && (
            <Button
              variant="outline"
              onClick={props.onVideoTemplatesClick}
              className="w-full flex items-center justify-center py-2 text-sm bg-gray-800 hover:bg-gray-700 text-white border-gray-700"
            >
              <VideoIcon className="mr-2 h-4 w-4" />
              Create Video with Templates
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
