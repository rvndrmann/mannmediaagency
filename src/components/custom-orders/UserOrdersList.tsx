
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CustomOrder, CustomOrderMedia } from "@/types/custom-order";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Loader2, EyeIcon, RefreshCw, SearchIcon, ArrowDownAZ, ArrowUpAZ, Filter, ImageIcon, FileText, Calendar } from "lucide-react";
import { OrderDetailsDialog } from "./OrderDetailsDialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

// Component for order media count display
const OrderMediaCount = ({ orderId }: { orderId: string }) => {
  const [count, setCount] = useState<number | null>(null);
  
  useEffect(() => {
    const fetchMediaCount = async () => {
      const { count, error } = await supabase
        .from("custom_order_media")
        .select("*", { count: 'exact', head: true })
        .eq("order_id", orderId);
      
      if (!error && count !== null) {
        setCount(count);
      }
    };
    
    fetchMediaCount();
  }, [orderId]);
  
  if (count === null) return null;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 text-muted-foreground">
            <ImageIcon className="h-3.5 w-3.5" />
            <span className="text-xs">{count}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{count} media files attached</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const UserOrdersList = () => {
  const [orders, setOrders] = useState<CustomOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchOrders();

    // Set up realtime subscription for order updates
    const channel = supabase
      .channel('custom-orders-changes')
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
    setError(null);
    try {
      const { data, error } = await supabase
        .from("custom_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data as CustomOrder[]);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      setError("Failed to load your orders. Please try again.");
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
    toast.success("Orders refreshed");
  };

  const handleViewDetails = (orderId: string) => {
    setSelectedOrderId(orderId);
    setDetailsOpen(true);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "PPP");
  };

  const formatShortDate = (dateString: string) => {
    return format(new Date(dateString), "MMM d, yyyy");
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

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    return orders
      .filter(order => {
        // Apply status filter
        if (statusFilter !== "all" && order.status !== statusFilter) {
          return false;
        }
        
        // Apply search filter (currently on ID, but could include other fields)
        if (searchQuery) {
          return order.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                 (order.remark && order.remark.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        
        return true;
      })
      .sort((a, b) => {
        // Sort by created_at date
        if (sortOrder === "newest") {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        } else {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
      });
  }, [orders, searchQuery, sortOrder, statusFilter]);

  // Get status counts for the filter dropdown
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    orders.forEach(order => {
      counts[order.status] = (counts[order.status] || 0) + 1;
    });
    return counts;
  }, [orders]);

  // Generate the status filter options
  const statusOptions = useMemo(() => {
    const statuses = Array.from(new Set(orders.map(order => order.status)));
    return [
      { value: "all", label: `All Orders (${statusCounts.all || 0})` },
      ...statuses.map(status => ({
        value: status,
        label: `${status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")} (${statusCounts[status] || 0})`
      }))
    ];
  }, [orders, statusCounts]);

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Your Custom Orders</h2>
          <Button variant="outline" onClick={fetchOrders} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
        
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/10">
          <CardContent className="py-6 flex flex-col items-center justify-center text-center">
            <p className="text-red-600 dark:text-red-400 mb-2">
              {error}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Your Custom Orders</h2>
        <Button 
          variant="outline" 
          onClick={handleRefresh} 
          size="sm"
          disabled={refreshing || loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-8 w-full mt-2" />
                </div>
              </CardContent>
            </Card>
          ))}
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
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    {sortOrder === "newest" ? <ArrowDownAZ className="h-4 w-4" /> : <ArrowUpAZ className="h-4 w-4" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => setSortOrder("newest")}>
                      <ArrowDownAZ className="h-4 w-4 mr-2" />
                      Newest first
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortOrder("oldest")}>
                      <ArrowUpAZ className="h-4 w-4 mr-2" />
                      Oldest first
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="py-8 flex flex-col items-center justify-center text-center">
                <p className="text-muted-foreground">
                  No orders match your filters.
                </p>
                <Button variant="link" onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}>
                  Clear filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredOrders.map((order) => (
                <Card key={order.id} className={order.status === "payment_pending" ? "border-yellow-300 dark:border-yellow-600" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-base flex items-center gap-2">
                        Order #{order.id.slice(0, 8)}...
                        {order.status === "payment_pending" && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="warning" className="text-xs">Payment Required</Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>This order requires payment to be processed</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </CardTitle>
                      {getStatusBadge(order.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{formatShortDate(order.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1 justify-end">
                        <span className="text-muted-foreground">Credits:</span>
                        <span className="font-medium">{order.credits_used}</span>
                      </div>
                      
                      {order.remark && (
                        <div className="col-span-2 flex items-start gap-1 mt-1">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                          <span className="text-muted-foreground line-clamp-1">
                            {order.remark}
                          </span>
                        </div>
                      )}
                      
                      <div className="col-span-2 flex justify-between items-center mt-1">
                        <OrderMediaCount orderId={order.id} />
                        
                        {order.delivered_at && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <span className="text-xs">Delivered: {formatShortDate(order.delivered_at)}</span>
                          </div>
                        )}
                      </div>
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
        </>
      )}

      <OrderDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        orderId={selectedOrderId}
      />
    </div>
  );
};
