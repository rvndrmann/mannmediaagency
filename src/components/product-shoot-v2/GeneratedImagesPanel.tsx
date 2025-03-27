
import { GeneratedImage } from "@/types/product-shoot";
import { Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GeneratedImagesPanelProps {
  images: GeneratedImage[];
  isGenerating: boolean;
}

export function GeneratedImagesPanel({ images, isGenerating }: GeneratedImagesPanelProps) {
  const hasCompletedImages = images.some(image => image.status === 'completed' && image.url);
  const hasProcessingImages = images.some(image => image.status === 'processing');
  const hasFailedImages = images.some(image => image.status === 'failed');

  const handleDownload = (url: string, index: number) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `product-shot-${index}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Generated Images</h3>
      
      {hasCompletedImages ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {images.filter(image => image.status === 'completed' && image.url).map((image, index) => (
            <div key={image.id || index} className="relative group">
              <img
                src={image.url}
                alt={`Generated image ${index + 1}`}
                className="w-full h-auto rounded-lg border border-gray-800"
              />
              <div className="absolute bottom-2 right-2 flex space-x-2">
                <a 
                  href={image.url} 
                  target="_blank"
                  rel="noopener noreferrer" 
                  className="bg-black/50 hover:bg-black/70 text-white px-3 py-1 rounded text-xs"
                >
                  View Full
                </a>
                <Button
                  variant="outline" 
                  size="icon"
                  className="h-8 w-8 bg-black/50 hover:bg-black/70 border-none"
                  onClick={() => handleDownload(image.url, index)}
                >
                  <Download className="h-4 w-4 text-white" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      
      {hasProcessingImages && (
        <div className="flex items-center justify-center p-4 bg-gray-800/30 rounded-lg">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            <p className="text-sm text-gray-300">Generating your product shot...</p>
          </div>
        </div>
      )}
      
      {hasFailedImages && (
        <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg">
          <p className="text-sm text-red-300">
            Some images failed to generate. Please try again with different settings or contact support if the problem persists.
          </p>
        </div>
      )}
      
      {images.length === 0 && (
        <div className="p-4 bg-gray-800/30 rounded-lg text-center">
          <p className="text-sm text-gray-400">No images generated yet. Submit the form to create product shots.</p>
        </div>
      )}
    </div>
  );
}
