
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
  onVideoTemplatesClick?: () => void;
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
  onVideoTemplatesClick,
}: InputPanelProps) => {
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
            onImageSizeChange={onImageSizeChange}
          />

          <RangeSlider
            label="Inference Steps"
            value={inferenceSteps}
            min={1}
            max={20}
            onChange={onInferenceStepsChange}
            description="Higher values = more detailed results"
          />

          <RangeSlider
            label="Guidance Scale"
            value={guidanceScale}
            min={1}
            max={7}
            step={0.1}
            onChange={onGuidanceScaleChange}
            description="Controls prompt adherence"
          />

          <OutputFormatSelector
            outputFormat={outputFormat}
            onOutputFormatChange={onOutputFormatChange}
          />
        </div>

        <div className="space-y-3">
          <GenerateButton
            isGenerating={isGenerating}
            disabled={isGenerating || !prompt.trim() || !previewUrl}
            onClick={onGenerate}
          />

          {previewUrl && onVideoTemplatesClick && (
            <Button
              variant="outline"
              onClick={onVideoTemplatesClick}
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
