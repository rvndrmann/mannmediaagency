
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageSelector } from "./ImageSelector";
import { Video, Loader2, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  onSelectFromHistory: (jobId: string, imageUrl: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  creditsRemaining: number | null;
  duration: string;
  onDurationChange: (value: string) => void;
  aspectRatio: string;
  onAspectRatioChange: (value: string) => void;
}

export function InputPanel({
  isMobile,
  prompt,
  onPromptChange,
  previewUrl,
  onFileSelect,
  onClearFile,
  onSelectFromHistory,
  onGenerate,
  isGenerating,
  creditsRemaining,
  duration,
  onDurationChange,
  aspectRatio,
  onAspectRatioChange,
}: InputPanelProps) {
  return (
    <div className={cn(
      "space-y-6 p-6 border-r border-gray-800",
      isMobile ? "w-full border-r-0 border-b" : "w-1/3 overflow-y-auto"
    )}>
      <div className="space-y-6">
        {!isMobile && (
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Image to Video Generator</h1>
            <p className="text-gray-400">
              Credits remaining: {creditsRemaining?.toFixed(2) || "0.00"}
            </p>
          </div>
        )}

        <ImageSelector
          previewUrl={previewUrl}
          onFileSelect={onFileSelect}
          onClear={onClearFile}
          onSelectFromHistory={onSelectFromHistory}
          aspectRatio={aspectRatio === "16:9" ? 16/9 : aspectRatio === "9:16" ? 9/16 : 1}
          helpText="Upload an image (recommended aspect ratio)"
        />

        <div className="space-y-2">
          <Label className="text-white">Prompt</Label>
          <Textarea
            placeholder="Describe how you want the image to animate..."
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            className="min-h-[100px] bg-gray-900 border-gray-700 text-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-white">Duration</Label>
            <Select value={duration} onValueChange={onDurationChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 seconds</SelectItem>
                <SelectItem value="10">10 seconds</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Aspect Ratio</Label>
            <Select value={aspectRatio} onValueChange={onAspectRatioChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select aspect ratio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="16:9">16:9</SelectItem>
                <SelectItem value="9:16">9:16</SelectItem>
                <SelectItem value="1:1">1:1</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Collapsible>
          <CollapsibleTrigger className="text-sm text-purple-400 hover:text-purple-300">
            Show prompt writing guide
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 text-sm text-gray-400 space-y-2">
            <p>For best results, include:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Main action or movement you want to see</li>
              <li>Character/object movements and gestures</li>
              <li>Camera movements (if desired)</li>
              <li>Environment and atmosphere changes</li>
              <li>Lighting and mood descriptions</li>
            </ul>
          </CollapsibleContent>
        </Collapsible>

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
              Generate Video (1 credit)
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
