
import { useEffect, useState } from "react";
import { UserOrdersList } from "@/components/custom-orders/UserOrdersList";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { CustomOrderDialog } from "@/components/ai-agent/CustomOrderDialog";
import { supabase } from "@/integrations/supabase/client";

export default function CustomOrders() {
  const [showCustomOrderDialog, setShowCustomOrderDialog] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }
    };
    
    fetchUser();
  }, []);

  const handleCreateOrder = () => {
    setShowCustomOrderDialog(true);
  };

  const handleBack = () => {
    navigate("/");
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBack}
            className="mr-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Custom Orders</h1>
        </div>
        <Button onClick={handleCreateOrder}>
          <Plus className="mr-2 h-4 w-4" /> Create New Order
        </Button>
      </div>
      
      <Separator />
      
      <Card>
        <CardHeader>
          <CardTitle>Your Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {userId ? (
            <UserOrdersList userId={userId} />
          ) : (
            <div className="flex items-center justify-center h-40">
              <p className="text-muted-foreground">Loading your orders...</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <CustomOrderDialog
        open={showCustomOrderDialog}
        onOpenChange={setShowCustomOrderDialog}
      />
    </div>
  );
}
