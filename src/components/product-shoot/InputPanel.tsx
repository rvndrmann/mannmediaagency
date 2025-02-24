
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "./ImageUploader";
import { Video, Loader2, CreditCard } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

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
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 pr-4">
        <div className="p-6 space-y-6">
          {!isMobile && (
            <div className="flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-transparent p-4 rounded-lg mb-6">
              <h2 className="text-lg font-semibold text-white">Product Shot</h2>
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
                <CreditCard className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-white">{creditsRemaining?.toFixed(2) || "0.00"} Credits</span>
              </div>
            </div>
          )}

          <div className="space-y-6 bg-white/5 rounded-lg p-6 backdrop-blur-sm border border-white/10">
            <ImageUploader
              previewUrl={previewUrl}
              onFileSelect={onFileSelect}
              onClear={onClearFile}
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-white">Scene Description</Label>
              <Textarea
                placeholder="Describe the product image you want to generate..."
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value)}
                className="min-h-[120px] resize-none bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-1 focus-visible:ring-purple-500/50 focus-visible:border-purple-500/50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-white">Image Size</Label>
              <Select value={imageSize} onValueChange={onImageSizeChange}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1F2C] border-white/10">
                  <SelectItem value="square_hd" className="text-white">Square HD</SelectItem>
                  <SelectItem value="square" className="text-white">Square</SelectItem>
                  <SelectItem value="portrait_4_3" className="text-white">Portrait 4:3</SelectItem>
                  <SelectItem value="portrait_16_9" className="text-white">Portrait 16:9</SelectItem>
                  <SelectItem value="landscape_4_3" className="text-white">Landscape 4:3</SelectItem>
                  <SelectItem value="landscape_16_9" className="text-white">Landscape 16:9</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4 rounded-lg bg-white/5 p-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm font-medium text-white">Inference Steps</Label>
                  <span className="text-sm text-purple-400 font-medium">{inferenceSteps}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={inferenceSteps}
                  onChange={(e) => onInferenceStepsChange(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
                <p className="text-xs text-white/60">Higher values produce more detailed results but take longer</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm font-medium text-white">Guidance Scale</Label>
                  <span className="text-sm text-purple-400 font-medium">{guidanceScale}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="7"
                  step="0.1"
                  value={guidanceScale}
                  onChange={(e) => onGuidanceScaleChange(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
                <p className="text-xs text-white/60">Controls how closely the result follows your prompt</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-white">Output Format</Label>
              <Select value={outputFormat} onValueChange={onOutputFormatChange}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1F2C] border-white/10">
                  <SelectItem value="png" className="text-white">PNG</SelectItem>
                  <SelectItem value="jpg" className="text-white">JPG</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </ScrollArea>
      
      <div className="p-6 bg-[#1A1F2C]/80 backdrop-blur-lg border-t border-white/10">
        <Button
          onClick={onGenerate}
          disabled={isGenerating || !prompt.trim() || !previewUrl}
          className={cn(
            "w-full h-12 text-base font-medium transition-all duration-200",
            "bg-gradient-to-r from-purple-600 to-purple-500",
            "hover:from-purple-500 hover:to-purple-400",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Video className="mr-2 h-5 w-5" />
              Generate Image (0.2 credits)
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
