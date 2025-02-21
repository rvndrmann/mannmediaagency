
import { Loader2 } from "lucide-react";

interface GeneratedImage {
  url: string;
  content_type: string;
}

interface GeneratedImagesPanelProps {
  images: GeneratedImage[];
  isGenerating: boolean;
}

export function GeneratedImagesPanel({ images, isGenerating }: GeneratedImagesPanelProps) {
  return (
    <div className="bg-gray-900 rounded-lg border-2 border-dashed border-gray-700 p-4">
      {images.length > 0 ? (
        <div className="grid gap-4">
          {images.map((image, index) => (
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
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-gray-500 text-center">
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating your product shot...
              </span>
            ) : (
              "Generated images will appear here..."
            )}
          </p>
        </div>
      )}
    </div>
  );
}
