import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js"; // Import User type

export const useUser = () => {
  const [user, setUser] = useState<User | null>(null); // Use specific User type
  const [userCredits, setUserCredits] = useState<{ credits_remaining: number } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // const ADMIN_EMAIL = "rvndr.mann@gmail.com"; // Remove admin email constant

  // Restore checkAdminStatus function
  const checkAdminStatus = useCallback(async (userId: string | undefined) => {
    // Removed debug logs
    if (!userId) return false;
    try {
      const { data, error, count } = await supabase
        .from('admin_users')
        .select('user_id', { count: 'exact', head: true }) // More efficient check
        .eq('user_id', userId);

      if (error) {
        console.error("Error checking admin status:", error);
        return false;
      }
      return count !== null && count > 0; // Return true if count is > 0
    } catch (adminError) {
      console.error("Exception checking admin status:", adminError);
      return false;
    }
  }, []); // useCallback dependency array is empty as supabase client is stable
  // Define fetchCredits within the hook's scope
  const fetchCredits = useCallback(async (userId: string | undefined) => {
     if (!userId) {
       setUserCredits(null);
       return;
     }
     try {
        const { data, error } = await supabase
            .from('user_credits')
            .select('credits_remaining')
            .eq('user_id', userId)
            .single();
        if (!error && data) {
            setUserCredits(data);
        } else {
             setUserCredits(null);
             if (error && error.code !== 'PGRST116') { // Ignore 'No rows found' error
                 console.error("Error fetching user credits:", error);
             }
        }
     } catch (creditsError) {
         console.error("Exception fetching user credits:", creditsError);
         setUserCredits(null);
     }
  }, []); // useCallback dependency array is empty

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const adminStatus = await checkAdminStatus(currentUser.id);
        setIsAdmin(adminStatus);
        await fetchCredits(currentUser.id);
      } else {
        setIsAdmin(false);
        setUserCredits(null);
      }
      setIsLoading(false);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [checkAdminStatus, fetchCredits]);

  return { user, userCredits, isAdmin, isLoading };
};
