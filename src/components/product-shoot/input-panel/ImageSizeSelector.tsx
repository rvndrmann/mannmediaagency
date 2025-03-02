
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
  // Define the image size options
  const imageSizeOptions = [
    { value: "square_hd", label: "Square HD" },
    { value: "square", label: "Square" },
    { value: "portrait_4_3", label: "Portrait 4:3" },
    { value: "portrait_16_9", label: "Portrait 16:9" },
    { value: "landscape_4_3", label: "Landscape 4:3" },
    { value: "landscape_16_9", label: "Landscape 16:9" },
  ];
  
  // Handle image size change
  const handleImageSizeChange = (value: string) => {
    const isValidSize = imageSizeOptions.some(option => option.value === value);
    
    if (isValidSize) {
      onImageSizeChange(value as ImageSize);
    }
  };

  return (
    <div>
      <Label htmlFor="imageSize" className="text-white">Image Size</Label>
      <div className="relative">
        <Select 
          value={imageSize} 
          onValueChange={handleImageSizeChange}
          defaultValue="square_hd"
        >
          <SelectTrigger id="imageSize" className="w-full bg-gray-900 border-gray-700 text-white">
            <SelectValue placeholder="Select size" />
          </SelectTrigger>
          <SelectContent 
            position="popper" 
            className="bg-[#1A1F2C] border-gray-700 text-white max-h-[300px] overflow-y-auto z-[9999]"
            sideOffset={4}
            align="center"
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
