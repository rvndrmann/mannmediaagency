import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CustomOrder, CustomOrderMedia, PaymentTransaction } from "@/types/custom-order";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ExternalLink, FileDown, Calendar, DollarSign, Clock, ShieldCheck, Info, File } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface OrderDetailsDialogProps {
  orderId: string | null;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function OrderDetailsDialog({ orderId, trigger, open, onOpenChange }: OrderDetailsDialogProps) {
  const [order, setOrder] = useState<CustomOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [orderMedia, setOrderMedia] = useState<CustomOrderMedia[]>([]);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentTransaction[]>([]);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;
      
      try {
        setLoading(true);
        
        // Fetch order details
        const { data, error } = await supabase
          .from("custom_orders")
          .select("*")
          .eq("id", orderId)
          .single();
        
        if (error) {
          console.error("Error fetching order:", error);
          return;
        }
        
        // Cast the data to CustomOrder type
        setOrder(data as CustomOrder);
        
        // Fetch order media
        try {
          const { data: mediaData, error: mediaError } = await supabase
            .from("custom_order_media")
            .select("*")
            .eq("order_id", orderId)
            .order("created_at", { ascending: false });
          
          if (mediaError) {
            console.warn("Error fetching media (table might not exist yet):", mediaError);
            setOrderMedia([]);
          } else {
            // Map and ensure each media item has a filename property derived from original_filename
            const mappedMedia = mediaData.map(item => ({
              ...item,
              filename: item.original_filename || `file-${item.id.substring(0, 8)}`
            })) as CustomOrderMedia[];
            
            setOrderMedia(mappedMedia);
          }
        } catch (mediaError) {
          console.warn("Error in media fetch:", mediaError);
          setOrderMedia([]);
        }
        
        // Fetch payment transactions
        try {
          const { data: paymentData, error: paymentError } = await supabase
            .from("payment_transactions")
            .select("*")
            .eq("related_order_id", orderId)
            .order("created_at", { ascending: false });
          
          if (paymentError) {
            console.warn("Error fetching payment history:", paymentError);
            setPaymentHistory([]);
          } else {
            setPaymentHistory(paymentData as PaymentTransaction[]);
          }
        } catch (paymentError) {
          console.warn("Error in payment history fetch:", paymentError);
          setPaymentHistory([]);
        }
      } catch (error) {
        console.error("Error in fetchOrder:", error);
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "in_progress":
        return "bg-blue-500";
      case "completed":
        return "bg-green-500";
      case "canceled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500";
      case "pending":
        return "bg-yellow-500";
      case "failed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const handleDownloadMedia = async (media: CustomOrderMedia) => {
    try {
      setDownloadLoading(true);
      
      const { data, error } = await supabase.storage
        .from("custom_order_media")
        .download(`${media.order_id}/${media.filename}`);
      
      if (error) {
        throw error;
      }
      
      // Create download link
      const blob = new Blob([data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = media.filename || `file-${media.id.substring(0, 8)}`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("Download started");
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Failed to download file");
    } finally {
      setDownloadLoading(false);
    }
  };

  // If this is a controlled component with open and onOpenChange props
  if (open !== undefined && onOpenChange) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {renderDialogContent()}
        </DialogContent>
      </Dialog>
    );
  }

  // Otherwise use the uncontrolled version with trigger
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {renderDialogContent()}
      </DialogContent>
    </Dialog>
  );

  function renderDialogContent() {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!order) {
      return (
        <div className="text-center py-8">
          <p className="text-red-500">Order not found</p>
        </div>
      );
    }

    return (
      <>
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            Order #{order.order_number || order.id.slice(0, 8)}
            <Badge className={getStatusColor(order.status)}>
              {order.status.replace("_", " ")}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Created on {format(new Date(order.created_at), "PPP")}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="details" className="flex-1">Order Details</TabsTrigger>
            <TabsTrigger value="deliverables" className="flex-1">Deliverables</TabsTrigger>
            <TabsTrigger value="payment" className="flex-1">Payment</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-500">Order Type</h3>
                <p className="font-medium">{order.service_type || "Custom Order"}</p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-500">Price</h3>
                <p className="font-medium">${order.amount || order.credits_used}</p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-500">Created</h3>
                <p className="font-medium flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {format(new Date(order.created_at), "PPP")}
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-500">Status</h3>
                <Badge className={getStatusColor(order.status)}>
                  {order.status.replace("_", " ")}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-500">Description</h3>
              <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-md whitespace-pre-wrap">
                {order.description || order.remark || "No description provided"}
              </div>
            </div>

            {order.requirements && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-500">Requirements</h3>
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-md whitespace-pre-wrap">
                  {order.requirements}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="deliverables" className="pt-4 space-y-4">
            {orderMedia.length === 0 ? (
              <div className="text-center py-8 bg-gray-100 dark:bg-gray-800 rounded-md">
                <File className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">No deliverables available yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {orderMedia.map((media) => (
                  <div
                    key={media.id}
                    className="p-4 border rounded-md flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <File className="h-8 w-8 mr-3 text-blue-500" />
                      <div>
                        <p className="font-medium">{media.filename}</p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(media.created_at), "PPP")}
                        </p>
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadMedia(media)}
                      disabled={downloadLoading}
                    >
                      {downloadLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <FileDown className="h-4 w-4 mr-2" />
                      )}
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="payment" className="pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-500">Total Amount</h3>
                <p className="text-xl font-bold flex items-center">
                  <DollarSign className="h-5 w-5" />
                  {order.amount || order.credits_used}
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-500">Payment Status</h3>
                <Badge className={getPaymentStatusColor(order.payment_status || "pending")}>
                  {order.payment_status || "pending"}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-500">Payment History</h3>
              {paymentHistory.length === 0 ? (
                <div className="text-center py-8 bg-gray-100 dark:bg-gray-800 rounded-md">
                  <Info className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">No payment history available</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {paymentHistory.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="p-4 border rounded-md flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center">
                          {transaction.status === "paid" ? (
                            <ShieldCheck className="h-5 w-5 text-green-500 mr-2" />
                          ) : (
                            <Clock className="h-5 w-5 text-yellow-500 mr-2" />
                          )}
                          <p className="font-medium">
                            {transaction.payment_method || "Online Payment"}
                          </p>
                        </div>
                        <p className="text-sm text-gray-500">
                          {format(new Date(transaction.created_at), "PPP 'at' p")}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-bold">${transaction.amount}</p>
                        <Badge className={getPaymentStatusColor(transaction.status)}>
                          {transaction.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex justify-end">
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </div>
      </>
    );
  }
}
