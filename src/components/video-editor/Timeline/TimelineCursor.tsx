
import React from 'react';

interface TimelineCursorProps {
  currentTime: number;
  duration: number;
}

export const TimelineCursor: React.FC<TimelineCursorProps> = ({
  currentTime,
  duration
}) => {
  const position = (currentTime / duration) * 100;

  return (
    <div 
      className="absolute top-0 h-full w-0.5 bg-blue-500 z-10"
      style={{ left: `${position}%` }}
    >
      <div className="absolute -top-1 -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full" />
    </div>
  );
};
