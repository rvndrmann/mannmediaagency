import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ProductShotFormData } from "@/types/product-shoot";
import { ImageUploader } from "@/components/product-shoot/ImageUploader";
import { toast } from "sonner";

interface ProductShotFormProps {
  onSubmit: (data: ProductShotFormData) => void;
  isGenerating: boolean;
  isSubmitting?: boolean;
  availableCredits?: number;
}

export function ProductShotForm({ onSubmit, isGenerating, isSubmitting, availableCredits = 0 }: ProductShotFormProps) {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [sceneDescription, setSceneDescription] = useState("");
  const [generationType, setGenerationType] = useState<"description" | "reference">("description");
  const [placementType, setPlacementType] = useState<"original" | "automatic" | "manual_placement" | "manual_padding">("original");
  const [manualPlacement, setManualPlacement] = useState("");
  const [optimizeDescription, setOptimizeDescription] = useState(true);
  const [numResults, setNumResults] = useState(1);
  const [fastMode, setFastMode] = useState(false);
  const [originalQuality, setOriginalQuality] = useState(true);
  const [shotWidth, setShotWidth] = useState(1024);
  const [shotHeight, setShotHeight] = useState(1024);
  const [padding, setPadding] = useState({
    left: 0,
    right: 0,
    top: 0,
    bottom: 0
  });

  const calculateCreditCost = () => {
    return numResults * 0.2;
  };

  const hasEnoughCredits = () => {
    const requiredCredits = calculateCreditCost();
    return availableCredits >= requiredCredits;
  };

  const handleSourceFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSourceFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSourcePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReferenceFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setReferenceFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferencePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearSource = () => {
    setSourceFile(null);
    setSourcePreview(null);
  };

  const handleClearReference = () => {
    setReferenceFile(null);
    setReferencePreview(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isGenerating || isSubmitting) {
      return;
    }
    
    if (!sourceFile) {
      toast.error("Please select a source image");
      return;
    }

    if (!hasEnoughCredits()) {
      toast.error(`Insufficient credits. You need ${calculateCreditCost()} credits for this generation.`);
      return;
    }

    if (generationType === "description" && !sceneDescription) {
      toast.error("Please provide a scene description");
      return;
    }

    if (generationType === "reference" && !referenceFile) {
      toast.error("Please select a reference image");
      return;
    }

    const formData: ProductShotFormData = {
      sourceFile,
      referenceFile,
      sceneDescription,
      generationType,
      placementType,
      manualPlacement,
      optimizeDescription,
      numResults,
      fastMode,
      originalQuality,
      shotWidth,
      shotHeight,
      syncMode: false,
      padding
    };

    onSubmit(formData);
  };

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
              onCheckedChange={(checked) => setOptimizeDescription(checked)}
            />
          </div>

          <div className="mt-4">
            <Label htmlFor="numResults" className="text-white">Number of Results</Label>
            <Slider
              id="numResults"
              defaultValue={[numResults]}
              max={4}
              min={1}
              step={1}
              onValueChange={(value) => setNumResults(value[0])}
            />
            <p className="text-sm text-gray-400 mt-1">Selected: {numResults}</p>
          </div>

          <div className="flex items-center justify-between mt-4">
            <Label htmlFor="fastMode" className="text-white">Fast Mode</Label>
            <Switch
              id="fastMode"
              checked={fastMode}
              onCheckedChange={(checked) => setFastMode(checked)}
            />
          </div>

          <div className="flex items-center justify-between mt-4">
            <Label htmlFor="originalQuality" className="text-white">Original Quality</Label>
            <Switch
              id="originalQuality"
              checked={originalQuality}
              onCheckedChange={(checked) => setOriginalQuality(checked)}
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

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isGenerating || isSubmitting || !hasEnoughCredits()}
          >
            {isGenerating || isSubmitting ? (
              "Generating..."
            ) : (
              <>
                Generate ({calculateCreditCost()} credits)
                {availableCredits < calculateCreditCost() && (
                  <span className="ml-2 text-xs text-red-400">
                    (Insufficient credits)
                  </span>
                )}
              </>
            )}
          </Button>
        </div>
      </Card>
    </form>
  );
}
