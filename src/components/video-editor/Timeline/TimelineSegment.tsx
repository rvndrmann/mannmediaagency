
import React from 'react';
import { useDrag } from '@use-gesture/react';

interface TimelineSegmentProps {
  startTime: number;
  endTime: number;
  duration: number;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onTrimStart?: (newStartTime: number) => void;
  onTrimEnd?: (newEndTime: number) => void;
  isSelected?: boolean;
}

export const TimelineSegment: React.FC<TimelineSegmentProps> = ({
  startTime,
  endTime,
  duration,
  onDragStart,
  onDragEnd,
  onTrimStart,
  onTrimEnd,
  isSelected = false,
}) => {
  const startPosition = (startTime / duration) * 100;
  const width = ((endTime - startTime) / duration) * 100;

  const bindMainDrag = useDrag(
    ({ first, last }) => {
      if (first) onDragStart?.();
      if (last) onDragEnd?.();
    },
    { 
      transform: ([x]) => [x, 0]
    }
  );

  const bindTrimLeft = useDrag(
    ({ movement: [mx] }) => {
      const containerWidth = document.querySelector('.timeline-container')?.clientWidth || 1;
      const deltaTime = (mx / containerWidth) * duration;
      const newStartTime = Math.max(0, Math.min(endTime - 1, startTime + deltaTime));
      onTrimStart?.(newStartTime);
    }
  );

  const bindTrimRight = useDrag(
    ({ movement: [mx] }) => {
      const containerWidth = document.querySelector('.timeline-container')?.clientWidth || 1;
      const deltaTime = (mx / containerWidth) * duration;
      const newEndTime = Math.max(startTime + 1, Math.min(duration, endTime + deltaTime));
      onTrimEnd?.(newEndTime);
    }
  );

  return (
    <div
      className={`absolute h-full ${isSelected ? 'bg-blue-500/40' : 'bg-white/30'} group transition-colors`}
      style={{
        left: `${startPosition}%`,
        width: `${width}%`
      }}
      {...bindMainDrag()}
    >
      {/* Trim handles */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
        {...bindTrimLeft()}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
        {...bindTrimRight()}
      />
    </div>
  );
};
