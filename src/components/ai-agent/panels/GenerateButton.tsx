
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface GenerateButtonProps {
  onClick: () => void;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  creditCost: number | string;
  position?: "fixed" | "relative";
}

export const GenerateButton = ({
  onClick,
  disabled = false,
  icon,
  label,
  creditCost,
  position = "relative"
}: GenerateButtonProps) => {
  return (
    <div className={`${position === "fixed" ? "fixed md:relative bottom-20 md:bottom-auto left-0 right-0 p-4 z-10" : ""}`}>
      <Button 
        onClick={onClick}
        disabled={disabled}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
      >
        {icon}
        {label} ({creditCost})
      </Button>
    </div>
  );
};
