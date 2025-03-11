
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

interface HeaderProps {
  onBack?: () => void;
  title?: string;
}

export const Header = ({ onBack, title = "AI Agent" }: HeaderProps) => {
  return (
    <div className="bg-[#1A1F2C]/95 backdrop-blur-lg border-b border-white/10">
      <div className="px-6 py-4 flex items-center max-w-screen-2xl mx-auto">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="text-white hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-xl font-semibold text-white ml-4">{title}</h1>
      </div>
    </div>
  );
}
