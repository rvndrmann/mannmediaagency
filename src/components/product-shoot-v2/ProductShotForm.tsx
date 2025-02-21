import { useState } from "react";
import { ImageUploader } from "./ImageUploader";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export type PlacementType = 'original' | 'automatic' | 'manual_placement' | 'manual_padding';
export type ManualPlacementSelection = 'upper_left' | 'upper_right' | 'bottom_left' | 'bottom_right' | 'right_center' | 'left_center' | 'upper_center' | 'bottom_center' | 'center_vertical' | 'center_horizontal';

interface ProductShotFormProps {
  onSubmit: (formData: ProductShotFormData) => Promise<void>;
  isGenerating: boolean;
}

export interface ProductShotFormData {
  sourceFile: File | null;
  referenceFile: File | null;
  sceneDescription: string;
  generationType: 'description' | 'reference';
  placementType: PlacementType;
  manualPlacement: ManualPlacementSelection;
  optimizeDescription: boolean;
  numResults: number;
  fastMode: boolean;
  originalQuality: boolean;
  shotWidth: number;
  shotHeight: number;
  syncMode: boolean;
  padding: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
}

export function ProductShotForm({ onSubmit, isGenerating }: ProductShotFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreviewUrl, setReferencePreviewUrl] = useState<string | null>(null);
  const [sceneDescription, setSceneDescription] = useState("");
  const [placementType, setPlacementType] = useState<PlacementType>("manual_placement");
  const [manualPlacement, setManualPlacement] = useState<ManualPlacementSelection>("bottom_center");
  const [generationType, setGenerationType] = useState<'description' | 'reference'>('description');
  const [optimizeDescription, setOptimizeDescription] = useState(true);
  const [numResults, setNumResults] = useState(1);
  const [fastMode, setFastMode] = useState(true);
  const [originalQuality, setOriginalQuality] = useState(false);
  const [shotWidth, setShotWidth] = useState(1000);
  const [shotHeight, setShotHeight] = useState(1000);
  const [syncMode, setSyncMode] = useState(true);
  const [padding, setPadding] = useState({
    left: 0,
    right: 0,
    top: 0,
    bottom: 0
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        if (file.size > 12 * 1024 * 1024) {
          toast.error("File size must be less than 12MB");
          return;
        }
        setSelectedFile(file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        toast.error("Please select an image file");
      }
    }
  };

  const handleReferenceFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        if (file.size > 12 * 1024 * 1024) {
          toast.error("File size must be less than 12MB");
          return;
        }
        setReferenceFile(file);
        const url = URL.createObjectURL(file);
        setReferencePreviewUrl(url);
      } else {
        toast.error("Please select an image file");
      }
    }
  };

  const clearSelectedFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const clearReferenceFile = () => {
    if (referencePreviewUrl) {
      URL.revokeObjectURL(referencePreviewUrl);
    }
    setReferenceFile(null);
    setReferencePreviewUrl(null);
  };

  const handleSubmit = () => {
    onSubmit({
      sourceFile: selectedFile,
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
      syncMode,
      padding
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label>Product Image</Label>
        <ImageUploader
          previewUrl={previewUrl}
          onFileSelect={handleFileSelect}
          onClear={clearSelectedFile}
          helpText="Upload your product image (max 12MB)"
        />
      </div>

      <Tabs value={generationType} onValueChange={(value: 'description' | 'reference') => setGenerationType(value)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="description">Scene Description</TabsTrigger>
          <TabsTrigger value="reference">Reference Image</TabsTrigger>
        </TabsList>
        <TabsContent value="description">
          <div className="space-y-4">
            <Label htmlFor="sceneDescription">Scene Description</Label>
            <Textarea
              id="sceneDescription"
              placeholder="Describe the scene or background you want for your product..."
              value={sceneDescription}
              onChange={(e) => setSceneDescription(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex items-center justify-between">
              <Label htmlFor="optimizeDescription">Optimize Description</Label>
              <Switch
                id="optimizeDescription"
                checked={optimizeDescription}
                onCheckedChange={setOptimizeDescription}
              />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="reference">
          <div className="space-y-4">
            <Label>Reference Image</Label>
            <ImageUploader
              previewUrl={referencePreviewUrl}
              onFileSelect={handleReferenceFileSelect}
              onClear={clearReferenceFile}
              helpText="Upload a reference image (max 12MB)"
            />
          </div>
        </TabsContent>
      </Tabs>

      <div className="space-y-4">
        <Label htmlFor="placementType">Placement Type</Label>
        <Select
          value={placementType}
          onValueChange={(value: PlacementType) => setPlacementType(value)}
        >
          <SelectTrigger id="placementType">
            <SelectValue placeholder="Select placement type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="original">Original Position</SelectItem>
            <SelectItem value="automatic">Automatic (10 positions)</SelectItem>
            <SelectItem value="manual_placement">Manual Placement</SelectItem>
            <SelectItem value="manual_padding">Manual Padding</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {placementType === 'manual_placement' && (
        <div className="space-y-4">
          <Label htmlFor="manualPlacement">Manual Placement Position</Label>
          <Select
            value={manualPlacement}
            onValueChange={(value: ManualPlacementSelection) => setManualPlacement(value)}
          >
            <SelectTrigger id="manualPlacement">
              <SelectValue placeholder="Select position" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="upper_left">Upper Left</SelectItem>
              <SelectItem value="upper_right">Upper Right</SelectItem>
              <SelectItem value="bottom_left">Bottom Left</SelectItem>
              <SelectItem value="bottom_right">Bottom Right</SelectItem>
              <SelectItem value="right_center">Right Center</SelectItem>
              <SelectItem value="left_center">Left Center</SelectItem>
              <SelectItem value="upper_center">Upper Center</SelectItem>
              <SelectItem value="bottom_center">Bottom Center</SelectItem>
              <SelectItem value="center_vertical">Center Vertical</SelectItem>
              <SelectItem value="center_horizontal">Center Horizontal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {placementType === 'manual_padding' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Left Padding</Label>
            <Input
              type="number"
              value={padding.left}
              onChange={(e) => setPadding(prev => ({ ...prev, left: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div>
            <Label>Right Padding</Label>
            <Input
              type="number"
              value={padding.right}
              onChange={(e) => setPadding(prev => ({ ...prev, right: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div>
            <Label>Top Padding</Label>
            <Input
              type="number"
              value={padding.top}
              onChange={(e) => setPadding(prev => ({ ...prev, top: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div>
            <Label>Bottom Padding</Label>
            <Input
              type="number"
              value={padding.bottom}
              onChange={(e) => setPadding(prev => ({ ...prev, bottom: parseInt(e.target.value) || 0 }))}
            />
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="fastMode">Fast Mode</Label>
          <Switch
            id="fastMode"
            checked={fastMode}
            onCheckedChange={setFastMode}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="syncMode">Sync Mode</Label>
          <Switch
            id="syncMode"
            checked={syncMode}
            onCheckedChange={setSyncMode}
          />
        </div>

        {placementType === 'original' && (
          <div className="flex items-center justify-between">
            <Label htmlFor="originalQuality">Original Quality</Label>
            <Switch
              id="originalQuality"
              checked={originalQuality}
              onCheckedChange={setOriginalQuality}
            />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <Label>Image Size</Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Width</Label>
            <Input
              type="number"
              value={shotWidth}
              onChange={(e) => setShotWidth(parseInt(e.target.value) || 1000)}
            />
          </div>
          <div>
            <Label>Height</Label>
            <Input
              type="number"
              value={shotHeight}
              onChange={(e) => setShotHeight(parseInt(e.target.value) || 1000)}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Label>Number of Results</Label>
        <Input
          type="number"
          min="1"
          max="10"
          value={numResults}
          onChange={(e) => setNumResults(parseInt(e.target.value) || 1)}
        />
      </div>

      <Button 
        onClick={handleSubmit} 
        disabled={isGenerating || !selectedFile || (generationType === 'description' && !sceneDescription) || (generationType === 'reference' && !referenceFile)}
        className="w-full"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          "Generate Product Shot"
        )}
      </Button>
    </div>
  );
}
