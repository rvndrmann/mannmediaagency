
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MusicUploaderProps {
  onUpload?: (url: string) => void;
}

export const MusicUploader = ({ onUpload }: MusicUploaderProps) => {
  const [backgroundMusic, setBackgroundMusic] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
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
      setBackgroundMusic(file);
      setUploadProgress(0);
      setUploadedFileName(null);

      try {
        const fileExt = file.name.split('.').pop();
        const filePath = `${crypto.randomUUID()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('background-music')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('background-music')
          .getPublicUrl(filePath);

        setUploadProgress(100);
        setUploadedFileName(file.name);
        onUpload?.(publicUrl);

      } catch (error) {
        console.error('Upload error:', error);
        toast({
          title: "Error",
          description: "Failed to upload background music",
          variant: "destructive",
        });
        setUploadProgress(0);
        setUploadedFileName(null);
      }
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="backgroundMusic" className="text-lg text-purple-700">
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
