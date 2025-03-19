
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserCredits } from "./types";

export function useUserData(
  setUserCredits: (credits: UserCredits | null) => void,
  setError: (error: string | null) => void
) {
  useEffect(() => {
    const fetchUserCredits = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setUserCredits(null);
          return;
        }
        
        const { data, error } = await supabase
          .from('user_credits')
          .select('free_credits, paid_credits, used_credits')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) {
          console.error("Error fetching user credits:", error);
          throw error;
        }
        
        if (data) {
          const credits: UserCredits = {
            free_credits: data.free_credits || 0,
            paid_credits: data.paid_credits || 0,
            used_credits: data.used_credits || 0,
            total_remaining: (data.free_credits || 0) + (data.paid_credits || 0) - (data.used_credits || 0)
          };
          
          setUserCredits(credits);
        } else {
          // Create new user credits record if not exists
          const { data: newCredits, error: insertError } = await supabase
            .from('user_credits')
            .insert({
              user_id: user.id,
              free_credits: 10, // Default free credits
              paid_credits: 0,
              used_credits: 0
            })
            .select('free_credits, paid_credits, used_credits')
            .single();
          
          if (insertError) {
            console.error("Error creating user credits:", insertError);
            throw insertError;
          }
          
          if (newCredits) {
            const credits: UserCredits = {
              free_credits: newCredits.free_credits || 10,
              paid_credits: newCredits.paid_credits || 0,
              used_credits: newCredits.used_credits || 0,
              total_remaining: (newCredits.free_credits || 10) + (newCredits.paid_credits || 0)
            };
            
            setUserCredits(credits);
          }
        }
      } catch (error) {
        console.error("Error in useUserData:", error);
        setError(error instanceof Error ? error.message : "Failed to fetch user data");
        setUserCredits(null);
      }
    };
    
    fetchUserCredits();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserCredits();
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [setUserCredits, setError]);
}
