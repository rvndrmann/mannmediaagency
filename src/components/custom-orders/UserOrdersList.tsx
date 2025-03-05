
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CustomOrder } from "@/types/custom-order";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Loader2, EyeIcon } from "lucide-react";
import { OrderDetailsDialog } from "./OrderDetailsDialog";
import { Badge } from "@/components/ui/badge";

export const UserOrdersList = () => {
  const [orders, setOrders] = useState<CustomOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    fetchOrders();

    // Set up realtime subscription for order updates
    const channel = supabase
      .channel('public:custom_orders')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'custom_orders' }, 
        (payload) => {
          const updatedOrder = payload.new as CustomOrder;
          setOrders(prev => 
            prev.map(order => 
              order.id === updatedOrder.id ? updatedOrder : order
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("custom_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data as CustomOrder[]);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (orderId: string) => {
    setSelectedOrderId(orderId);
    setDetailsOpen(true);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "PPP");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-600">Completed</Badge>;
      case "failed":
        return <Badge className="bg-red-600">Failed</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-600">In Progress</Badge>;
      default:
        return <Badge className="bg-yellow-600">Pending</Badge>;
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Your Custom Orders</h2>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center justify-center text-center">
            <p className="text-muted-foreground mb-2">
              You don't have any custom orders yet.
            </p>
            <p className="text-sm text-muted-foreground">
              Create a custom order from the AI Agent page.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between">
                  <CardTitle className="text-base">
                    Order #{order.id.slice(0, 8)}...
                  </CardTitle>
                  {getStatusBadge(order.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <span className="text-muted-foreground">Created:</span>{" "}
                    {formatDate(order.created_at)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Credits:</span>{" "}
                    {order.credits_used}
                  </div>
                  {order.delivered_at && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Delivered:</span>{" "}
                      {formatDate(order.delivered_at)}
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleViewDetails(order.id)}
                >
                  <EyeIcon className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <OrderDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        orderId={selectedOrderId}
      />
    </div>
  );
};
