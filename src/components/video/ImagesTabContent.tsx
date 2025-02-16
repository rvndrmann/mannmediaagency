
import { ProductMetadataManager } from "@/components/product/ProductMetadataManager";

interface ImageData {
  id: string;
  result_url: string;
  prompt: string;
  created_at: string;
  product_image_metadata: { id: string } | null;
}

interface ImagesTabContentProps {
  images: ImageData[];
  selectedId?: string;
  onImageSelect: (id: string) => void;
  showMetadata: boolean;
}

export const ImagesTabContent = ({ images, selectedId, onImageSelect, showMetadata }: ImagesTabContentProps) => {
  return (
    <div className="flex gap-6">
      <div className="w-1/3">
        <div className="space-y-4">
          {images?.map((image) => (
            <div
              key={image.id}
              className={`p-4 rounded-lg cursor-pointer transition-colors ${
                image.id === selectedId
                  ? "bg-purple-600"
                  : "bg-gray-800 hover:bg-gray-700"
              }`}
              onClick={() => onImageSelect(image.id)}
            >
              <img
                src={image.result_url}
                alt={image.prompt}
                className="w-full h-32 object-cover rounded-md mb-2"
              />
              <p className="text-sm text-white/90 line-clamp-2">
                {image.prompt}
              </p>
              <p className="text-xs text-white/60 mt-1">
                {new Date(image.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1">
        {showMetadata ? (
          <ProductMetadataManager imageJobId={selectedId!} />
        ) : (
          <div className="text-center text-white/70 py-8 bg-gray-800/50 rounded-lg">
            Select an image from the list to manage its metadata
          </div>
        )}
      </div>
    </div>
  );
};
