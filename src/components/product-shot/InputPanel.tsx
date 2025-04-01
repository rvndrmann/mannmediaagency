
import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GeneratedImage } from "@/types/product-shoot";
import { Loader2 } from "lucide-react";

export interface InputPanelProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  sourceImageUrl: string;
  onImageUpload: (file: File) => Promise<void>;
  onImageSelect: (url: string) => void;
  defaultImages: GeneratedImage[];
  stylePreset: string;
  onStylePresetChange: (preset: string) => void;
  placement: string;
  onPlacementChange: (placement: string) => void;
  background: string;
  onBackgroundChange: (background: string) => void;
  isGenerating: boolean;
  onGenerate: () => Promise<void>;
  outputFormat?: string;
  onOutputFormatChange?: (format: string) => void;
  imageWidth?: number;
  imageHeight?: number;
  onDimensionsChange?: (width: any, height: any) => void;
  quality?: string;
  onQualityChange?: (quality: string) => void;
}

const InputPanel: React.FC<InputPanelProps> = ({
  prompt,
  onPromptChange,
  sourceImageUrl,
  onImageUpload,
  onImageSelect,
  defaultImages,
  stylePreset,
  onStylePresetChange,
  placement,
  onPlacementChange,
  background,
  onBackgroundChange,
  isGenerating,
  onGenerate,
  outputFormat = "png",
  onOutputFormatChange,
  imageWidth = 768,
  imageHeight = 768,
  onDimensionsChange,
  quality = "standard",
  onQualityChange
}) => {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await onImageUpload(e.target.files[0]);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="flex flex-col space-y-4">
        <Card className="p-4">
          <CardContent className="space-y-4 p-0">
            <div className="space-y-2">
              <Label htmlFor="source-image">Source Image</Label>
              <div className="flex flex-col space-y-2">
                <input 
                  id="source-image"
                  type="file" 
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button 
                  variant="outline"
                  onClick={() => document.getElementById('source-image')?.click()}
                  className="w-full"
                >
                  Upload Image
                </Button>
                {sourceImageUrl && (
                  <div className="relative aspect-square overflow-hidden rounded-md border">
                    <img 
                      src={sourceImageUrl} 
                      alt="Source" 
                      className="object-cover w-full h-full"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value)}
                placeholder="Describe the product shot you want to create..."
                className="min-h-[120px]"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col space-y-4">
        <Card className="p-4">
          <CardContent className="space-y-4 p-0">
            <div className="space-y-2">
              <Label>Style Preset</Label>
              <RadioGroup 
                value={stylePreset} 
                onValueChange={onStylePresetChange}
                className="flex flex-wrap gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="product" id="product" />
                  <Label htmlFor="product">Product</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="clean" id="clean" />
                  <Label htmlFor="clean">Clean</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="photographic" id="photographic" />
                  <Label htmlFor="photographic">Photographic</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Placement</Label>
              <RadioGroup 
                value={placement} 
                onValueChange={onPlacementChange}
                className="flex flex-wrap gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="product" id="placement-product" />
                  <Label htmlFor="placement-product">Product</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="centered" id="centered" />
                  <Label htmlFor="centered">Centered</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="packshot" id="packshot" />
                  <Label htmlFor="packshot">Pack Shot</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Background</Label>
              <Select value={background} onValueChange={onBackgroundChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select background" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transparent">Transparent</SelectItem>
                  <SelectItem value="white">White</SelectItem>
                  <SelectItem value="gradient">Gradient</SelectItem>
                  <SelectItem value="studio">Studio</SelectItem>
                  <SelectItem value="contextual">Contextual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conditionally show default images if available */}
            {defaultImages.length > 0 && (
              <div className="space-y-2">
                <Label>Quick Select</Label>
                <div className="grid grid-cols-3 gap-2">
                  {defaultImages.slice(0, 6).map((image) => (
                    <div 
                      key={image.id}
                      className="relative aspect-square overflow-hidden rounded-md border cursor-pointer"
                      onClick={() => image.url && onImageSelect(image.url)}
                    >
                      <img 
                        src={image.url || image.resultUrl} 
                        alt="Default" 
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button 
              onClick={onGenerate}
              disabled={isGenerating || !sourceImageUrl || !prompt}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Product Shot'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InputPanel;
