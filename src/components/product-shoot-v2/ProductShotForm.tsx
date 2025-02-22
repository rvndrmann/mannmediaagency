
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ImageUploader } from "@/components/product-shoot/ImageUploader";
import { ProductShotFormProps } from "./types";
import { useProductShotForm } from "./hooks/useProductShotForm";
import { GenerateButton } from "./components/GenerateButton";

export function ProductShotForm({ onSubmit, isGenerating, isSubmitting, availableCredits = 0 }: ProductShotFormProps) {
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
    shotWidth,
    shotHeight,
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
    setShotWidth,
    setShotHeight
  } = useProductShotForm(onSubmit, isGenerating, isSubmitting, availableCredits);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
            <Textarea
              id="sceneDescription"
              placeholder="A futuristic product shot with neon lights"
              value={sceneDescription}
              onChange={(e) => setSceneDescription(e.target.value)}
              disabled={generationType !== "description"}
            />
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <Label htmlFor="shotWidth" className="text-white">Shot Width</Label>
              <Input
                type="number"
                id="shotWidth"
                value={shotWidth}
                onChange={(e) => setShotWidth(Number(e.target.value))}
              />
            </div>

            <div>
              <Label htmlFor="shotHeight" className="text-white">Shot Height</Label>
              <Input
                type="number"
                id="shotHeight"
                value={shotHeight}
                onChange={(e) => setShotHeight(Number(e.target.value))}
              />
            </div>
          </div>

          <GenerateButton
            numResults={1}
            availableCredits={availableCredits}
            isGenerating={isGenerating}
            isSubmitting={isSubmitting}
          />
        </div>
      </Card>
    </form>
  );
}
