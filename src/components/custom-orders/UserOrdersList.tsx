import { useState, useEffect } from "react";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { supabase } from "@/integrations/supabase/client";
import { CustomOrder } from "@/types/custom-order";
import { Button } from "@/components/ui/button";
import { Edit, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { OrderDetailsDialog } from "./OrderDetailsDialog";

interface UserOrdersListProps {
  userId: string;
}

export const UserOrdersList = ({ userId }: UserOrdersListProps) => {
  const [customOrders, setCustomOrders] = useState<CustomOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<CustomOrder | null>(null);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editedRemark, setEditedRemark] = useState("");
  const [editedAdminNotes, setEditedAdminNotes] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchCustomOrders = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("custom_orders")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching custom orders:", error);
          toast({
            title: "Error",
            description: "Failed to fetch custom orders.",
            variant: "destructive",
          });
        } else {
          setCustomOrders(data || []);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCustomOrders();
  }, [userId]);

  const handleViewDetails = (order: CustomOrder) => {
    setSelectedOrder(order);
    setOpen(true);
  };

  const handleEditOrder = (order: CustomOrder) => {
    setSelectedOrder(order);
    setEditedRemark(order.remark || "");
    setEditedAdminNotes(order.admin_notes || "");
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedOrder) return;

    try {
      const { error } = await supabase
        .from("custom_orders")
        .update({ remark: editedRemark, admin_notes: editedAdminNotes })
        .eq("id", selectedOrder.id);

      if (error) {
        console.error("Error updating custom order:", error);
        toast({
          title: "Error",
          description: "Failed to update custom order.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Custom order updated successfully.",
        });
        setCustomOrders((prevOrders) =>
          prevOrders.map((order) =>
            order.id === selectedOrder.id
              ? { ...order, remark: editedRemark, admin_notes: editedAdminNotes }
              : order
          )
        );
        setEditOpen(false);
      }
    } catch (error) {
      console.error("Error updating custom order:", error);
      toast({
        title: "Error",
        description: "Failed to update custom order.",
        variant: "destructive",
      });
    }
  };

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "created_at", headerName: "Created At", width: 150, valueFormatter: ({ value }) => value ? new Date(value).toLocaleString() : '' },
    { field: "status", headerName: "Status", width: 120 },
    { field: "remark", headerName: "Remark", width: 200 },
    { field: "admin_notes", headerName: "Admin Notes", width: 200 },
    {
      field: "actions",
      headerName: "Actions",
      width: 150,
      renderCell: (params: GridRenderCellParams<CustomOrder>) => (
        <div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleViewDetails(params.row)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEditOrder(params.row)}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">User Orders</h2>
      {loading ? (
        <p>Loading orders...</p>
      ) : (
        <div style={{ height: 400, width: "100%" }}>
          <DataGrid
            rows={customOrders}
            columns={columns}
            getRowId={(row) => row.id}
            disableSelectionOnClick
          />
        </div>
      )}

      <OrderDetailsDialog
        open={open}
        onOpenChange={setOpen}
        customOrderId={selectedOrder?.id || ""}
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Order</DialogTitle>
            <DialogDescription>
              Edit the remark and admin notes for this order.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="remark" className="text-right">
                Remark
              </Label>
              <div className="col-span-3">
                <Input
                  id="remark"
                  value={editedRemark}
                  onChange={(e) => setEditedRemark(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="adminNotes" className="text-right">
                Admin Notes
              </Label>
              <div className="col-span-3">
                <Textarea
                  id="adminNotes"
                  value={editedAdminNotes}
                  onChange={(e) => setEditedAdminNotes(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="button" onClick={handleSaveEdit}>
              Save changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
