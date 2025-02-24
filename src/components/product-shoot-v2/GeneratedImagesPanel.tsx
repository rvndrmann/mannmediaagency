
interface GeneratedImagesPanelProps {
  images: string[];
  isGenerating: boolean;
}

export function GeneratedImagesPanel({ images, isGenerating }: GeneratedImagesPanelProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Generated Images</h3>
      <div className="grid grid-cols-2 gap-4">
        {images.map((image, index) => (
          <img
            key={index}
            src={image}
            alt={`Generated image ${index + 1}`}
            className="w-full h-auto rounded-lg border border-gray-800"
          />
        ))}
      </div>
      {isGenerating && (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      )}
    </div>
  );
}
