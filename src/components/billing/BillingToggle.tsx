
import { Button } from "@/components/ui/button";

interface BillingToggleProps {
  isYearly: boolean;
  onToggle: (isYearly: boolean) => void;
}

export const BillingToggle = ({ isYearly, onToggle }: BillingToggleProps) => {
  return (
    <div className="flex items-center gap-2 bg-gray-100 rounded-full p-1 mb-8">
      <Button 
        variant={isYearly ? "ghost" : "default"} 
        className="rounded-full"
        onClick={() => onToggle(false)}
      >
        Monthly
      </Button>
      <Button 
        variant={isYearly ? "default" : "ghost"} 
        className="rounded-full"
        onClick={() => onToggle(true)}
      >
        Yearly
      </Button>
    </div>
  );
};
