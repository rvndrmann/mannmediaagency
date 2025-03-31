
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";

interface GenerateButtonProps {
  isGenerating: boolean;
  isSubmitting: boolean;
  availableCredits: number;
  numResults?: number;
}

export function GenerateButton({ 
  isGenerating, 
  isSubmitting, 
  availableCredits, 
  numResults = 1 
}: GenerateButtonProps) {
  const isDisabled = isGenerating || isSubmitting || (availableCredits < numResults);
  const requiredCredits = numResults;
  
  return (
    <Button
      type="submit"
      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
      disabled={isDisabled}
    >
      {isGenerating || isSubmitting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          Generate Product Shot ({requiredCredits} credit{requiredCredits !== 1 ? 's' : ''})
        </>
      )}
    </Button>
  );
}
