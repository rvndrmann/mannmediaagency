
import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  LayoutTemplate, 
  Maximize, 
  Smartphone, 
  Square 
} from "lucide-react";

interface AspectRatioControlProps {
  onAspectRatioChange: (ratio: string) => void;
  currentRatio: string;
}

export const AspectRatioControl: React.FC<AspectRatioControlProps> = ({
  onAspectRatioChange,
  currentRatio
}) => {
  const aspectRatios = [
    { id: '16:9', icon: <LayoutTemplate className="w-4 h-4" /> },
    { id: '9:16', icon: <Smartphone className="w-4 h-4" /> },
    { id: '1:1', icon: <Square className="w-4 h-4" /> },
    { id: 'original', icon: <Maximize className="w-4 h-4" /> },
  ];

  return (
    <div className="flex gap-2">
      {aspectRatios.map(({ id, icon }) => (
        <Button
          key={id}
          variant={currentRatio === id ? "secondary" : "ghost"}
          size="icon"
          onClick={() => onAspectRatioChange(id)}
          className="text-white"
        >
          {icon}
        </Button>
      ))}
    </div>
  );
};
