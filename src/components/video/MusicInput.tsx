import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface MusicInputProps {
  value: File | null;
  onChange: (value: File | null) => void;
}

export const MusicInput = ({ value, onChange }: MusicInputProps) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "audio/mpeg") {
      onChange(file);
    } else {
      onChange(null);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="backgroundMusic" className="text-lg text-purple-700">
        Background Music (MP3)
      </Label>
      <Input
        id="backgroundMusic"
        type="file"
        accept="audio/mpeg"
        onChange={handleFileChange}
        className="w-full p-2 border border-purple-100 rounded-lg focus:ring-purple-500 focus:border-purple-500"
      />
      {value && (
        <p className="text-sm text-purple-600">Selected: {value.name}</p>
      )}
    </div>
  );
};