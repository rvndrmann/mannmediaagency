
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUploader } from "@/components/product-shoot/ImageUploader";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GenerateButton } from "@/components/product-shoot/input-panel/GenerateButton";
import { ProductShotFormData, AspectRatio } from "@/types/product-shoot";
import { toast } from "sonner";
import { useProductShoot } from "@/hooks/use-product-shoot";

export function ProductShotGenerator() {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [sceneDescription, setSceneDescription] = useState("");
  const [generationType, setGenerationType] = useState<"description" | "reference">("description");
  const [placementType, setPlacementType] = useState<"original" | "automatic" | "manual_placement" | "manual_padding">("original");
  const [optimizeDescription, setOptimizeDescription] = useState(true);
  const [fastMode, setFastMode] = useState(false);
  const [originalQuality, setOriginalQuality] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");

  const { isGenerating, isSubmitting, handleGenerate } = useProductShoot();

  const handleSourceFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSourceFile(file);
      const imageUrl = URL.createObjectURL(file);
      setSourcePreview(imageUrl);
    }
  };

  const handleReferenceFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setReferenceFile(file);
      const imageUrl = URL.createObjectURL(file);
      setReferencePreview(imageUrl);
    }
  };

  const handleClearSource = () => {
    if (sourcePreview) {
      URL.revokeObjectURL(sourcePreview);
    }
    setSourceFile(null);
    setSourcePreview(null);
  };

  const handleClearReference = () => {
    if (referencePreview) {
      URL.revokeObjectURL(referencePreview);
    }
    setReferenceFile(null);
    setReferencePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sourceFile) {
      toast.error("Please upload a product image");
      return;
    }

    if (generationType === "reference" && !referenceFile) {
      toast.error("Please upload a reference image");
      return;
    }

    if (generationType === "description" && !sceneDescription.trim()) {
      toast.error("Please enter a scene description");
      return;
    }

    const formData: ProductShotFormData = {
      sourceFile,
      referenceFile: generationType === "reference" ? referenceFile : null,
      sceneDescription: generationType === "description" ? sceneDescription : undefined,
      generationType,
      placementType,
      optimizeDescription,
      fastMode,
      originalQuality,
      aspectRatio
    };

    await handleGenerate(formData);
  };

  return (
    <Card className="p-6 bg-gray-900 border-gray-800">
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white">Product Shot Generator</h2>
          
          <div className="space-y-4">
            <Label className="text-white">Product Image</Label>
            <ImageUploader
              previewUrl={sourcePreview}
              onFileSelect={handleSourceFileChange}
              onClear={handleClearSource}
            />
          </div>

          <Tabs defaultValue="description" value={generationType} onValueChange={(value) => setGenerationType(value as "description" | "reference")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="description">Scene Description</TabsTrigger>
              <TabsTrigger value="reference">Reference Image</TabsTrigger>
            </TabsList>
            
            <TabsContent value="description" className="space-y-4">
              <div className="mt-4">
                <Label htmlFor="sceneDescription" className="text-white">Scene Description</Label>
                <Textarea
                  id="sceneDescription"
                  placeholder="Describe the scene for your product (e.g., futuristic environment with neon lights)"
                  value={sceneDescription}
                  onChange={(e) => setSceneDescription(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="reference" className="space-y-4">
              <div className="mt-4">
                <Label className="text-white">Reference Image</Label>
                <ImageUploader
                  previewUrl={referencePreview}
                  onFileSelect={handleReferenceFileChange}
                  onClear={handleClearReference}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-4">
            <div>
              <Label htmlFor="placementType" className="text-white">Placement Type</Label>
              <Select value={placementType} onValueChange={(value) => setPlacementType(value as any)}>
                <SelectTrigger id="placementType">
                  <SelectValue placeholder="Select placement type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">Original</SelectItem>
                  <SelectItem value="automatic">Automatic</SelectItem>
                  <SelectItem value="manual_placement">Manual Placement</SelectItem>
                  <SelectItem value="manual_padding">Manual Padding</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="aspectRatio" className="text-white">Aspect Ratio</Label>
              <Select value={aspectRatio} onValueChange={(value) => setAspectRatio(value as AspectRatio)}>
                <SelectTrigger id="aspectRatio">
                  <SelectValue placeholder="Select aspect ratio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                  <SelectItem value="9:16">9:16 (Reels/Stories)</SelectItem>
                  <SelectItem value="1:1">1:1 (Square)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="optimizeDescription" className="text-white">Optimize Description</Label>
              <Switch
                id="optimizeDescription"
                checked={optimizeDescription}
                onCheckedChange={setOptimizeDescription}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="fastMode" className="text-white">Fast Mode</Label>
              <Switch
                id="fastMode"
                checked={fastMode}
                onCheckedChange={setFastMode}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="originalQuality" className="text-white">Original Quality</Label>
              <Switch
                id="originalQuality"
                checked={originalQuality}
                onCheckedChange={setOriginalQuality}
              />
            </div>
          </div>

          <div className="pt-4">
            <GenerateButton
              isGenerating={isGenerating}
              disabled={(!sourceFile) || (generationType === "description" && !sceneDescription.trim()) || (generationType === "reference" && !referenceFile)}
              onClick={handleSubmit}
            />
          </div>
        </div>
      </form>
    </Card>
  );
}
