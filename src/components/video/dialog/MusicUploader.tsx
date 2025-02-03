import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MusicUploaderProps {
  onFileUpload: (file: File) => void;
  uploadProgress: number;
}

export const MusicUploader = ({ onFileUpload, uploadProgress }: MusicUploaderProps) => {
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        toast({
          title: "Error",
          description: "Please upload an audio file",
          variant: "destructive",
        });
        return;
      }
      onFileUpload(file);
    }
  };

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
          onChange={handleFileChange}
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
      </div>
    </div>
  );
};