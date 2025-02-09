
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MusicUploaderSectionProps {
  uploadProgress: number;
  uploadedFileName: string | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const MusicUploaderSection = ({
  uploadProgress,
  uploadedFileName,
  onFileChange,
}: MusicUploaderSectionProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="backgroundMusic" className="text-xl text-purple-600">
        Background Music
      </Label>
      <div className="space-y-2">
        <Input
          id="backgroundMusic"
          type="file"
          accept="audio/*"
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
