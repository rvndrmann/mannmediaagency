
import React from 'react';

interface TimelineSegmentProps {
  startTime: number;
  endTime: number;
  duration: number;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export const TimelineSegment: React.FC<TimelineSegmentProps> = ({
  startTime,
  endTime,
  duration,
  onDragStart,
  onDragEnd
}) => {
  const startPosition = (startTime / duration) * 100;
  const width = ((endTime - startTime) / duration) * 100;

  return (
    <div
      className="absolute h-full bg-white/30 cursor-move hover:bg-white/40 transition-colors"
      style={{
        left: `${startPosition}%`,
        width: `${width}%`
      }}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    />
  );
};
