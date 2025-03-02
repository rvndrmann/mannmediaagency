
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface GenerateButtonProps {
  isGenerating: boolean;
  disabled: boolean;
  onClick: () => void;
}

export const GenerateButton = ({
  isGenerating,
  disabled,
  onClick
}: GenerateButtonProps) => {
  return (
    <Button
      onClick={onClick}
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
