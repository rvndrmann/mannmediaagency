
import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Sidebar } from "@/components/Sidebar";
import { ImageUploader } from "@/components/product-shoot-v2/ImageUploader";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface GeneratedImage {
  url: string;
  content_type: string;
}

interface GenerationResult {
  images: GeneratedImage[];
  request_id?: string;
  status?: string;
}

type PlacementType = 'original' | 'automatic' | 'manual_placement' | 'manual_padding';
type ManualPlacementSelection = 'upper_left' | 'upper_right' | 'bottom_left' | 'bottom_right' | 'right_center' | 'left_center' | 'upper_center' | 'bottom_center' | 'center_vertical' | 'center_horizontal';

const ProductShootV2 = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreviewUrl, setReferencePreviewUrl] = useState<string | null>(null);
  const [sceneDescription, setSceneDescription] = useState("");
  const [placementType, setPlacementType] = useState<PlacementType>("manual_placement");
  const [manualPlacement, setManualPlacement] = useState<ManualPlacementSelection>("bottom_center");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [optimizeDescription, setOptimizeDescription] = useState(true);
  const [numResults, setNumResults] = useState(1);
  const [fastMode, setFastMode] = useState(true);
  const [originalQuality, setOriginalQuality] = useState(false);
  const [shotWidth, setShotWidth] = useState(1000);
  const [shotHeight, setShotHeight] = useState(1000);
  const [syncMode, setSyncMode] = useState(true);
  const [generationType, setGenerationType] = useState<'description' | 'reference'>('description');
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

  const handleGenerate = async () => {
    if (!selectedFile) {
      toast.error("Please upload an image first");
      return;
    }

    if (generationType === 'description' && !sceneDescription) {
      toast.error("Please provide a scene description");
      return;
    }

    if (generationType === 'reference' && !referenceFile) {
      toast.error("Please upload a reference image");
      return;
    }

    setIsGenerating(true);
    setGeneratedImages([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to continue");
        return;
      }

      // Upload the source image to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = fileName;

      console.log('Uploading source file:', filePath);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('source_images')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }

      // Get the public URL of the uploaded image
      const { data: { publicUrl } } = supabase.storage
        .from('source_images')
        .getPublicUrl(filePath);

      console.log('Source image uploaded successfully:', publicUrl);

      // If using reference image, upload it too
      let referenceUrl = '';
      if (generationType === 'reference' && referenceFile) {
        const refFileExt = referenceFile.name.split('.').pop();
        const refFileName = `ref_${crypto.randomUUID()}.${refFileExt}`;
        
        console.log('Uploading reference file:', refFileName);

        const { error: refUploadError } = await supabase.storage
          .from('source_images')
          .upload(refFileName, referenceFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (refUploadError) {
          console.error('Reference upload error:', refUploadError);
          throw new Error(`Failed to upload reference image: ${refUploadError.message}`);
        }

        const { data: { publicUrl: refPublicUrl } } = supabase.storage
          .from('source_images')
          .getPublicUrl(refFileName);

        console.log('Reference image uploaded successfully:', refPublicUrl);
        referenceUrl = refPublicUrl;
      }

      // Prepare the request body
      const requestBody: any = {
        image_url: publicUrl,
        shot_size: [shotWidth, shotHeight],
        num_results: numResults,
        fast: fastMode,
        placement_type: placementType,
        sync_mode: syncMode
      };

      // Add either scene description or reference image URL
      if (generationType === 'description') {
        requestBody.scene_description = sceneDescription;
        requestBody.optimize_description = optimizeDescription;
      } else {
        requestBody.ref_image_url = referenceUrl;
      }

      // Add conditional parameters
      if (placementType === 'manual_placement') {
        requestBody.manual_placement_selection = manualPlacement;
      } else if (placementType === 'manual_padding') {
        requestBody.padding_values = [padding.left, padding.right, padding.top, padding.bottom];
      } else if (placementType === 'original') {
        requestBody.original_quality = originalQuality;
      }

      console.log('Sending request to edge function:', requestBody);

      // Call generate-product-shot function
      const { data, error } = await supabase.functions.invoke<GenerationResult>(
        'generate-product-shot',
        {
          body: JSON.stringify(requestBody)
        }
      );

      console.log('Edge function response:', data, error);

      if (error) {
        throw new Error(error.message || 'Failed to generate image');
      }

      if (syncMode) {
        if (!data?.images?.length) {
          throw new Error('No images received from the generation API');
        }
        setGeneratedImages(data.images);
        toast.success("Image generated successfully!");
      } else {
        toast.success("Image generation started! Please wait...");
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      const errorMessage = error.message || "Failed to generate image. Please try again.";
      
      if (errorMessage.toLowerCase().includes('fal_key')) {
        toast.error("There was an issue with the AI service configuration. Please try again later or contact support.");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <SidebarProvider defaultOpen>
      <div className="flex flex-col min-h-screen w-full bg-background">
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 relative">
            <div className="p-8">
              <h1 className="text-2xl font-bold mb-6">Product Shoot V2</h1>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                    onClick={handleGenerate} 
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

                <div className="space-y-4">
                  <Label>Generated Images</Label>
                  <div className="bg-gray-900 rounded-lg border-2 border-dashed border-gray-700 p-4 min-h-[500px]">
                    {generatedImages.length > 0 ? (
                      <div className="grid gap-4">
                        {generatedImages.map((image, index) => (
                          <div key={index} className="relative aspect-square">
                            <img
                              src={image.url}
                              alt={`Generated product shot ${index + 1}`}
                              className="w-full h-full object-contain rounded-lg"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-gray-500 text-center">
                          {isGenerating ? "Generating your product shot..." : "Generated images will appear here..."}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ProductShootV2;
