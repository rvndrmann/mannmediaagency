
import { Button } from "@/components/ui/button";
import { ImageIcon, X } from "lucide-react";

interface ImageUploaderProps {
  previewUrl: string | null;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  aspectRatio: number;
  helpText?: string;
}

export function ImageUploader({ 
  previewUrl, 
  onFileSelect, 
  onClear,
  aspectRatio,
  helpText
}: ImageUploaderProps) {
  return (
    <div className="space-y-2">
      <div 
        className="relative w-full bg-gray-900 rounded-lg border-2 border-dashed border-gray-700 hover:border-gray-600 transition-colors"
        style={{ paddingBottom: `${(1 / aspectRatio) * 100}%` }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          {previewUrl ? (
            <>
              <img
                src={previewUrl}
                alt="Preview"
                className="absolute inset-0 w-full h-auto max-w-full object-cover rounded-lg"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                onClick={onClear}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
              <ImageIcon className="h-8 w-8 text-gray-500" />
              <span className="mt-2 text-sm text-gray-500">{helpText || "Click to upload"}</span>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={onFileSelect}
              />
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
