
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface User {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    avatar_url?: string;
  };
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const fetchUser = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getUser();
      setUser(data.user ? { 
        id: data.user.id,
        email: data.user.email || undefined,
        user_metadata: data.user.user_metadata
      } : null);
      setLoading(false);
    };

    fetchUser();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ? {
          id: session.user.id,
          email: session.user.email || undefined,
          user_metadata: session.user.user_metadata
        } : null);
        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { user, loading, signOut };
};
