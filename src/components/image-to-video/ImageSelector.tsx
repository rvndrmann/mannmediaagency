
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUploader } from "./ImageUploader";
import { ProductImageHistory } from "@/components/product/ProductImageHistory";
import { useState } from "react";

interface ImageSelectorProps {
  previewUrl: string | null;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  onSelectFromHistory: (jobId: string, imageUrl: string) => void;
  aspectRatio: number;
  helpText?: string;
}

export function ImageSelector({
  previewUrl,
  onFileSelect,
  onClear,
  onSelectFromHistory,
  aspectRatio,
  helpText
}: ImageSelectorProps) {
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  const handleImageSelect = (jobId: string, imageUrl: string) => {
    setSelectedImageId(jobId);
    onSelectFromHistory(jobId, imageUrl);
  };

  const handleBackToGallery = () => {
    setSelectedImageId(null);
  };

  return (
    <Tabs defaultValue="upload" className="w-full">
      <TabsList className="grid grid-cols-2 mb-4">
        <TabsTrigger value="upload">Upload Image</TabsTrigger>
        <TabsTrigger value="history">Product Images</TabsTrigger>
      </TabsList>
      <TabsContent value="upload">
        <ImageUploader
          previewUrl={previewUrl}
          onFileSelect={onFileSelect}
          onClear={onClear}
          aspectRatio={aspectRatio}
          helpText={helpText || "Upload an image (9:16 aspect ratio)"}
        />
      </TabsContent>
      <TabsContent value="history" className="mt-0">
        <div className="bg-gray-900 rounded-lg border-2 border-dashed border-gray-700">
          <ProductImageHistory 
            onSelectImage={handleImageSelect} 
            selectedImageId={selectedImageId}
            onBackToGallery={handleBackToGallery}
          />
        </div>
      </TabsContent>
    </Tabs>
  );
}
