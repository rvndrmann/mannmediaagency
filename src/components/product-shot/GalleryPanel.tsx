
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GeneratedImage } from "@/types/product-shoot";
import { Download, Star } from "lucide-react";

export interface GalleryPanelProps {
  generatedImages: GeneratedImage[];
  savedImages: GeneratedImage[];
  defaultImages: GeneratedImage[];
  onSaveImage: (imageId: string) => Promise<boolean>;
  onSetAsDefault: (imageId: string) => Promise<boolean>;
}

const GalleryPanel: React.FC<GalleryPanelProps> = ({
  generatedImages,
  savedImages,
  defaultImages,
  onSaveImage,
  onSetAsDefault
}) => {
  const downloadImage = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'product-shot.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const renderImageGrid = (images: GeneratedImage[], showSaveButton: boolean = false, showDefaultButton: boolean = false) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {images.length > 0 ? (
        images.map((image) => (
          <Card key={image.id} className="overflow-hidden">
            <div className="relative aspect-square">
              <img 
                src={image.resultUrl || image.url} 
                alt={image.prompt} 
                className="object-cover w-full h-full"
              />
            </div>
            <CardContent className="p-4 space-y-2">
              <p className="text-sm truncate">{image.prompt}</p>
              <div className="flex space-x-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => downloadImage(image.resultUrl || image.url || '', `product-shot-${image.id}.png`)}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
                
                {showSaveButton && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onSaveImage(image.id)}
                  >
                    Save
                  </Button>
                )}
                
                {showDefaultButton && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onSetAsDefault(image.id)}
                  >
                    <Star className="h-4 w-4 mr-1" />
                    Default
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <div className="col-span-full text-center p-8 text-muted-foreground">
          No images available.
        </div>
      )}
    </div>
  );

  return (
    <Tabs defaultValue="current">
      <TabsList className="mb-4">
        <TabsTrigger value="current">Current Session</TabsTrigger>
        <TabsTrigger value="saved">Saved</TabsTrigger>
        <TabsTrigger value="defaults">Defaults</TabsTrigger>
      </TabsList>
      
      <TabsContent value="current">
        {renderImageGrid(generatedImages, true, true)}
      </TabsContent>
      
      <TabsContent value="saved">
        {renderImageGrid(savedImages, false, true)}
      </TabsContent>
      
      <TabsContent value="defaults">
        {renderImageGrid(defaultImages)}
      </TabsContent>
    </Tabs>
  );
};

export default GalleryPanel;
