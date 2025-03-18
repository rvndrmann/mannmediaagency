
import { X, ExternalLink, Download, File, FileText, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Attachment } from "@/types/message";

interface AttachmentPreviewProps {
  attachments: Attachment[];
  onRemove?: (id: string) => void;
  isRemovable?: boolean;
}

export function AttachmentPreview({ attachments, onRemove, isRemovable = true }: AttachmentPreviewProps) {
  if (!attachments || attachments.length === 0) return null;
  
  const getFileIcon = (attachment: Attachment) => {
    if (attachment.type === 'image') return <ImageIcon className="h-4 w-4" />;
    
    const contentType = attachment.contentType || '';
    
    if (contentType.includes('pdf')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };
  
  const handleDownload = (attachment: Attachment) => {
    window.open(attachment.url, '_blank');
  };
  
  return (
    <div className="space-y-2 mt-2">
      {attachments.map(attachment => (
        <div 
          key={attachment.id} 
          className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10"
        >
          {getFileIcon(attachment)}
          
          <div className="flex-1 truncate text-sm">
            {attachment.name}
          </div>
          
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              onClick={() => handleDownload(attachment)}
            >
              <Download className="h-3 w-3" />
            </Button>
            
            {isRemovable && onRemove && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-red-400 hover:text-red-300" 
                onClick={() => onRemove(attachment.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
