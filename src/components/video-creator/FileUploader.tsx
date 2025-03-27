
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface FileUploaderProps {
  label: string;
  accept: string;
  onFileUploaded: (url: string) => void;
  buttonText?: string;
}

export function FileUploader({ 
  label, 
  accept, 
  onFileUploaded, 
  buttonText = "Upload File" 
}: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      uploadFile(selectedFile);
    }
  };

  const clearFile = () => {
    setFile(null);
    setUploadProgress(0);
    setUploadedFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadFile = async (selectedFile: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Determine bucket based on file type
      const isVideo = selectedFile.type.startsWith('video/');
      const isAudio = selectedFile.type.startsWith('audio/');
      
      let bucketName = isVideo ? 'videos' : (isAudio ? 'audio' : 'media');
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);
      
      // Create random filename with original extension
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      // Upload file to Supabase
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });
        
      clearInterval(progressInterval);
      
      if (error) {
        throw error;
      }
      
      // Get public URL for the file
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);
      
      setUploadProgress(100);
      setUploadedFileName(selectedFile.name);
      onFileUploaded(publicUrl);
      
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
      clearFile();
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="relative">
        {file ? (
          <div className="border rounded-md p-3 flex justify-between items-center">
            <div className="truncate flex-1">
              <p className="text-sm truncate">{file.name}</p>
              {uploadProgress > 0 && (
                <div className="space-y-1 mt-2">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {uploadProgress === 100 ? 'Upload complete!' : `Uploading: ${Math.round(uploadProgress)}%`}
                  </p>
                </div>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={clearFile}
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full justify-start"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            {buttonText}
          </Button>
        )}
        <input
          type="file"
          ref={fileInputRef}
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      {uploadedFileName && uploadProgress === 100 && (
        <div className="flex items-center gap-2 text-green-600 mt-2">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm">Uploaded: {uploadedFileName}</span>
        </div>
      )}
    </div>
  );
}
