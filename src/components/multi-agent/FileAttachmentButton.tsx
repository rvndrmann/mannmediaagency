import { Button } from "@/components/ui/button";
import { Paperclip } from "lucide-react";
import { useState, useRef } from "react";
import { v4 as uuidv4 } from 'uuid';
import { Attachment } from "@/types/message";
import { toast } from "sonner";

interface FileAttachmentButtonProps {
  onAttach: (attachments: Attachment[]) => void;
  maxFileSize?: number; // in bytes
  acceptedFileTypes?: string;
}

export const FileAttachmentButton = ({ 
  onAttach, 
  maxFileSize = 5 * 1024 * 1024, // 5MB default
  acceptedFileTypes = "image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
}: FileAttachmentButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);

    try {
      const attachments: Attachment[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Check file size
        if (file.size > maxFileSize) {
          toast.error(`File ${file.name} exceeds the maximum size of ${maxFileSize / (1024 * 1024)}MB`);
          continue;
        }

        // Create attachment object
        const attachment = createAttachment(file);

        attachments.push(attachment);
      }

      if (attachments.length > 0) {
        onAttach(attachments);
      }
    } catch (error) {
      console.error("Error processing files:", error);
      toast.error("Failed to attach files");
    } finally {
      setIsLoading(false);
      // Reset the input to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const createAttachment = (file: File): Attachment => {
    const id = uuidv4();
    const url = URL.createObjectURL(file);
    const type = file.type.startsWith('image/') ? 'image' : 'file';
    
    return {
      id,
      url,
      name: file.name,
      type,
      size: file.size,
      contentType: file.type
    };
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept={acceptedFileTypes}
        className="hidden"
      />
      <Button
        variant="outline"
        size="icon"
        onClick={handleButtonClick}
        disabled={isLoading}
        className="h-10 w-10 rounded-full bg-[#262B38] hover:bg-[#2D3240] border-[#3A4055] text-white"
      >
        <Paperclip className={`h-4 w-4 ${isLoading ? "animate-pulse" : ""}`} />
      </Button>
    </>
  );
};
