
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentTransaction, CustomOrderMedia } from "@/types/custom-order";
import { supabase } from "@/integrations/supabase/client";

interface OrderDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customOrderId: string;
}

export function OrderDetailsDialog({ open, onOpenChange, customOrderId }: OrderDetailsDialogProps) {
  const [paymentTransactions, setPaymentTransactions] = useState<PaymentTransaction[]>([]);
  const [orderMedia, setOrderMedia] = useState<CustomOrderMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open && customOrderId) {
      const fetchOrderDetails = async () => {
        setIsLoading(true);
        try {
          // Fetch payment transactions
          const { data: transactionsData, error: transactionsError } = await supabase
            .from("payment_transactions")
            .select("*")
            .eq("related_order_id", customOrderId);

          if (transactionsError) throw transactionsError;

          // Map the transactions to match the PaymentTransaction interface
          const mappedTransactions = transactionsData.map((transaction: any) => ({
            id: transaction.id,
            created_at: transaction.created_at,
            updated_at: transaction.updated_at,
            user_id: transaction.user_id,
            amount: transaction.amount,
            status: transaction.status,
            transaction_id: transaction.transaction_id || transaction.payu_transaction_id,
            payment_processor: transaction.payment_processor || "PayU",
            related_order_id: transaction.related_order_id || customOrderId,
            gateway_response: transaction.payment_response || transaction.payu_data,
            payment_method: transaction.payment_method,
            payment_status: transaction.payment_status,
            payu_data: transaction.payu_data,
            payu_transaction_id: transaction.payu_transaction_id,
            webhook_received_at: transaction.webhook_received_at,
            payment_response: transaction.payment_response
          }));

          setPaymentTransactions(mappedTransactions);

          // Fetch order media
          const { data: mediaData, error: mediaError } = await supabase
            .from("custom_order_media")
            .select("*")
            .eq("order_id", customOrderId);

          if (mediaError) throw mediaError;
          setOrderMedia(mediaData);

        } catch (error) {
          console.error("Error fetching order details:", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchOrderDetails();
    }
  }, [open, customOrderId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Order Details</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="media">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>

          <TabsContent value="media" className="mt-4">
            {isLoading ? (
              <p>Loading media files...</p>
            ) : orderMedia.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orderMedia.map((media) => (
                  <div key={media.id} className="border rounded-md p-2">
                    {media.media_type === "image" ? (
                      <img 
                        src={media.media_url} 
                        alt={media.original_filename || "Order media"} 
                        className="w-full h-auto rounded-md"
                      />
                    ) : (
                      <video
                        src={media.media_url}
                        controls
                        className="w-full h-auto rounded-md"
                      />
                    )}
                    <p className="text-sm mt-2 truncate">{media.original_filename || media.filename || "File"}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p>No media files found for this order.</p>
            )}
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            {isLoading ? (
              <p>Loading payment information...</p>
            ) : paymentTransactions.length > 0 ? (
              <div className="border rounded-md overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Processor</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paymentTransactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {new Date(transaction.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          ₹{transaction.amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {transaction.status}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {transaction.payment_processor}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No payment transactions found for this order.</p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
