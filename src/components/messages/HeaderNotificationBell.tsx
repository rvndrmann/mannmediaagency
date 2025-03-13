
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

export function HeaderNotificationBell() {
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
    const fetchUnreadMessages = async () => {
      if (!session?.user?.id) return;

      try {
        const { data, error } = await supabase.rpc(
          'get_unread_messages_count',
          { user_id: session.user.id }
        );

        if (error) throw error;
        setUnreadCount(data || 0);
      } catch (error) {
        console.error('Error fetching unread messages count:', error);
      }
    };

    fetchUnreadMessages();

    // Set up realtime subscription
    const channel = supabase
      .channel('header_message_notifications')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'admin_messages' }, 
        (payload) => {
          if (payload.new.receiver_id === session?.user?.id && !payload.new.read) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'admin_messages' }, 
        (payload) => {
          if (payload.old.read === false && payload.new.read === true && 
              payload.new.receiver_id === session?.user?.id) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const handleClick = () => {
    navigate("/messages");
  };

  if (!session) return null;

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="relative" 
      onClick={handleClick}
      aria-label="Notifications"
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Button>
  );
}
