
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";
import { MessageCount } from "@/types/custom-order";

export function MessageNotification() {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!session?.user?.id) return;

      try {
        // Using the RPC function to get unread count
        const { data, error } = await supabase.rpc(
          'get_unread_messages_count',
          { user_id: session.user.id }
        );

        if (error) throw error;
        setUnreadCount(data || 0);
      } catch (error) {
        console.error("Error fetching unread messages count:", error);
      }
    };

    fetchUnreadCount();

    // Set up realtime subscription for updates
    const channel = supabase
      .channel('message_notifications')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'admin_messages' }, 
        (payload) => {
          // If the current user is the receiver and message is unread
          if (payload.new.receiver_id === session?.user?.id && !payload.new.read) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'admin_messages' }, 
        (payload) => {
          // If a message was marked as read, recalculate unread count
          if (payload.old.read === false && payload.new.read === true && 
              payload.new.receiver_id === session?.user?.id) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const handleViewMessages = () => {
    navigate("/messages");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">Messages</h4>
            {unreadCount > 0 && (
              <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                {unreadCount} unread
              </span>
            )}
          </div>
          
          <div className="text-sm">
            {unreadCount > 0 ? (
              <p>You have new messages waiting for you.</p>
            ) : (
              <p>No new messages at this time.</p>
            )}
          </div>
          
          <Button 
            className="w-full" 
            variant="default" 
            onClick={handleViewMessages}
          >
            View All Messages
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
