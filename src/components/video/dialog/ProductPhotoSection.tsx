
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ProductPhotoSectionProps {
  uploadProgress: number;
  uploadedFileName: string | null;
  previewUrl: string | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ProductPhotoSection = ({
  uploadProgress,
  uploadedFileName,
  previewUrl,
  onFileChange,
}: ProductPhotoSectionProps) => {
  return (
    <div className="space-y-4">
      <Label htmlFor="productPhoto" className="text-xl text-purple-600">
        Product Photo
      </Label>
      <div className="space-y-2">
        <Input
          id="productPhoto"
          type="file"
          accept="image/*"
          onChange={onFileChange}
          className="w-full p-2 border border-purple-100 rounded-lg focus:ring-purple-500 focus:border-purple-500"
        />
        {uploadProgress > 0 && (
          <div className="space-y-1">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-sm text-purple-600">
              {uploadProgress === 100 ? 'Upload complete!' : `Uploading: ${Math.round(uploadProgress)}%`}
            </p>
          </div>
        )}
        {previewUrl && (
          <div className="mt-4">
            <img 
              src={previewUrl} 
              alt="Product preview" 
              className="max-w-[200px] rounded-lg border border-purple-200"
            />
          </div>
        )}
        {uploadedFileName && uploadProgress === 100 && (
          <div className="flex items-center gap-2 text-green-600 mt-2">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Uploaded: {uploadedFileName}</span>
          </div>
        )}
      </div>
    </div>
  );
};
