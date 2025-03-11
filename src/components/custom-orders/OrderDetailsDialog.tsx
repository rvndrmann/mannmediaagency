
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface OrderDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
}

export const OrderDetailsDialog = ({
  open,
  onOpenChange,
  order,
}: OrderDetailsDialogProps) => {
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && order) {
      fetchMediaItems();
    }
  }, [open, order]);

  const fetchMediaItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('custom_order_media')
        .select('*')
        .eq('order_id', order.id);

      if (error) throw error;
      setMediaItems(data || []);
    } catch (error) {
      console.error('Error fetching media items:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      'pending': { color: 'bg-yellow-500', label: 'Pending' },
      'processing': { color: 'bg-blue-500', label: 'Processing' },
      'completed': { color: 'bg-green-500', label: 'Completed' },
      'delivered': { color: 'bg-purple-500', label: 'Delivered' },
      'cancelled': { color: 'bg-red-500', label: 'Cancelled' },
    };

    const badgeInfo = statusMap[status] || { color: 'bg-gray-500', label: status };

    return (
      <Badge 
        className={`${badgeInfo.color} text-white capitalize`}
      >
        {badgeInfo.label}
      </Badge>
    );
  };

  if (!order) return null;

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMMM d, yyyy h:mm a');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Order Details</span>
            {getStatusBadge(order.status)}
          </DialogTitle>
          <DialogDescription>
            Created on {formatDate(order.created_at)}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-1">Order Type</h4>
                <p className="text-muted-foreground">
                  {order.order_link_id?.title || 'Custom Order'}
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-1">Credits Used</h4>
                <p className="text-muted-foreground">{order.credits_used}</p>
              </div>
            </div>

            {order.remark && (
              <div>
                <h4 className="font-medium mb-1">Your Remarks</h4>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {order.remark}
                </p>
              </div>
            )}

            {order.delivery_message && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-1">Delivery Message</h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {order.delivery_message}
                  </p>
                </div>
              </>
            )}

            {order.delivery_url && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-1">Delivery Link</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1"
                    onClick={() => window.open(order.delivery_url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Delivery Link
                  </Button>
                </div>
              </>
            )}

            {mediaItems.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-2">Delivered Files</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {mediaItems.map((media) => (
                      <div
                        key={media.id}
                        className="border rounded-md overflow-hidden flex flex-col"
                      >
                        <div className="aspect-square bg-gray-100 relative">
                          {media.media_type === 'image' ? (
                            <img
                              src={media.media_url}
                              alt="Order media"
                              className="w-full h-full object-cover"
                            />
                          ) : media.media_type === 'video' ? (
                            <video
                              src={media.media_url}
                              controls
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">
                              {media.original_filename || 'File'}
                            </div>
                          )}
                        </div>
                        <div className="p-2 flex justify-between items-center">
                          <span className="text-xs truncate">
                            {media.original_filename || 'File'}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => window.open(media.media_url, '_blank')}
                            title="Download file"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
