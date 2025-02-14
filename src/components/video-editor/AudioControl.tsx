
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Volume2, Trash2 } from "lucide-react";

interface AudioControlProps {
  id: string;
  title: string;
  volume: number;
  onVolumeChange: (id: string, volume: number) => void;
  onDelete: (id: string) => void;
}

export function AudioControl({
  id,
  title,
  volume,
  onVolumeChange,
  onDelete,
}: AudioControlProps) {
  const handleVolumeChange = (values: number[]) => {
    onVolumeChange(id, values[0]);
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            <span className="font-medium">{title}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        <Slider
          value={[volume]}
          max={1}
          step={0.1}
          onValueChange={handleVolumeChange}
        />
      </div>
    </Card>
  );
}

