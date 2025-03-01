import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUploader } from "@/components/product-shoot/ImageUploader";
import { useProductShotForm } from "./hooks/useProductShotForm";
import { GenerateButton } from "./components/GenerateButton";
import { AspectRatio } from "@/types/product-shoot";
import { useEffect } from "react";
import { UseAIResponseButton } from "@/components/ai-agent/features/UseAIResponseButton";
import { Message } from "@/types/message";

export interface ProductShotFormProps {
  onSubmit: (formData: any) => Promise<void> | void;
  isGenerating: boolean;
  isSubmitting: boolean;
  availableCredits: number | undefined;
  initialSceneDescription?: string;
  messages: Message[];
}

export function ProductShotForm({ 
  onSubmit, 
  isGenerating, 
  isSubmitting, 
  availableCredits = 0, 
  initialSceneDescription,
  messages 
}: ProductShotFormProps) {
  const {
    sourcePreview,
    referencePreview,
    sceneDescription,
    generationType,
    placementType,
    manualPlacement,
    optimizeDescription,
    fastMode,
    originalQuality,
    aspectRatio,
    handleSourceFileSelect,
    handleReferenceFileSelect,
    handleClearSource,
    handleClearReference,
    handleSubmit,
    setSceneDescription,
    setGenerationType,
    setPlacementType,
    setManualPlacement,
    setOptimizeDescription,
    setFastMode,
    setOriginalQuality,
    handleAspectRatioChange
  } = useProductShotForm(onSubmit, isGenerating, isSubmitting, availableCredits);

  useEffect(() => {
    if (initialSceneDescription) {
      setSceneDescription(initialSceneDescription);
    }
  }, [initialSceneDescription, setSceneDescription]);

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <Card className="p-4 bg-gray-900 border-gray-800">
          <div className="space-y-4">
            <ImageUploader
              previewUrl={sourcePreview}
              onFileSelect={handleSourceFileSelect}
              onClear={handleClearSource}
            />
            
            {generationType === "reference" && (
              <div className="mt-4">
                <Label className="text-white">Reference Image</Label>
                <ImageUploader
                  previewUrl={referencePreview}
                  onFileSelect={handleReferenceFileSelect}
                  onClear={handleClearReference}
                />
              </div>
            )}

            <div className="mt-4">
              <Label htmlFor="sceneDescription" className="text-white">Scene Description</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Textarea
                    id="sceneDescription"
                    placeholder="A futuristic product shot with neon lights"
                    value={sceneDescription}
                    onChange={(e) => setSceneDescription(e.target.value)}
                    disabled={generationType !== "description"}
                  />
                </div>
                <UseAIResponseButton
                  messages={messages}
                  onUseResponse={setSceneDescription}
                  variant="compact"
                  className="shrink-0"
                />
              </div>
            </div>

            <div className="mt-4">
              <Label htmlFor="aspectRatio" className="text-white">Aspect Ratio</Label>
              <Select value={aspectRatio} onValueChange={(value: AspectRatio) => handleAspectRatioChange(value)}>
                <SelectTrigger id="aspectRatio">
                  <SelectValue placeholder="Select aspect ratio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                  <SelectItem value="9:16">9:16 (Reels/Stories)</SelectItem>
                  <SelectItem value="1:1">1:1 (Square)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-400 mt-1">
                {aspectRatio === "16:9" && "1920×1080 - Best for landscape videos"}
                {aspectRatio === "9:16" && "1080×1920 - Best for reels and stories"}
                {aspectRatio === "1:1" && "1024×1024 - Perfect square format"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="generationType" className="text-white">Generation Type</Label>
                <select
                  id="generationType"
                  className="w-full bg-gray-800 text-white rounded-md p-2"
                  value={generationType}
                  onChange={(e) => setGenerationType(e.target.value as "description" | "reference")}
                >
                  <option value="description">Description</option>
                  <option value="reference">Reference Image</option>
                </select>
              </div>

              <div>
                <Label htmlFor="placementType" className="text-white">Placement Type</Label>
                <select
                  id="placementType"
                  className="w-full bg-gray-800 text-white rounded-md p-2"
                  value={placementType}
                  onChange={(e) => setPlacementType(e.target.value as "original" | "automatic" | "manual_placement" | "manual_padding")}
                >
                  <option value="original">Original</option>
                  <option value="automatic">Automatic</option>
                  <option value="manual_placement">Manual Placement</option>
                  <option value="manual_padding">Manual Padding</option>
                </select>
              </div>
            </div>

            {placementType === "manual_placement" && (
              <div className="mt-4">
                <Label htmlFor="manualPlacement" className="text-white">Manual Placement</Label>
                <Input
                  type="text"
                  id="manualPlacement"
                  placeholder="X, Y coordinates"
                  value={manualPlacement}
                  onChange={(e) => setManualPlacement(e.target.value)}
                />
              </div>
            )}

            <div className="flex items-center justify-between mt-4">
              <Label htmlFor="optimizeDescription" className="text-white">Optimize Description</Label>
              <Switch
                id="optimizeDescription"
                checked={optimizeDescription}
                onCheckedChange={setOptimizeDescription}
              />
            </div>

            <div className="flex items-center justify-between mt-4">
              <Label htmlFor="fastMode" className="text-white">Fast Mode</Label>
              <Switch
                id="fastMode"
                checked={fastMode}
                onCheckedChange={setFastMode}
              />
            </div>

            <div className="flex items-center justify-between mt-4">
              <Label htmlFor="originalQuality" className="text-white">Original Quality</Label>
              <Switch
                id="originalQuality"
                checked={originalQuality}
                onCheckedChange={setOriginalQuality}
              />
            </div>

            <div className="pt-6">
              <GenerateButton
                numResults={1}
                availableCredits={availableCredits}
                isGenerating={isGenerating}
                isSubmitting={isSubmitting}
              />
            </div>
          </div>
        </Card>
      </div>
    </form>
  );
}
