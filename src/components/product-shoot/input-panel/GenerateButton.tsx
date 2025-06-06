
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface GenerateButtonProps {
  isGenerating: boolean;
  disabled: boolean;
  onClick: () => void;
  creditCost?: number;
}

export const GenerateButton = ({
  isGenerating,
  disabled,
  onClick,
  creditCost = 0.2
}: GenerateButtonProps) => {
  // Add a safe handler that catches errors
  const handleClick = () => {
    try {
      onClick();
    } catch (error) {
      console.error("Error in generate button click:", error);
      // Could add a toast here in a future enhancement
    }
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
        `Generate Image (${creditCost} credits)`
      )}
    </Button>
  );
};
