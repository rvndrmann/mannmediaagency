
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const AdminUsageStats = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalImages: 0,
    totalVideos: 0,
    totalCustomOrders: 0,
    pendingCustomOrders: 0,
    totalCreditsUsed: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Fetch total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      // Fetch active users (with activity in the last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gt('updated_at', thirtyDaysAgo.toISOString());
      
      // Fetch total images
      const { count: totalImages } = await supabase
        .from('image_generation_jobs')
        .select('*', { count: 'exact', head: true });
      
      // Fetch total videos
      const { count: totalVideos } = await supabase
        .from('video_generation_jobs')
        .select('*', { count: 'exact', head: true });
      
      // Fetch total custom orders - using raw query for tables not in TypeScript types
      const { count: totalCustomOrders } = await supabase.rpc(
        'get_table_count',
        { table_name: 'custom_orders' }
      );
      
      // Fetch pending custom orders - using raw query for tables not in TypeScript types
      const { count: pendingCustomOrders } = await supabase.rpc(
        'get_pending_custom_orders_count'
      );
      
      // Fetch total credits used
      const { data: creditsData } = await supabase
        .from('credit_update_logs')
        .select('credits_before, credits_after')
        .not('credits_before', 'is', null)
        .not('credits_after', 'is', null);
      
      let totalCreditsUsed = 0;
      if (creditsData) {
        creditsData.forEach(log => {
          const change = Number(log.credits_before) - Number(log.credits_after);
          if (change > 0) totalCreditsUsed += change;
        });
      }
      
      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalImages: totalImages || 0,
        totalVideos: totalVideos || 0,
        totalCustomOrders: totalCustomOrders || 0,
        pendingCustomOrders: pendingCustomOrders || 0,
        totalCreditsUsed: totalCreditsUsed
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Failed to load usage statistics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center my-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Usage Statistics</h2>
      
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Users</CardTitle>
            <CardDescription>Total registered accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalUsers}</div>
            <p className="text-sm text-muted-foreground mt-2">
              {stats.activeUsers} active in the last 30 days
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Images Generated</CardTitle>
            <CardDescription>Total product images created</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalImages}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Videos Generated</CardTitle>
            <CardDescription>Total videos created</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalVideos}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Custom Orders</CardTitle>
            <CardDescription>Total special requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalCustomOrders}</div>
            <p className="text-sm text-muted-foreground mt-2">
              {stats.pendingCustomOrders} pending orders
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Credits Used</CardTitle>
            <CardDescription>Total credits consumed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalCreditsUsed.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
