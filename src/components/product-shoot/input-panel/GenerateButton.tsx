
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { ImageSize } from "@/hooks/use-product-shot-v1";
import { useEffect } from "react";

interface GenerateButtonProps {
  isGenerating: boolean;
  disabled: boolean;
  onClick: () => void;
  imageSize?: ImageSize;
}

export const GenerateButton = ({
  isGenerating,
  disabled,
  onClick,
  imageSize
}: GenerateButtonProps) => {
  // Log the imageSize prop when it changes
  useEffect(() => {
    console.log("GenerateButton received imageSize:", imageSize);
  }, [imageSize]);
  
  // Log the current image size when button is clicked
  const handleClick = () => {
    console.log("Generating with image size:", imageSize);
    onClick();
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || isGenerating}
      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        "Generate Image (0.2 credits)"
      )}
    </Button>
  );
};
