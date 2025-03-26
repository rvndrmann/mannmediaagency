
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MobilePanelToggleProps {
  title: string;
  className?: string;
}

export function MobilePanelToggle({ title, className }: MobilePanelToggleProps) {
  const navigate = useNavigate();

  return (
    <div className={`flex items-center gap-4 bg-gray-900 p-4 border-b border-gray-800 sticky top-0 z-10 ${className}`}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate("/")}
        className="text-gray-400 hover:text-white"
      >
        <ArrowLeft className="h-6 w-6" />
      </Button>
      <h1 className="text-xl font-bold text-white flex-1">
        {title}
      </h1>
    </div>
  );
}
