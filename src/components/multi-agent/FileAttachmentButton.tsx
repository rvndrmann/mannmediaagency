
import React, { useRef } from 'react';
import { Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Attachment } from '@/types/message';
import { v4 as uuidv4 } from 'uuid';

interface FileAttachmentButtonProps {
  onAttach: (attachments: Attachment[]) => void;
  disabled?: boolean;
  maxFileSize?: number; // in bytes, default 10MB
  acceptedFileTypes?: string;
}

export function FileAttachmentButton({ 
  onAttach, 
  disabled = false, 
  maxFileSize = 10 * 1024 * 1024,
  acceptedFileTypes = "image/*,.pdf,.doc,.docx,.txt"
}: FileAttachmentButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
      
      // Validate file size
      if (file.size > maxFileSize) {
        alert(`File ${file.name} is too large. Maximum size is ${maxFileSize / 1024 / 1024}MB.`);
        continue;
      }
      
      try {
        // Create object URL for the file
        const url = URL.createObjectURL(file);
        
        attachments.push({
          id: uuidv4(),
          type: file.type,
          url: url,
          name: file.name,
          size: file.size,
          contentType: file.type
        });
      } catch (error) {
        console.error('Error creating attachment:', error);
      }
    }
    
    if (attachments.length > 0) {
      onAttach(attachments);
    }
    
    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedFileTypes}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleButtonClick}
        disabled={disabled}
        className="h-9 w-9"
      >
        <Paperclip className="h-5 w-5" />
        <span className="sr-only">Attach file</span>
      </Button>
    </>
  );
}
