
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, UploadCloud } from "lucide-react";
import { useSupabaseUpload } from "@/hooks/use-supabase-upload";
import { toast } from "sonner";

interface FileUploaderProps {
  label: string;
  accept: string;
  onFileUploaded: (url: string) => void;
  buttonText: string;
}

export function FileUploader({ label, accept, onFileUploaded, buttonText }: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  
  const {
    uploadProgress,
    uploadedFileName,
    handleFileUpload
  } = useSupabaseUpload();
  
  const fileType = accept.startsWith('video') 
    ? 'video' 
    : accept.startsWith('audio') 
      ? 'audio' 
      : 'image';
  
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    
    try {
      const bucket = fileType === 'video' ? 'videos' : fileType === 'audio' ? 'audio' : 'images';
      const url = await handleFileUpload(file, bucket, fileType as 'audio' | 'image' | 'video');
      
      if (url) {
        onFileUploaded(url);
        toast.success(`${label} uploaded successfully`);
      }
    } catch (error) {
      console.error(`${label} upload error:`, error);
      toast.error(`Failed to upload ${label.toLowerCase()}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            type="file"
            accept={accept}
            onChange={handleUpload}
            disabled={isUploading}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:bg-primary-50 file:text-primary hover:file:bg-primary-100"
          />
        </div>
      </div>
      
      {uploadProgress > 0 && (
        <div className="w-full">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all" 
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs mt-1 text-gray-500">
            {uploadProgress < 100 
              ? `Uploading: ${uploadProgress}%` 
              : `Upload complete: ${uploadedFileName}`}
          </p>
        </div>
      )}
    </div>
  );
}
