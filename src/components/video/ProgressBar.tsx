import React from "react";

interface ProgressBarProps {
  step: number;
  totalSteps: number;
}

export const ProgressBar = ({ step, totalSteps }: ProgressBarProps) => {
  return (
    <div className="mb-4">
      <div className="relative h-1.5 bg-purple-100 rounded-full mb-2">
        <div
          className="absolute h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>
      <p className="text-xs text-purple-700 font-medium">
        Step {step}: {step === 1 ? "Language" : step === 2 ? "Voice" : "Script"} (
        {Math.round((step / totalSteps) * 100)}%)
      </p>
    </div>
  );
};