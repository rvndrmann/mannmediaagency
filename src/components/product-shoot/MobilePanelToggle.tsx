
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MobilePanelToggleProps {
  activePanel: 'input' | 'gallery';
  setActivePanel: (panel: 'input' | 'gallery') => void;
  title?: string;
}

export function MobilePanelToggle({ activePanel, setActivePanel, title = "Product Shoot" }: MobilePanelToggleProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-4 bg-gray-900 p-4 border-b border-gray-800 sticky top-0 z-10">
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
      <div className="flex gap-2">
        <Button 
          variant={activePanel === 'input' ? 'secondary' : 'ghost'} 
          size="sm"
          onClick={() => setActivePanel('input')}
        >
          Input
        </Button>
        <Button 
          variant={activePanel === 'gallery' ? 'secondary' : 'ghost'} 
          size="sm"
          onClick={() => setActivePanel('gallery')}
        >
          Gallery
        </Button>
      </div>
    </div>
  );
}
