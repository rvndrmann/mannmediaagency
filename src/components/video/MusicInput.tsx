import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

interface MusicInputProps {
  value: File | null;
  onChange: (value: File | null) => void;
}

export const MusicInput = ({ value, onChange }: MusicInputProps) => {
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "audio/mpeg") {
      onChange(file);
      // Simulate upload progress
      setUploadProgress(0);
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 200);
    } else {
      onChange(null);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-2">
      <Input
        type="file"
        accept="audio/mpeg"
        onChange={handleFileChange}
        className="w-full bg-white border border-purple-100 rounded-2xl p-4 text-base file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-600 hover:file:bg-purple-100"
      />
      {value && (
        <div className="w-full">
          <Progress value={uploadProgress} className="h-2 bg-purple-100" indicatorClassName="bg-purple-600" />
          <p className="text-sm text-gray-500 mt-1">
            {uploadProgress < 100 ? "Uploading..." : "Upload complete"}
          </p>
        </div>
      )}
    </div>
  );
};