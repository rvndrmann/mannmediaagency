
import React from 'react';
import { useDrag } from '@use-gesture/react';

interface TimelineSegmentProps {
  start: number;
  duration: number;
  totalDuration: number;
  onUpdateTime?: (newStart: number) => void;
  onUpdateDuration?: (newDuration: number) => void;
  color?: string;
  isDraggable?: boolean;
}

export const TimelineSegment: React.FC<TimelineSegmentProps> = ({
  start,
  duration,
  totalDuration,
  onUpdateTime,
  onUpdateDuration,
  color = 'bg-blue-500',
  isDraggable = true
}) => {
  const segmentWidth = (duration / totalDuration) * 100;
  const segmentLeft = (start / totalDuration) * 100;

  // Only set up drag handlers if the segment is draggable
  const bindDrag = isDraggable ? useDrag(
    ({ movement: [mx], first, memo }) => {
      if (first) {
        // Return the initial values as memo
        return { initialStart: start };
      }

      const containerWidth = document.querySelector('.timeline-container')?.clientWidth || 1;
      const pixelToTimeRatio = totalDuration / containerWidth;
      const timeDelta = mx * pixelToTimeRatio;

      if (onUpdateTime && typeof onUpdateTime === 'function') {
        const newStart = Math.max(0, Math.min(totalDuration - duration, memo.initialStart + timeDelta));
        onUpdateTime(newStart);
      }
    },
    {
      from: [0, 0],
      bounds: { left: 0, right: 100 }
    }
  ) : () => {};

  return (
    <div
      className={`absolute h-full ${color} cursor-move`}
      style={{
        width: `${segmentWidth}%`,
        left: `${segmentLeft}%`
      }}
      {...bindDrag()}
    />
  );
};
