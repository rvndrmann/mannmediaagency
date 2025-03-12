
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { OrderDetailsDialog } from "./OrderDetailsDialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";

export interface UserOrdersListProps {
  userId?: string;
}

export const UserOrdersList = ({ userId }: UserOrdersListProps) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  useEffect(() => {
    if (session?.user?.id || userId) {
      fetchOrders();
    }
  }, [session, userId]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('custom_orders')
        .select(`
          *,
          order_link_id (title, description, custom_rate),
          guest_id (name, email, phone_number)
        `)
        .eq('user_id', userId || session?.user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
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

  const handleViewDetails = (order: any) => {
    setSelectedOrder(order);
    setShowDetailsDialog(true);
  };

  if (loading) {
    return <div>Loading orders...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">You don't have any custom orders yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Order Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Credits</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  {format(new Date(order.created_at), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  {order.order_link_id?.title || 'Custom Order'}
                </TableCell>
                <TableCell>
                  {getStatusBadge(order.status)}
                </TableCell>
                <TableCell>{order.credits_used}</TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleViewDetails(order)}
                  >
                    <Eye className="h-4 w-4 mr-1" /> View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedOrder && (
        <OrderDetailsDialog
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          order={selectedOrder}
        />
      )}
    </>
  );
};
