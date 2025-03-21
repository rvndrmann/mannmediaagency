
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomOrder, CustomOrderMedia } from "@/types/custom-order";
import { Badge } from "@/components/ui/badge";
import { Link, Calendar, CheckCircle2, AlarmClock, FileText, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { OrderOrchestrationPanel } from "@/components/admin/OrderOrchestrationPanel";
import { useOrderOrchestration } from "@/hooks/use-order-orchestration";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";

interface OrderDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: CustomOrder | null;
  isAdmin?: boolean;
}

export const OrderDetailsDialog: React.FC<OrderDetailsDialogProps> = ({
  open,
  onOpenChange,
  order,
  isAdmin = false
}) => {
  const [deliveryUrl, setDeliveryUrl] = useState("");
  const [deliveryMessage, setDeliveryMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  const handleDeliverOrder = async () => {
    if (!order || !deliveryUrl) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc('deliver_custom_order', {
        order_id_param: order.id,
        delivery_url_param: deliveryUrl,
        delivery_message_param: deliveryMessage || 'Your custom order has been delivered.'
      });
      
      if (error) throw error;
      
      toast.success("Order delivered successfully");
      onOpenChange(false);
    } catch (error) {
      console.error("Error delivering order:", error);
      toast.error("Failed to deliver order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'outline';
      case 'in_progress':
        return 'secondary';
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getMediaTypeBadge = (type: string) => {
    switch (type) {
      case 'image':
        return { label: 'Image', variant: 'outline' as const, icon: <ImageIcon className="h-3 w-3 mr-1" /> };
      case 'video':
        return { label: 'Video', variant: 'secondary' as const, icon: <FileText className="h-3 w-3 mr-1" /> };
      default:
        return { label: type, variant: 'outline' as const, icon: <FileText className="h-3 w-3 mr-1" /> };
    }
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Custom Order Details</span>
            <Badge variant={getStatusBadgeVariant(order.status)}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Order submitted on {format(new Date(order.created_at), 'PPP')}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 lg:grid-cols-3">
            <TabsTrigger value="details">Order Details</TabsTrigger>
            <TabsTrigger value="media">Media & Assets</TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="orchestration">Orchestration</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Order Remarks</h3>
                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md">
                  {order.remark || "No remarks provided."}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium flex items-center mb-1">
                    <Calendar className="h-4 w-4 mr-1" />
                    Submitted Date
                  </h3>
                  <p className="text-sm text-gray-500">
                    {format(new Date(order.created_at), 'PPP p')}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium flex items-center mb-1">
                    <AlarmClock className="h-4 w-4 mr-1" />
                    Status
                  </h3>
                  <Badge variant={getStatusBadgeVariant(order.status)}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                </div>
              </div>

              {order.status === 'completed' && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium flex items-center">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Delivery Details
                  </h3>
                  
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md">
                    <p className="mb-2">{order.delivery_message || "Your order has been delivered."}</p>
                    {order.delivery_url && (
                      <Button variant="outline" size="sm" asChild className="gap-1">
                        <a href={order.delivery_url} target="_blank" rel="noopener noreferrer">
                          <Link className="h-4 w-4 mr-1" />
                          View Delivered Product
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {isAdmin && order.status !== 'completed' && (
              <div className="space-y-2 pt-4 border-t">
                <h3 className="text-sm font-medium">Deliver This Order</h3>
                
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Delivery URL"
                    className="w-full p-2 border rounded"
                    value={deliveryUrl}
                    onChange={(e) => setDeliveryUrl(e.target.value)}
                  />
                  
                  <textarea
                    placeholder="Delivery message (optional)"
                    className="w-full p-2 border rounded"
                    rows={3}
                    value={deliveryMessage}
                    onChange={(e) => setDeliveryMessage(e.target.value)}
                  />
                  
                  <Button 
                    onClick={handleDeliverOrder} 
                    disabled={!deliveryUrl || isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting ? "Delivering..." : "Deliver Order"}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="media" className="space-y-4">
            {order.custom_order_media && order.custom_order_media.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(order.custom_order_media as CustomOrderMedia[]).map((media) => (
                  <Card key={media.id} className="overflow-hidden border">
                    <div className="aspect-w-16 aspect-h-9 bg-gray-100 dark:bg-gray-800">
                      {media.media_type === 'image' ? (
                        <img 
                          src={media.media_url} 
                          alt={media.original_filename || 'Order media'} 
                          className="object-cover w-full h-full"
                        />
                      ) : media.media_type === 'video' ? (
                        <video 
                          src={media.media_url} 
                          controls
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <FileText className="h-10 w-10 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <div className="truncate text-sm">
                        {media.original_filename || 'Unnamed file'}
                      </div>
                      <Badge variant={getMediaTypeBadge(media.media_type).variant} className="ml-2 flex items-center">
                        {getMediaTypeBadge(media.media_type).icon}
                        {getMediaTypeBadge(media.media_type).label}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No media attachments for this order.</p>
              </div>
            )}
          </TabsContent>

          {isAdmin && (
            <TabsContent value="orchestration">
              <OrderOrchestrationPanel orderId={order.id} />
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
