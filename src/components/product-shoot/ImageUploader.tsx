
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X } from "lucide-react";

interface ImageUploaderProps {
  previewUrl: string | null;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}

export function ImageUploader({ previewUrl, onFileSelect, onClear }: ImageUploaderProps) {
  return (
    <div className="space-y-2">
      <Label className="text-white">Upload Image</Label>
      <div className="relative">
        {!previewUrl ? (
          <div className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center">
            <input
              type="file"
              accept="image/*"
              onChange={onFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-400">Drop an image or click to upload</p>
          </div>
        ) : (
          <div className="relative">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-48 object-cover rounded-lg"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70"
              onClick={onClear}
            >
              <X className="h-4 w-4 text-white" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
