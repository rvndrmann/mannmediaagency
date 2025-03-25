
import React from 'react';
import { Button } from "@/components/ui/button";
import { Paperclip } from "lucide-react"; // Fixed casing - Paperclip not PaperClip
import { Attachment } from "@/types/message";
import { v4 as uuidv4 } from "uuid";

export interface FileAttachmentButtonProps {
  onAttach: (attachments: Attachment[]) => void;
  disabled?: boolean;
}

export const FileAttachmentButton: React.FC<FileAttachmentButtonProps> = ({ 
  onAttach, 
  disabled = false 
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const attachments: Attachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Create a new attachment
      const attachment: Attachment = {
        id: uuidv4(),
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file),
        contentType: file.type
      };
      
      attachments.push(attachment);
    }

    if (attachments.length > 0) {
      onAttach(attachments);
    }

    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleButtonClick}
        disabled={disabled}
        className="text-muted-foreground hover:text-foreground"
        type="button"
      >
        <Paperclip className="h-5 w-5" />
      </Button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
      />
    </>
  );
};
