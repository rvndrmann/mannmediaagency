import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CustomOrder, CustomOrderMedia, PaymentTransaction } from "@/types/custom-order";
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
import { Loader2, ExternalLink, FileDown, FileText, Calendar, DollarSign, Clock, ShieldCheck, Info } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [paymentInfo, setPaymentInfo] = useState<PaymentTransaction | null>(null);

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
          setOrderMedia(data as unknown as CustomOrderMedia[]);
        }
      } catch (mediaError) {
        console.warn("Error in media fetch:", mediaError);
        setOrderMedia([]);
      }

      // Fetch payment information if order is payment_pending or linked to a payment
      if (orderData && (orderData.status === "payment_pending" || orderData.status === "payment_failed")) {
        try {
          const { data: paymentData, error: paymentError } = await supabase
            .from("payment_transactions")
            .select("*")
            .eq("related_order_id", id)
            .maybeSingle();

          if (!paymentError && paymentData) {
            setPaymentInfo(paymentData as PaymentTransaction);
          }
        } catch (error) {
          console.warn("Error fetching payment info:", error);
        }
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast.error("Failed to load order details");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "PPP p");
  };

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

  const handleContinueToPayment = () => {
    if (!order) return;
    
    window.location.href = `/payment?orderId=${order.id}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="success">Completed</Badge>;
      case "failed":
      case "payment_failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "in_progress":
        return <Badge variant="info">In Progress</Badge>;
      case "payment_pending":
        return <Badge variant="warning">Payment Pending</Badge>;
      default:
        return <Badge variant="warning">Pending</Badge>;
    }
  };

  const getStatusDetails = (status: string) => {
    switch (status) {
      case "completed":
        return {
          icon: <ShieldCheck className="h-4 w-4 text-green-500" />,
          label: "Completed",
          description: "Your order has been completed and delivered successfully.",
          color: "bg-green-600"
        };
      case "failed":
        return {
          icon: <Info className="h-4 w-4 text-red-500" />,
          label: "Failed",
          description: "Your order could not be completed. Please contact support.",
          color: "bg-red-600"
        };
      case "in_progress":
        return {
          icon: <Clock className="h-4 w-4 text-blue-500" />,
          label: "In Progress",
          description: "We are working on your order. This may take some time.",
          color: "bg-blue-600"
        };
      case "payment_pending":
        return {
          icon: <DollarSign className="h-4 w-4 text-yellow-500" />,
          label: "Payment Pending",
          description: "Your order is awaiting payment to proceed.",
          color: "bg-yellow-600"
        };
      case "payment_failed":
        return {
          icon: <DollarSign className="h-4 w-4 text-red-500" />,
          label: "Payment Failed",
          description: "There was an issue with your payment. Please try again.",
          color: "bg-red-600"
        };
      default:
        return {
          icon: <Clock className="h-4 w-4 text-yellow-500" />,
          label: "Pending",
          description: "Your order is pending processing.",
          color: "bg-yellow-600"
        };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {loading ? (
          <div className="space-y-4 py-4">
            <div className="flex justify-between">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-6 w-24" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !order ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">Order not found</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Order Details
                {getStatusBadge(order.status)}
              </DialogTitle>
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
                <div className={`p-3 rounded-md ${getStatusDetails(order.status).color} bg-opacity-10 border border-opacity-20 flex items-start gap-3`}>
                  {getStatusDetails(order.status).icon}
                  <div>
                    <p className="font-medium">{getStatusDetails(order.status).label}</p>
                    <p className="text-sm opacity-80">{getStatusDetails(order.status).description}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Created:</span>
                    </div>
                    <span className="text-sm">{formatDate(order.created_at)}</span>
                  </div>

                  {order.updated_at && order.updated_at !== order.created_at && (
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Updated:</span>
                      </div>
                      <span className="text-sm">{formatDate(order.updated_at)}</span>
                    </div>
                  )}

                  {order.delivered_at && (
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">Delivered:</span>
                      </div>
                      <span className="text-sm">{formatDate(order.delivered_at)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Credits used:</span>
                    </div>
                    <span className="text-sm">{order.credits_used}</span>
                  </div>
                </div>

                {(order.status === "payment_pending" || order.status === "payment_failed") && (
                  <div className="mt-4 p-3 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50">
                    <h3 className="text-sm font-medium flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      Payment Required
                    </h3>
                    {paymentInfo ? (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Amount:</span>
                          <span className="font-medium">₹{paymentInfo.amount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <Badge variant={paymentInfo.status === "completed" ? "success" : "warning"}>
                            {paymentInfo.payment_status || paymentInfo.status}
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        This order requires payment to proceed.
                      </p>
                    )}
                    
                    {order.status === "payment_pending" && (
                      <Button 
                        className="w-full mt-3" 
                        size="sm"
                        onClick={handleContinueToPayment}
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Continue to Payment
                      </Button>
                    )}
                  </div>
                )}

                {order.remark && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Your request:
                    </h3>
                    <div className="bg-muted p-3 rounded-md text-sm whitespace-pre-wrap">
                      {order.remark}
                    </div>
                  </div>
                )}

                {order.admin_notes && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Info className="h-4 w-4 text-blue-500" />
                      Notes from admin:
                    </h3>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md text-sm whitespace-pre-wrap text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-800/30">
                      {order.admin_notes}
                    </div>
                  </div>
                )}

                {order.delivery_message && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-green-500" />
                      Delivery message:
                    </h3>
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md text-sm whitespace-pre-wrap text-green-800 dark:text-green-300 border border-green-100 dark:border-green-800/30">
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
                            {media.original_filename ? (
                              <span className="truncate max-w-[120px] inline-block align-bottom">{media.original_filename}</span>
                            ) : (
                              media.media_type
                            )}
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
