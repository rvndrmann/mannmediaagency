
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

interface HeaderProps {
  onBack?: () => void;
  title?: string;
}

export const Header = ({ onBack, title = "Chat" }: HeaderProps) => {
  return (
    <div className="bg-[#1A1F29] border-b border-white/10 sticky top-0 z-10">
      <div className="px-4 py-3 flex items-center">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-white hover:bg-white/5 transition-colors mr-2 p-0 h-8 w-8"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-base font-medium text-white">
          {title}
        </h1>
      </div>
    </div>
  );
}
