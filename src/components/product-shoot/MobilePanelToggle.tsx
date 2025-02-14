
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MobilePanelToggleProps {
  activePanel: 'input' | 'gallery';
  onPanelChange: (panel: 'input' | 'gallery') => void;
}

export function MobilePanelToggle({ activePanel, onPanelChange }: MobilePanelToggleProps) {
  return (
    <div className="flex items-center justify-between bg-gray-900 p-4 border-b border-gray-800 sticky top-0 z-10">
      <h1 className="text-xl font-bold text-white">
        {activePanel === 'input' ? 'Product Image Generator' : 'Generated Images'}
      </h1>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onPanelChange(activePanel === 'input' ? 'gallery' : 'input')}
        className="text-gray-400 hover:text-white"
      >
        {activePanel === 'input' ? <ChevronRight className="h-6 w-6" /> : <ChevronLeft className="h-6 w-6" />}
      </Button>
    </div>
  );
}
