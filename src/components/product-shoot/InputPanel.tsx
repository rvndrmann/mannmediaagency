
import { ImageUploader } from "./ImageUploader";
import { PromptInput } from "./input-panel/PromptInput";
import { ImageSizeSelector } from "./input-panel/ImageSizeSelector";
import { RangeSlider } from "./input-panel/RangeSlider";
import { OutputFormatSelector } from "./input-panel/OutputFormatSelector";
import { GenerateButton } from "./input-panel/GenerateButton";
import { Header } from "./input-panel/Header";
import { Message } from "@/types/message";
import { ImageSize } from "@/hooks/use-product-shot-v1";
import { useEffect } from "react";

interface InputPanelProps {
  isMobile: boolean;
  prompt: string;
  previewUrl: string | null;
  imageSize: ImageSize;
  inferenceSteps: number;
  guidanceScale: number;
  outputFormat: string;
  creditsRemaining: number;
  isGenerating: boolean;
  onPromptChange: (value: string) => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
  onImageSizeChange: (value: ImageSize) => void;
  onInferenceStepsChange: (value: number) => void;
  onGuidanceScaleChange: (value: number) => void;
  onOutputFormatChange: (value: string) => void;
  onGenerate: () => void;
  messages: Message[];
}

export const InputPanel = ({
  isMobile,
  prompt,
  previewUrl,
  imageSize,
  inferenceSteps,
  guidanceScale,
  outputFormat,
  creditsRemaining,
  isGenerating,
  onPromptChange,
  onFileSelect,
  onClearFile,
  onImageSizeChange,
  onInferenceStepsChange,
  onGuidanceScaleChange,
  onOutputFormatChange,
  onGenerate,
  messages,
}: InputPanelProps) => {
  // Log when imageSize prop changes
  useEffect(() => {
    console.log("InputPanel received imageSize:", imageSize);
  }, [imageSize]);
  
  // Log when onImageSizeChange is called
  const handleImageSizeChange = (newSize: ImageSize) => {
    console.log("InputPanel handleImageSizeChange called with:", newSize);
    onImageSizeChange(newSize);
  };

  return (
    <div className="space-y-6">
      {!isMobile && <Header creditsRemaining={creditsRemaining} />}

      <div className="space-y-4">
        <ImageUploader
          previewUrl={previewUrl}
          onFileSelect={onFileSelect}
          onClear={onClearFile}
        />

        <PromptInput 
          prompt={prompt}
          onPromptChange={onPromptChange}
          messages={messages}
        />

        <div className="space-y-4">
          <ImageSizeSelector 
            imageSize={imageSize}
            onImageSizeChange={handleImageSizeChange}
          />

          <RangeSlider
            label="Inference Steps"
            value={inferenceSteps}
            min={1}
            max={20}
            onChange={onInferenceStepsChange}
            description="Higher values produce more detailed results but take longer"
          />

          <RangeSlider
            label="Guidance Scale"
            value={guidanceScale}
            min={1}
            max={7}
            step={0.1}
            onChange={onGuidanceScaleChange}
            description="Controls how closely the result follows your prompt"
          />

          <OutputFormatSelector
            outputFormat={outputFormat}
            onOutputFormatChange={onOutputFormatChange}
          />
        </div>

        <GenerateButton
          isGenerating={isGenerating}
          disabled={isGenerating || !prompt.trim() || !previewUrl}
          onClick={onGenerate}
          imageSize={imageSize}
        />
      </div>
    </div>
  );
};
