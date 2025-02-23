
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
      "bg-[#1a1a1a] space-y-6 p-6",
      isMobile ? "w-full border-b border-gray-800" : "w-1/3 border-r border-gray-800 h-screen overflow-y-auto"
    )}>
      <div className="space-y-6">
        {!isMobile && (
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">Product Shot V1</h1>
            <div className="flex items-center space-x-2 text-gray-400">
              <CreditCard className="w-4 h-4" />
              <span>Credits remaining: {creditsRemaining?.toFixed(2) || "0.00"}</span>
            </div>
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
            className="min-h-[100px] bg-[#2a2a2a] border-gray-700 text-white focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-white">Image Size</Label>
          <Select value={imageSize} onValueChange={onImageSizeChange}>
            <SelectTrigger className="bg-[#2a2a2a] border-gray-700 text-white">
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent className="bg-[#2a2a2a] border-gray-700">
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
            className="w-full bg-purple-500/20 h-2 rounded-lg appearance-none cursor-pointer accent-purple-500"
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
            className="w-full bg-purple-500/20 h-2 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-white">Output Format</Label>
          <Select value={outputFormat} onValueChange={onOutputFormatChange}>
            <SelectTrigger className="bg-[#2a2a2a] border-gray-700 text-white">
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent className="bg-[#2a2a2a] border-gray-700">
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
              Generate Image (0.2 credits)
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
