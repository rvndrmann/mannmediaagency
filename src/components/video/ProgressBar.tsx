import React from "react";

interface ProgressBarProps {
  step: number;
  totalSteps: number;
}

export const ProgressBar = ({ step, totalSteps }: ProgressBarProps) => {
  return (
    <div className="mb-8">
      <div className="relative h-2 bg-purple-100 rounded-full mb-3">
        <div
          className="absolute h-full bg-purple-600 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>
      <p className="text-lg text-purple-600 font-medium">
        Step {step}: {step === 1 ? "Language" : step === 2 ? "Voice" : "Script"} ({Math.round((step / totalSteps) * 100)}%)
      </p>
    </div>
  );
};