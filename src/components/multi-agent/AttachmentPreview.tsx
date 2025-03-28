
import { useState } from "react";
import { X, FileText, Image as ImageIcon, Eye, Download } from "lucide-react";
import { Attachment } from "@/types/message";
import { Button } from "@/components/ui/button";

interface AttachmentPreviewProps {
  attachments: Attachment[];
  onRemove?: (id: string) => void;
  isRemovable?: boolean;
}

export function AttachmentPreview({ 
  attachments, 
  onRemove,
  isRemovable = false 
}: AttachmentPreviewProps) {
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);

  const getFileIcon = (attachment: Attachment) => {
    if (attachment.type === 'image') {
      return <ImageIcon className="h-4 w-4 text-blue-500" />;
    }
    return <FileText className="h-4 w-4 text-gray-500" />;
  };

  const getFileExtension = (attachment: Attachment) => {
    if (!attachment.name) return '';
    const parts = attachment.name.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : '';
  };

  const handlePreview = (attachment: Attachment) => {
    setSelectedAttachment(attachment);
    
    // For files with URLs, open in new tab
    if (attachment.url) {
      window.open(attachment.url, '_blank');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {attachments.map((attachment) => (
        <div 
          key={attachment.id} 
          className="relative group flex items-center space-x-2 bg-gray-800/40 backdrop-blur-sm p-2 rounded-md border border-white/10"
        >
          <div className="flex items-center space-x-2">
            {getFileIcon(attachment)}
            <div>
              <p className="text-xs truncate max-w-[150px]">{attachment.name}</p>
              <p className="text-[10px] text-gray-400">
                {getFileExtension(attachment)} • {formatFileSize(attachment.size)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            {attachment.url && (
              <button 
                onClick={() => handlePreview(attachment)}
                className="text-white/60 hover:text-white p-1 rounded"
              >
                <Eye className="h-3 w-3" />
              </button>
            )}
            
            {isRemovable && onRemove && (
              <button 
                onClick={() => onRemove(attachment.id)} 
                className="text-white/60 hover:text-white p-1 rounded"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
