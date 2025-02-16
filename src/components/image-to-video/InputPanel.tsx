
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { ImageUploader } from "./ImageUploader";
import { Video, Loader2, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface InputPanelProps {
  isMobile: boolean;
  prompt: string;
  onPromptChange: (value: string) => void;
  previewUrl: string | null;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
  inferenceSteps: number;
  onInferenceStepsChange: (value: number) => void;
  guidanceScale: number;
  onGuidanceScaleChange: (value: number) => void;
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
  inferenceSteps,
  onInferenceStepsChange,
  guidanceScale,
  onGuidanceScaleChange,
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
            <h1 className="text-2xl font-bold text-white mb-2">Image to Video Generator</h1>
            <p className="text-gray-400">
              Credits remaining: {creditsRemaining?.toFixed(2) || "0.00"}
            </p>
          </div>
        )}

        <ImageUploader
          previewUrl={previewUrl}
          onFileSelect={onFileSelect}
          onClear={onClearFile}
          aspectRatio={768/512}
          helpText="Upload an image (768x512 recommended)"
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

        <Collapsible>
          <CollapsibleTrigger className="text-sm text-purple-400 hover:text-purple-300">
            Show prompt writing guide
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 text-sm text-gray-400 space-y-2">
            <p>For best results, include:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Main action in a single sentence</li>
              <li>Specific movements and gestures</li>
              <li>Character/object appearances</li>
              <li>Background and environment</li>
              <li>Camera angles and movements</li>
              <li>Lighting and colors</li>
            </ul>
          </CollapsibleContent>
        </Collapsible>

        <div className="space-y-2">
          <Label className="text-white">Inference Steps: {inferenceSteps}</Label>
          <Slider
            value={[inferenceSteps]}
            onValueChange={(value) => onInferenceStepsChange(value[0])}
            min={20}
            max={50}
            step={1}
            className="w-full"
          />
          <p className="text-xs text-gray-400">More steps (40+) for quality, fewer steps (20-30) for speed</p>
        </div>

        <div className="space-y-2">
          <Label className="text-white">Guidance Scale: {guidanceScale}</Label>
          <Slider
            value={[guidanceScale]}
            onValueChange={(value) => onGuidanceScaleChange(value[0])}
            min={3}
            max={7}
            step={0.1}
            className="w-full"
          />
          <p className="text-xs text-gray-400">Higher (5-7) for accuracy, lower (3-5) for creativity</p>
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
              Generate Video (1 credit)
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
