import React from "react";

interface ProgressBarProps {
  step: number;
  totalSteps: number;
}

export const ProgressBar = ({ step, totalSteps }: ProgressBarProps) => {
  const getStepLabel = (step: number) => {
    switch (step) {
      case 1:
        return "Language";
      case 2:
        return "Voice";
      case 3:
        return "Script";
      default:
        return "";
    }
  };

  return (
    <div className="mb-6">
      <div className="relative h-2 bg-purple-100 rounded-full mb-2">
        <div
          className="absolute h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>
      <p className="text-sm text-purple-700 font-medium">
        Step {step}: {getStepLabel(step)} ({Math.round((step / totalSteps) * 100)}%)
      </p>
    </div>
  );
};