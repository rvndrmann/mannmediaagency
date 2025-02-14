
import React from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Scissors
} from "lucide-react";

interface PlaybackControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  volume: number;
  onVolumeChange: (value: number[]) => void;
  isMuted: boolean;
  onMuteToggle: () => void;
  onSplit?: () => void;
  disabled?: boolean;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  onPlayPause,
  volume,
  onVolumeChange,
  isMuted,
  onMuteToggle,
  onSplit,
  disabled = false
}) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPlayPause}
          className="text-white"
          disabled={disabled}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-white"
          disabled={disabled}
          onClick={onSplit}
        >
          <Scissors className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMuteToggle}
          className="text-white"
          disabled={disabled}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </Button>
        <div className="w-24">
          <Slider
            value={[volume]}
            max={1}
            step={0.1}
            onValueChange={onVolumeChange}
            className="bg-white/10"
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
};
