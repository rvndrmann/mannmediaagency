
import React from 'react';
import { Attachment } from '@/types/message';
import { Paperclip, X, FileText, Image, File } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AttachmentPreviewProps {
  attachments: Attachment[];
  isRemovable?: boolean;
  onRemove?: (id: string) => void;
}

export function AttachmentPreview({
  attachments,
  isRemovable = false,
  onRemove
}: AttachmentPreviewProps) {
  // Function to get appropriate icon based on file type
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    } else if (type.startsWith('text/')) {
      return <FileText className="h-4 w-4" />;
    } else {
      return <File className="h-4 w-4" />;
    }
  };

  // Format file size
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-wrap gap-2">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="relative flex items-center space-x-2 bg-muted/50 border border-muted p-2 rounded-md"
        >
          {attachment.type.startsWith('image/') ? (
            <div className="relative w-10 h-10 rounded overflow-hidden">
              <img
                src={attachment.url}
                alt={attachment.name}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="w-8 h-8 flex items-center justify-center bg-muted rounded">
              {getFileIcon(attachment.type)}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate w-24 sm:w-32 md:w-48">
              {attachment.name}
            </p>
            {attachment.size && (
              <p className="text-xs text-muted-foreground">
                {formatFileSize(attachment.size)}
              </p>
            )}
          </div>
          
          {isRemovable && onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground hover:text-foreground"
              onClick={() => onRemove(attachment.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
