
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "./ImageUploader";
import { Video, Loader2, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  onGuidanceScale,
  outputFormat,
  onOutputFormatChange,
  onGenerate,
  isGenerating,
  creditsRemaining,
}: InputPanelProps) {
  return (
    <div className="relative h-full flex flex-col bg-[#1A1F2C]">
      <ScrollArea className="flex-1 px-6 pb-24">
        <div className="space-y-4 py-6">
          {!isMobile && (
            <div className="space-y-1.5">
              <h2 className="text-lg font-semibold text-white">Upload Image</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <CreditCard className="w-4 h-4" />
                <span>Credits: {creditsRemaining?.toFixed(2) || "0.00"}</span>
              </div>
            </div>
          )}

          <ImageUploader
            previewUrl={previewUrl}
            onFileSelect={onFileSelect}
            onClear={onClearFile}
          />

          <div className="space-y-1.5">
            <Label className="text-sm text-gray-200">Prompt</Label>
            <Textarea
              placeholder="Describe the product image you want to generate..."
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              className="min-h-[80px] resize-none bg-[#2A2A2A] border-[#3A3A3A] text-white placeholder:text-gray-500 focus-visible:ring-1 focus-visible:ring-purple-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm text-gray-200">Image Size</Label>
            <Select value={imageSize} onValueChange={onImageSizeChange}>
              <SelectTrigger className="bg-[#2A2A2A] border-[#3A3A3A] text-white">
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent className="bg-[#2A2A2A] border-[#3A3A3A]">
                <SelectItem value="square_hd">Square HD</SelectItem>
                <SelectItem value="square">Square</SelectItem>
                <SelectItem value="portrait_4_3">Portrait 4:3</SelectItem>
                <SelectItem value="portrait_16_9">Portrait 16:9</SelectItem>
                <SelectItem value="landscape_4_3">Landscape 4:3</SelectItem>
                <SelectItem value="landscape_16_9">Landscape 16:9</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label className="text-sm text-gray-200">Inference Steps</Label>
              <span className="text-sm text-gray-400">{inferenceSteps}</span>
            </div>
            <input
              type="range"
              min="1"
              max="20"
              value={inferenceSteps}
              onChange={(e) => onInferenceStepsChange(Number(e.target.value))}
              className="w-full bg-[#2A2A2A] h-1.5 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label className="text-sm text-gray-200">Guidance Scale</Label>
              <span className="text-sm text-gray-400">{guidanceScale}</span>
            </div>
            <input
              type="range"
              min="1"
              max="7"
              step="0.1"
              value={guidanceScale}
              onChange={(e) => onGuidanceScale(Number(e.target.value))}
              className="w-full bg-[#2A2A2A] h-1.5 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm text-gray-200">Output Format</Label>
            <Select value={outputFormat} onValueChange={onOutputFormatChange}>
              <SelectTrigger className="bg-[#2A2A2A] border-[#3A3A3A] text-white">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent className="bg-[#2A2A2A] border-[#3A3A3A]">
                <SelectItem value="png">PNG</SelectItem>
                <SelectItem value="jpg">JPG</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </ScrollArea>

      <div className="absolute bottom-0 left-0 right-0 p-6 bg-[#1A1F2C]/80 backdrop-blur-sm border-t border-gray-800">
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
