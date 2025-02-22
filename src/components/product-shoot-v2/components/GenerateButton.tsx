
import { Button } from "@/components/ui/button";
import { CreditInfoProps } from "../types";

export const GenerateButton = ({ availableCredits, isGenerating, isSubmitting }: CreditInfoProps) => {
  const calculateCreditCost = () => 0.2;
  const hasEnoughCredits = () => availableCredits >= calculateCreditCost();

  return (
    <Button 
      type="submit" 
      className="w-full" 
      disabled={isGenerating || isSubmitting || !hasEnoughCredits()}
    >
      {isGenerating || isSubmitting ? (
        "Generating..."
      ) : (
        <>
          Generate (0.2 credits)
          {availableCredits < calculateCreditCost() && (
            <span className="ml-2 text-xs text-red-400">
              (Insufficient credits)
            </span>
          )}
        </>
      )}
    </Button>
  );
};
