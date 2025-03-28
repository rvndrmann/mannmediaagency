
import { ImageSize } from "@/hooks/use-product-shot-v1";

interface ImageSizeSelectorProps {
  imageSize: ImageSize;
  onImageSizeChange: (value: ImageSize) => void;
}

export function ImageSizeSelector({ 
  imageSize, 
  onImageSizeChange 
}: ImageSizeSelectorProps) {
  const sizes = [
    { label: "Small", value: "512x512" },
    { label: "Medium", value: "768x768" },
    { label: "Large", value: "1024x1024" }
  ];

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-white">Image Size</label>
      <div className="grid grid-cols-3 gap-2">
        {sizes.map((size) => (
          <button
            key={size.value}
            type="button"
            onClick={() => onImageSizeChange(size.value)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              imageSize === size.value
                ? "bg-purple-500 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {size.label}
          </button>
        ))}
      </div>
    </div>
  );
}
