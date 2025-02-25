
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageSelector } from "./ImageSelector";
import { Video, Loader2, CreditCard } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";

interface InputPanelProps {
  isMobile: boolean;
  prompt: string;
  onPromptChange: (value: string) => void;
  previewUrl: string | null;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
  onSelectFromHistory: (jobId: string, imageUrl: string) => void;
  onGenerate: (prompt: string, aspectRatio: string) => void;
  isGenerating: boolean;
  creditsRemaining: number | null;
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
  aspectRatio,
  onAspectRatioChange,
}: InputPanelProps) {
  return (
    <div className="flex flex-col h-full bg-[#1A1F2C] border-r border-gray-800">
      <ScrollArea className="flex-1 pb-32 md:pb-24">
        <div className="p-6 space-y-6">
          {!isMobile && (
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-white">Image to Video Generator</h1>
              <p className="text-sm text-gray-400">
                Credits remaining: {creditsRemaining?.toFixed(2) || "0.00"}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <ImageSelector
              previewUrl={previewUrl}
              onFileSelect={onFileSelect}
              onClear={onClearFile}
              onSelectFromHistory={onSelectFromHistory}
              aspectRatio={aspectRatio === "16:9" ? 16/9 : aspectRatio === "9:16" ? 9/16 : 1}
              helpText={`Upload an image (${aspectRatio} aspect ratio)`}
            />

            <div className="space-y-2">
              <Label className="text-white">Aspect Ratio</Label>
              <Select value={aspectRatio} onValueChange={onAspectRatioChange}>
                <SelectTrigger className="w-full bg-gray-900 border-gray-700 text-white">
                  <SelectValue placeholder="Select aspect ratio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                  <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                  <SelectItem value="1:1">1:1 (Square)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-white">Animation Prompt</Label>
              <Textarea
                placeholder="Describe how you want the image to animate..."
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value)}
                className="min-h-[120px] bg-gray-900 border-gray-700 text-white resize-none"
              />
            </div>

            <Collapsible>
              <CollapsibleTrigger className="text-sm text-purple-400 hover:text-purple-300">
                Show prompt writing guide
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="rounded-lg bg-gray-900/50 p-4 text-sm text-gray-400 space-y-2">
                  <p>For best results, include:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Main action or movement you want to see</li>
                    <li>Character/object movements and gestures</li>
                    <li>Camera movements (if desired)</li>
                    <li>Environment and atmosphere changes</li>
                    <li>Lighting and mood descriptions</li>
                  </ul>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </ScrollArea>

      <div className="fixed bottom-0 left-0 right-0 p-4 pb-20 md:pb-4 bg-[#1A1F2C]/95 backdrop-blur-xl border-t border-gray-800 z-[60] lg:sticky">
        <Button
          onClick={() => onGenerate(prompt, aspectRatio)}
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
