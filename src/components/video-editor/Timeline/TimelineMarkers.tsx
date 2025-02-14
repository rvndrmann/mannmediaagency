
import React from 'react';

interface TimelineMarkersProps {
  duration: number;
  interval?: number; // in seconds
}

export const TimelineMarkers: React.FC<TimelineMarkersProps> = ({ 
  duration,
  interval = 15 // default to 15 seconds
}) => {
  const markers = [];
  const totalMarkers = Math.floor(duration / interval);

  for (let i = 1; i <= totalMarkers; i++) {
    const position = (i * interval / duration) * 100;
    markers.push(
      <div 
        key={i}
        className="absolute h-full w-px bg-white/20 timeline-marker"
        style={{ left: `${position}%` }}
        data-time={`${i * interval}s`}
      />
    );
  }

  return (
    <div className="relative h-full w-full">
      {markers}
    </div>
  );
};
