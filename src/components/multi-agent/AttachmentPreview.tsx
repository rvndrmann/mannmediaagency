
import React from 'react';
import { X } from 'lucide-react';
import { Attachment } from '@/types/message';
import { Button } from '@/components/ui/button';

interface AttachmentPreviewProps {
  attachments: Attachment[];
  onRemove: (id: string) => void;
}

export function AttachmentPreview({ attachments, onRemove }: AttachmentPreviewProps) {
  if (attachments.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-2 p-2">
      {attachments.map((attachment) => (
        <div 
          key={attachment.id} 
          className="relative group bg-gray-100 rounded-md p-1 border border-gray-200"
        >
          {attachment.type.startsWith('image/') ? (
            <div className="relative w-24 h-24">
              <img 
                src={attachment.url} 
                alt={attachment.name} 
                className="w-full h-full object-cover rounded-md" 
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full opacity-90 group-hover:opacity-100"
                onClick={() => onRemove(attachment.id)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-2 py-1">
              <div className="text-xs truncate max-w-[120px]">{attachment.name}</div>
              <Button
                variant="destructive"
                size="icon"
                className="w-5 h-5 rounded-full"
                onClick={() => onRemove(attachment.id)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
