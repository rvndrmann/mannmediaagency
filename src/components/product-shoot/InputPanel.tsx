
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "./ImageUploader";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UseAIResponseButton } from "@/components/ai-agent/features/UseAIResponseButton";
import { Message } from "@/types/message";
import { ImageSize } from "@/hooks/use-product-shot-v1";

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
  // Define the image size options with correct values and labels
  const imageSizeOptions = [
    { value: "square_hd", label: "Square HD (1024×1024)" },
    { value: "square", label: "Square (512×512)" },
    { value: "portrait_4_3", label: "Portrait 4:3 (768×1024)" },
    { value: "portrait_16_9", label: "Portrait 16:9 (576×1024)" },
    { value: "landscape_4_3", label: "Landscape 4:3 (1024×768)" },
    { value: "landscape_16_9", label: "Landscape 16:9 (1024×576)" },
  ];

  return (
    <div className="space-y-6">
      {!isMobile && (
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-white">Product Shot Generator</h2>
          <p className="text-sm text-gray-400">
            Credits remaining: {creditsRemaining.toFixed(2)}
          </p>
        </div>
      )}

      <div className="space-y-4">
        <ImageUploader
          previewUrl={previewUrl}
          onFileSelect={onFileSelect}
          onClear={onClearFile}
        />

        <div className="space-y-2">
          <Label htmlFor="prompt" className="text-white">Prompt</Label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Textarea
                id="prompt"
                placeholder="Describe your product shot..."
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value)}
                className="min-h-[100px] bg-gray-900 border-gray-700 text-white resize-none"
              />
            </div>
            <UseAIResponseButton
              messages={messages}
              onUseResponse={onPromptChange}
              variant="compact"
              className="shrink-0"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="imageSize" className="text-white">Image Size</Label>
            <Select 
              value={imageSize} 
              onValueChange={(value) => onImageSizeChange(value as ImageSize)}
            >
              <SelectTrigger id="imageSize" className="w-full bg-gray-900 border-gray-700 text-white">
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1F2C] border-gray-700 text-white">
                {imageSizeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-white hover:bg-gray-800">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-white">
              Inference Steps: <span className="text-purple-400">{inferenceSteps}</span>
            </Label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="1"
                max="20"
                value={inferenceSteps}
                onChange={(e) => onInferenceStepsChange(Number(e.target.value))}
                className="w-full accent-purple-500"
              />
              <span className="text-sm font-medium text-white min-w-[30px] text-center">
                {inferenceSteps}
              </span>
            </div>
            <p className="text-xs text-white/60">Higher values produce more detailed results but take longer</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-white">
              Guidance Scale: <span className="text-purple-400">{guidanceScale.toFixed(1)}</span>
            </Label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="1"
                max="7"
                step="0.1"
                value={guidanceScale}
                onChange={(e) => onGuidanceScaleChange(Number(e.target.value))}
                className="w-full accent-purple-500"
              />
              <span className="text-sm font-medium text-white min-w-[30px] text-center">
                {guidanceScale.toFixed(1)}
              </span>
            </div>
            <p className="text-xs text-white/60">Controls how closely the result follows your prompt</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-white">Output Format</Label>
            <Select value={outputFormat} onValueChange={onOutputFormatChange}>
              <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1F2C] border-gray-700 text-white">
                <SelectItem value="png" className="text-white hover:bg-gray-800">PNG</SelectItem>
                <SelectItem value="jpg" className="text-white hover:bg-gray-800">JPG</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={onGenerate}
          disabled={isGenerating || !prompt.trim() || !previewUrl}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate Image (0.2 credits)"
          )}
        </Button>
      </div>
    </div>
  );
};
