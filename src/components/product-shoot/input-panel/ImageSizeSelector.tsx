
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageSize } from "@/hooks/use-product-shot-v1";
import { useEffect } from "react";

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
    { value: "square_hd", label: "square_hd" },
    { value: "square", label: "square" },
    { value: "portrait_4_3", label: "portrait_4_3" },
    { value: "portrait_16_9", label: "portrait_16_9" },
    { value: "landscape_4_3", label: "landscape_4_3" },
    { value: "landscape_16_9", label: "landscape_16_9" },
  ];
  
  // Log current imageSize on component mount and updates
  useEffect(() => {
    console.log("ImageSizeSelector mounted/updated with imageSize:", imageSize);
  }, [imageSize]);
  
  // Handle image size change with validation
  const handleImageSizeChange = (value: string) => {
    console.log("ImageSizeSelector selected value:", value);
    
    // Validate that the value is a valid ImageSize enum value
    const isValidSize = imageSizeOptions.some(option => option.value === value);
    
    if (isValidSize) {
      console.log("ImageSizeSelector calling onImageSizeChange with:", value);
      onImageSizeChange(value as ImageSize);
    } else {
      console.error("Invalid imageSize value selected:", value);
    }
  };

  return (
    <div>
      <Label htmlFor="imageSize" className="text-white">Image Size: <span className="text-purple-400">{imageSize}</span></Label>
      <div className="relative">
        <Select 
          value={imageSize} 
          onValueChange={handleImageSizeChange}
          defaultValue={imageSize}
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
