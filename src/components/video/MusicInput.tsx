import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface MusicInputProps {
  value: string;
  onChange: (value: string) => void;
}

export const MusicInput = ({ value, onChange }: MusicInputProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="backgroundMusic" className="text-lg text-purple-700">
        Background Music
      </Label>
      <Input
        id="backgroundMusic"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter music URL or leave empty for default"
        className="w-full p-2 border border-purple-100 rounded-lg focus:ring-purple-500 focus:border-purple-500"
      />
    </div>
  );
};