
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CustomOrder, CustomOrderMedia } from "@/types/custom-order";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ExternalLink, FileDown } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface OrderDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
}

export const OrderDetailsDialog = ({
  open,
  onOpenChange,
  orderId,
}: OrderDetailsDialogProps) => {
  const [order, setOrder] = useState<CustomOrder | null>(null);
  const [orderMedia, setOrderMedia] = useState<CustomOrderMedia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && orderId) {
      fetchOrderDetails(orderId);
    }
  }, [open, orderId]);

  const fetchOrderDetails = async (id: string) => {
    setLoading(true);
    try {
      // Fetch order details
      const { data: orderData, error: orderError } = await supabase
        .from("custom_orders")
        .select("*")
        .eq("id", id)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData as CustomOrder);

      try {
        // Fetch order media
        const { data: mediaData, error: mediaError } = await supabase
          .from("custom_order_media")
          .select("*")
          .eq("order_id", id)
          .order("created_at", { ascending: false });

        if (mediaError) {
          console.warn("Error fetching media (table might not exist yet):", mediaError);
          setOrderMedia([]);
        } else {
          setOrderMedia(mediaData as CustomOrderMedia[]);
        }
      } catch (error) {
        console.warn("Error in media fetch:", error);
        setOrderMedia([]);
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "PPP p");
  };

  // Mark related notification as read when opening details
  useEffect(() => {
    if (open && orderId) {
      const markNotificationAsRead = async () => {
        try {
          await supabase
            .from("user_notifications")
            .update({ read: true })
            .eq("related_id", orderId)
            .eq("read", false);
        } catch (error) {
          console.error("Error marking notification as read:", error);
        }
      };

      markNotificationAsRead();
    }
  }, [open, orderId]);

  const downloadMedia = (url: string, filename?: string | null) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || "download";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !order ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">Order not found</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
              <DialogDescription>
                Order #{order.id.slice(0, 8)}...
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="details">
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="details">Order Information</TabsTrigger>
                <TabsTrigger value="media">
                  Media ({orderMedia.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Status:</span>
                    <Badge
                      className={
                        order.status === "completed"
                          ? "bg-green-600"
                          : order.status === "failed"
                          ? "bg-red-600"
                          : order.status === "in_progress"
                          ? "bg-blue-600"
                          : "bg-yellow-600"
                      }
                    >
                      {order.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Created:</span>
                    <span className="text-sm">{formatDate(order.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Updated:</span>
                    <span className="text-sm">{formatDate(order.updated_at)}</span>
                  </div>
                  {order.delivered_at && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Delivered:</span>
                      <span className="text-sm">{formatDate(order.delivered_at)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Credits used:</span>
                    <span className="text-sm">{order.credits_used}</span>
                  </div>
                </div>

                {order.remark && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium mb-2">Your request:</h3>
                    <div className="bg-muted p-3 rounded-md text-sm whitespace-pre-line">
                      {order.remark}
                    </div>
                  </div>
                )}

                {order.delivery_message && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium mb-2">Delivery message:</h3>
                    <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-md text-sm whitespace-pre-line text-green-800 dark:text-green-300">
                      {order.delivery_message}
                    </div>
                  </div>
                )}

                {order.delivery_url && (
                  <div className="mt-4">
                    <Button variant="outline" className="w-full" asChild>
                      <a
                        href={order.delivery_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Delivery Link
                      </a>
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="media" className="mt-4">
                {orderMedia.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground">No media available</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {orderMedia.map((media) => (
                      <div
                        key={media.id}
                        className="border rounded-md overflow-hidden group relative"
                      >
                        {media.media_type === "image" ? (
                          <img
                            src={media.media_url}
                            alt="Order media"
                            className="w-full h-40 object-cover"
                          />
                        ) : (
                          <div className="relative w-full h-40 bg-black">
                            <video
                              src={media.media_url}
                              className="w-full h-full object-contain"
                              controls
                            />
                          </div>
                        )}
                        <div className="p-2 flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">
                            {media.media_type}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadMedia(media.media_url, media.original_filename)}
                          >
                            <FileDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
