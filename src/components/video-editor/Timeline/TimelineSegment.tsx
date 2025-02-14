
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

  const dragHandle = useDrag(({ movement: [mx], first, last }) => {
    if (first) onDragStart?.();
    if (last) onDragEnd?.();
  });

  const trimLeft = useDrag(({ movement: [mx], first, last }) => {
    if (!first && !last) {
      const containerWidth = document.querySelector('.timeline-container')?.clientWidth || 1;
      const deltaTime = (mx / containerWidth) * duration;
      const newStartTime = Math.max(0, Math.min(endTime - 1, startTime + deltaTime));
      onTrimStart?.(newStartTime);
    }
  });

  const trimRight = useDrag(({ movement: [mx], first, last }) => {
    if (!first && !last) {
      const containerWidth = document.querySelector('.timeline-container')?.clientWidth || 1;
      const deltaTime = (mx / containerWidth) * duration;
      const newEndTime = Math.max(startTime + 1, Math.min(duration, endTime + deltaTime));
      onTrimEnd?.(newEndTime);
    }
  });

  return (
    <div
      className={`absolute h-full ${isSelected ? 'bg-blue-500/40' : 'bg-white/30'} group transition-colors`}
      style={{
        left: `${startPosition}%`,
        width: `${width}%`
      }}
      {...dragHandle()}
    >
      {/* Trim handles */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
        {...trimLeft()}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
        {...trimRight()}
      />
    </div>
  );
};
