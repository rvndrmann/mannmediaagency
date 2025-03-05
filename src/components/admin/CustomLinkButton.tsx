
import { useState } from "react";
import { QrCode, Share2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface CustomLinkButtonProps {
  accessCode: string;
  baseUrl: string;
}

export const CustomLinkButton = ({ 
  accessCode, 
  baseUrl 
}: CustomLinkButtonProps) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareAvailable, setShareAvailable] = useState(!!navigator.share);
  
  const fullLink = `${baseUrl}${accessCode}`;
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(fullLink).then(
      () => {
        setCopied(true);
        toast.success("Link copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
      },
      (err) => {
        console.error("Could not copy text: ", err);
        toast.error("Failed to copy link");
      }
    );
  };
  
  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Custom Order Link',
          text: 'Submit your custom order here:',
          url: fullLink,
        });
        toast.success('Link shared successfully');
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      copyToClipboard();
    }
  };
  
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
      >
        <QrCode className="h-4 w-4" />
        <span className="sr-only">QR Code</span>
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Custom Order Link</DialogTitle>
            <DialogDescription>
              Share this link with your clients to let them place custom orders.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center space-x-2 mt-4">
            <div className="grid flex-1 gap-2">
              <Input
                value={fullLink}
                readOnly
                className="w-full"
              />
              {!shareAvailable && (
                <p className="text-xs flex items-center text-muted-foreground">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Direct sharing not available in this browser
                </p>
              )}
            </div>
            <Button 
              type="button" 
              size="icon"
              variant="secondary"
              onClick={copyToClipboard}
            >
              {copied ? <Check className="h-4 w-4" /> : <QrCode className="h-4 w-4" />}
            </Button>
          </div>
          
          <div className="flex justify-center py-6">
            {/* QR code would be rendered here */}
            <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center">
              <QrCode className="h-24 w-24 mx-auto text-gray-400" />
              <p className="text-xs text-muted-foreground mt-2">
                QR Code for Link
              </p>
            </div>
          </div>
          
          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="default"
              onClick={shareLink}
              className="w-full sm:w-auto"
            >
              <Share2 className="mr-2 h-4 w-4" />
              {shareAvailable ? 'Share Link' : 'Copy Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
