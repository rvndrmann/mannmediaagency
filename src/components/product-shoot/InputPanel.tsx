
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "./ImageUploader";
import { Video, Loader2, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InputPanelProps {
  isMobile: boolean;
  prompt: string;
  onPromptChange: (value: string) => void;
  previewUrl: string | null;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
  imageSize: string;
  onImageSizeChange: (value: string) => void;
  inferenceSteps: number;
  onInferenceStepsChange: (value: number) => void;
  guidanceScale: number;
  onGuidanceScaleChange: (value: number) => void;
  outputFormat: string;
  onOutputFormatChange: (value: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  creditsRemaining: number | null;
}

export function InputPanel({
  isMobile,
  prompt,
  onPromptChange,
  previewUrl,
  onFileSelect,
  onClearFile,
  imageSize,
  onImageSizeChange,
  inferenceSteps,
  onInferenceStepsChange,
  guidanceScale,
  onGuidanceScaleChange,
  outputFormat,
  onOutputFormatChange,
  onGenerate,
  isGenerating,
  creditsRemaining,
}: InputPanelProps) {
  return (
    <div className={cn(
      "space-y-6 p-6 border-r border-gray-800",
      isMobile ? "w-full border-r-0 border-b" : "w-1/3 overflow-y-auto"
    )}>
      <div className="space-y-6">
        {!isMobile && (
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Product Image Generator</h1>
            <p className="text-gray-400">
              Credits remaining: {creditsRemaining?.toFixed(2) || "0.00"}
            </p>
          </div>
        )}

        <ImageUploader
          previewUrl={previewUrl}
          onFileSelect={onFileSelect}
          onClear={onClearFile}
        />

        <div className="space-y-2">
          <Label className="text-white">Prompt</Label>
          <Textarea
            placeholder="Describe the product image you want to generate..."
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            className="min-h-[100px] bg-gray-900 border-gray-700 text-white"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-white">Image Size</Label>
          <Select value={imageSize} onValueChange={onImageSizeChange}>
            <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="square_hd">Square HD</SelectItem>
              <SelectItem value="square">Square</SelectItem>
              <SelectItem value="portrait_4_3">Portrait 4:3</SelectItem>
              <SelectItem value="portrait_16_9">Portrait 16:9</SelectItem>
              <SelectItem value="landscape_4_3">Landscape 4:3</SelectItem>
              <SelectItem value="landscape_16_9">Landscape 16:9</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-white">Inference Steps: {inferenceSteps}</Label>
          <input
            type="range"
            min="1"
            max="20"
            value={inferenceSteps}
            onChange={(e) => onInferenceStepsChange(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-white">Guidance Scale: {guidanceScale}</Label>
          <input
            type="range"
            min="1"
            max="7"
            step="0.1"
            value={guidanceScale}
            onChange={(e) => onGuidanceScaleChange(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-white">Output Format</Label>
          <Select value={outputFormat} onValueChange={onOutputFormatChange}>
            <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="png">PNG</SelectItem>
              <SelectItem value="jpg">JPG</SelectItem>
            </SelectContent>
          </Select>
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
            <>
              <Video className="mr-2 h-4 w-4" />
              <CreditCard className="mr-2 h-4 w-4" />
              Generate Image (0.2 credits)
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
