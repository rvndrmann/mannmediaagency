
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserCredits } from "./types";

export function useUserData(setUserCredits: (credits: UserCredits | null) => void, setError: (error: string | null) => void) {
  // Fetch user credits on component mount
  useEffect(() => {
    const fetchUserCredits = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // Make sure to specify table alias in the query to avoid ambiguous column references
        const { data, error } = await supabase
          .from('user_credits')
          .select('*')
          .eq('user_credits.user_id', user.id)
          .maybeSingle();
        
        if (error) throw error;
        if (data) setUserCredits(data as UserCredits);
      } catch (err: any) {
        console.error("Error fetching user credits:", err);
        setError(err.message || "Failed to fetch user credits");
      }
    };
    
    fetchUserCredits();
  }, [setUserCredits, setError]);
}
