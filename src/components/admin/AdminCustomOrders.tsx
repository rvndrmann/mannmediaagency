
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CustomOrder } from "@/types/custom-order";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Eye, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const AdminCustomOrders = () => {
  const [orders, setOrders] = useState<CustomOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<CustomOrder | null>(null);
  const [orderImages, setOrderImages] = useState<{ image_url: string }[]>([]);
  const [viewImageDialogOpen, setViewImageDialogOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [adminNotes, setAdminNotes] = useState("");
  const [credits, setCredits] = useState<number>(0);
  const [status, setStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [userData, setUserData] = useState<{[key: string]: {username: string | null}}>({});

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('custom_orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (statusFilter !== "all") {
        query = query.eq('status', statusFilter);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Cast the data to the correct type
      setOrders(data as unknown as CustomOrder[]);
      
      // Fetch user data for each order
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(order => order.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);
        
        if (profilesData) {
          const userMap: {[key: string]: {username: string | null}} = {};
          profilesData.forEach(profile => {
            userMap[profile.id] = { username: profile.username };
          });
          setUserData(userMap);
        }
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const viewOrderDetails = async (order: CustomOrder) => {
    setSelectedOrder(order);
    setAdminNotes(order.admin_notes || "");
    setCredits(order.credits_used);
    setStatus(order.status);
    setOrderLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('custom_order_images')
        .select('image_url')
        .eq('order_id', order.id);
      
      if (error) throw error;
      
      setOrderImages(data as unknown as { image_url: string }[]);
    } catch (error) {
      console.error("Error fetching order images:", error);
      toast.error("Failed to load order images");
    } finally {
      setOrderLoading(false);
    }
  };

  const updateOrder = async () => {
    if (!selectedOrder) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('custom_orders')
        .update({
          status,
          admin_notes: adminNotes,
          credits_used: credits
        })
        .eq('id', selectedOrder.id);
      
      if (error) throw error;
      
      toast.success("Order updated successfully");
      
      // Update local state
      setOrders(orders.map(order => 
        order.id === selectedOrder.id 
          ? { ...order, status: status as 'pending' | 'in_progress' | 'completed' | 'failed', admin_notes: adminNotes, credits_used: credits } 
          : order
      ));
      
      setSelectedOrder(null);
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update order");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const viewImage = (imageUrl: string) => {
    setCurrentImage(imageUrl);
    setViewImageDialogOpen(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Custom Orders</h2>
        <Select 
          value={statusFilter} 
          onValueChange={setStatusFilter}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center my-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">No orders found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs">
                    {order.id.slice(0, 8)}...
                  </TableCell>
                  <TableCell>
                    {userData[order.user_id]?.username || order.user_id.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    <span 
                      className={`px-2 py-1 rounded-full text-xs ${
                        order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                        order.status === 'in_progress' ? 'bg-blue-500/20 text-blue-500' :
                        order.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                        'bg-red-500/20 text-red-500'
                      }`}
                    >
                      {order.status}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(order.created_at)}</TableCell>
                  <TableCell>{formatDate(order.updated_at)}</TableCell>
                  <TableCell>{order.credits_used}</TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => viewOrderDetails(order)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Order Details Dialog */}
      {selectedOrder && (
        <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
              <DialogDescription>
                Order ID: {selectedOrder.id}
              </DialogDescription>
            </DialogHeader>

            {orderLoading ? (
              <div className="flex justify-center my-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Status</h3>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-2">Credits Used</h3>
                    <Input 
                      type="number" 
                      value={credits} 
                      onChange={(e) => setCredits(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Client Remark</h3>
                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <p className="whitespace-pre-line">
                        {selectedOrder.remark || "No remarks provided"}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Admin Notes</h3>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes about this order..."
                    rows={4}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-4">Attached Images</h3>
                  {orderImages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No images attached</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {orderImages.map((img, index) => (
                        <div 
                          key={index} 
                          className="relative group cursor-pointer border rounded-md overflow-hidden"
                          onClick={() => viewImage(img.image_url)}
                        >
                          <img 
                            src={img.image_url} 
                            alt={`Order image ${index + 1}`}
                            className="w-full h-48 object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Eye className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setSelectedOrder(null)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button 
                onClick={updateOrder}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Image Viewer Dialog */}
      <Dialog open={viewImageDialogOpen} onOpenChange={setViewImageDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center my-4">
            <img src={currentImage} alt="Order image" className="max-h-[70vh] object-contain" />
          </div>
          <DialogFooter>
            <Button onClick={() => setViewImageDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
