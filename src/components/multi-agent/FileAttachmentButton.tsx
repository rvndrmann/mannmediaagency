
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { Attachment } from "@/types/message";
import { supabase } from "@/integrations/supabase/client";

interface FileAttachmentButtonProps {
  onAddAttachment: (attachment: Attachment) => void;
  maxSizeMB?: number;
}

export function FileAttachmentButton({ onAddAttachment, maxSizeMB = 10 }: FileAttachmentButtonProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      toast.error(`File size exceeds ${maxSizeMB}MB limit`);
      return;
    }

    try {
      setIsUploading(true);
      
      // Get user data for folder path
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      const fileId = uuidv4();
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/attachments/${fileId}.${fileExt}`;
      
      // Upload file to storage
      const { error: uploadError, data } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);
      
      // Determine if it's an image
      const isImage = file.type.startsWith('image/');
      
      // Create attachment object
      const attachment: Attachment = {
        id: fileId,
        url: publicUrl,
        name: file.name,
        type: isImage ? 'image' : 'file',
        size: file.size,
      };
      
      // Add content type if available (optional in the type)
      if (file.type) {
        attachment.contentType = file.type;
      }
      
      onAddAttachment(attachment);
      toast.success("File uploaded successfully");
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        aria-label="Attach file"
        title="Attach file"
      >
        {isUploading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        ) : (
          <Paperclip className="h-5 w-5" />
        )}
      </Button>
    </div>
  );
}
