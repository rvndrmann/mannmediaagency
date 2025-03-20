
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, X, Image, File, Upload } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { Attachment } from "@/types/message";

interface FileAttachmentButtonProps {
  onAttach: (attachments: Attachment[]) => void;
}

export function FileAttachmentButton({ onAttach }: FileAttachmentButtonProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newAttachments: Attachment[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileId = uuidv4();
        const fileExt = file.name.split('.').pop();
        const filePath = `chat-attachments/${fileId}.${fileExt}`;
        const isImage = file.type.startsWith('image/');
        
        // Upload file to Supabase storage
        const { error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(filePath, file);
          
        if (uploadError) {
          throw uploadError;
        }
        
        // Get the public URL
        const { data: publicUrlData } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(filePath);
          
        newAttachments.push({
          id: fileId,
          type: isImage ? 'image' : 'file',
          url: publicUrlData.publicUrl,
          name: file.name,
          size: file.size,
          contentType: file.type
        });
      }
      
      onAttach(newAttachments);
      toast.success(`${newAttachments.length} file${newAttachments.length > 1 ? 's' : ''} attached`);
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div>
      <Button 
        type="button" 
        variant="ghost" 
        size="icon" 
        className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8"
        onClick={triggerFileInput}
        disabled={isUploading}
      >
        {isUploading ? (
          <Upload className="h-4 w-4 animate-pulse" />
        ) : (
          <Paperclip className="h-4 w-4" />
        )}
      </Button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        multiple
        accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx"
      />
    </div>
  );
}
