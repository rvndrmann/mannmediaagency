
import { GeneratedImage } from "@/types/product-shoot";
import { Loader2 } from "lucide-react";

interface GeneratedImagesPanelProps {
  images: GeneratedImage[];
  isGenerating: boolean;
}

export function GeneratedImagesPanel({ images, isGenerating }: GeneratedImagesPanelProps) {
  const hasCompletedImages = images.some(image => image.status === 'completed' && image.url);
  const hasProcessingImages = images.some(image => image.status === 'processing');
  const hasFailedImages = images.some(image => image.status === 'failed');

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Generated Images</h3>
      
      {hasCompletedImages ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {images.filter(image => image.status === 'completed' && image.url).map((image, index) => (
            <div key={image.id || index} className="relative">
              <img
                src={image.url}
                alt={`Generated image ${index + 1}`}
                className="w-full h-auto rounded-lg border border-gray-800"
              />
              <a 
                href={image.url} 
                target="_blank"
                rel="noopener noreferrer" 
                className="absolute bottom-2 right-2 bg-black/50 hover:bg-black/70 text-white px-3 py-1 rounded text-xs"
              >
                View Full
              </a>
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
