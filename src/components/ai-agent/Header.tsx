
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

interface HeaderProps {
  onBack: () => void;
}

export const Header = ({ onBack }: HeaderProps) => {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-[#1A1F2C]/80 backdrop-blur-lg border-b border-white/10">
      <div className="container mx-auto px-4 py-3 flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="w-8 h-8 text-white hover:bg-white/10"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold text-white ml-2">AI Agent</h1>
      </div>
    </div>
  );
};
