
import { Button } from "@/components/ui/button";
import { PlusSquare } from "lucide-react";

interface CustomOrderButtonProps {
  onClick: () => void;
}

export const CustomOrderButton = ({ onClick }: CustomOrderButtonProps) => {
  return (
    <Button
      variant="outline"
      className="border-dashed border-muted-foreground/50 hover:border-purple-400/50 hover:bg-muted/50 flex items-center justify-center gap-2 h-12"
      onClick={onClick}
    >
      <PlusSquare className="h-5 w-5" />
      <span>Custom Order</span>
    </Button>
  );
};
