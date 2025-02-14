
import React from 'react';
import { Progress } from "@/components/ui/progress";
import { TimelineMarkers } from './TimelineMarkers';
import { TimelineCursor } from './TimelineCursor';
import { TimelineSegment } from './TimelineSegment';

interface TimelineProps {
  currentTime: number;
  duration: number;
  onTimelineClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  formatTime: (time: number) => string;
  hasVideo: boolean;
}

export const Timeline: React.FC<TimelineProps> = ({
  currentTime,
  duration,
  onTimelineClick,
  formatTime,
  hasVideo
}) => {
  return (
    <div className="space-y-4">
      <div className="relative h-8" onClick={onTimelineClick}>
        <TimelineMarkers duration={duration} />
        <TimelineCursor currentTime={currentTime} duration={duration} />
        {hasVideo && (
          <TimelineSegment
            startTime={0}
            endTime={duration}
            duration={duration}
          />
        )}
        <Progress 
          value={(currentTime / duration) * 100} 
          className="h-full absolute inset-0"
        />
      </div>

      <div className="flex justify-between text-sm text-white/60">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
};
