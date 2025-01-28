import React from "react";
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
    <Input
      type="file"
      accept="audio/mpeg"
      onChange={handleFileChange}
      className="w-full bg-white border border-purple-100 rounded-2xl p-4 text-base file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-600 hover:file:bg-purple-100"
    />
  );
};