
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
            <div className="relative w-10 h-10 rounded overflow-hidden bg-muted">
              <img
                src={attachment.url}
                alt={attachment.name}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          ) : attachment.type.startsWith('video/') ? (
            <div className="relative w-16 h-10 rounded overflow-hidden bg-muted">
              {/* Basic video preview - consider adding controls or a play icon overlay */}
              <video
                src={attachment.url}
                className="absolute inset-0 h-full w-full object-cover"
                preload="metadata" // Load enough to get dimensions/thumbnail
              />
            </div>
          ) : attachment.type.startsWith('audio/') ? (
            <div className="w-10 h-10 flex items-center justify-center bg-muted rounded">
              {/* Basic audio icon - consider adding playback controls on hover/click */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0L19.414 6.27a1 1 0 010 1.414l-3.343 3.343a1 1 0 01-1.414-1.414L16.586 8 14.657 6.071a1 1 0 010-1.414zm-2.829 5.657a1 1 0 011.415 0L16.586 12l-1.929 1.929a1 1 0 11-1.415-1.414l.515-.515a.5.5 0 000-.707l-.515-.515a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          ) : (
            <div className="w-8 h-8 flex items-center justify-center bg-muted rounded">
              {getFileIcon(attachment.mimeType || attachment.type)} {/* Pass mimeType if available */}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate w-24 sm:w-32 md:w-40 lg:w-48" title={attachment.name}> {/* Added title attribute */}
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
