
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageSize } from "@/hooks/use-product-shot-v1";

interface ImageSizeSelectorProps {
  imageSize: ImageSize;
  onImageSizeChange: (value: ImageSize) => void;
}

export const ImageSizeSelector = ({ 
  imageSize, 
  onImageSizeChange 
}: ImageSizeSelectorProps) => {
  // Define the image size options with exact values matching the ImageSize type
  const imageSizeOptions = [
    { value: "square_hd", label: "Square HD (1:1)" },
    { value: "square", label: "Square (1:1)" },
    { value: "portrait_4_3", label: "Portrait 4:3" },
    { value: "portrait_16_9", label: "Portrait 16:9" },
    { value: "landscape_4_3", label: "Landscape 4:3" },
    { value: "landscape_16_9", label: "Landscape 16:9" },
  ];

  // Find the currently selected image size label
  const selectedSizeLabel = imageSizeOptions.find(option => option.value === imageSize)?.label || '';
  
  // Handle image size change with validation
  const handleImageSizeChange = (value: string) => {
    console.log("Selected image size from UI:", value);
    
    // Validate that the value is a valid ImageSize enum value
    const isValidSize = imageSizeOptions.some(option => option.value === value);
    
    if (isValidSize) {
      onImageSizeChange(value as ImageSize);
    } else {
      console.error("Invalid imageSize value selected:", value);
    }
  };

  return (
    <div>
      <Label htmlFor="imageSize" className="text-white">Image Size: <span className="text-purple-400">{selectedSizeLabel}</span></Label>
      <div className="relative">
        <Select 
          value={imageSize} 
          onValueChange={handleImageSizeChange}
        >
          <SelectTrigger id="imageSize" className="w-full bg-gray-900 border-gray-700 text-white">
            <SelectValue placeholder="Select size" />
          </SelectTrigger>
          <SelectContent 
            position="popper" 
            className="bg-[#1A1F2C] border-gray-700 text-white max-h-[300px] overflow-y-auto z-[100]"
            sideOffset={4}
          >
            {imageSizeOptions.map((option) => (
              <SelectItem 
                key={option.value} 
                value={option.value} 
                className="text-white hover:bg-gray-800 cursor-pointer"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
