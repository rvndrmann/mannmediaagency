import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface SourceInputProps {
  value: string;
  onChange: (value: string) => void;
}

export const SourceInput = ({ value, onChange }: SourceInputProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="source" className="text-lg text-purple-700">
        Script or Idea <span className="text-red-500">*</span>
      </Label>
      <Input
        id="source"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter your script or idea"
        className="w-full p-2 border border-purple-100 rounded-lg focus:ring-purple-500 focus:border-purple-500"
      />
    </div>
  );
};