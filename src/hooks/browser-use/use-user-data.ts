
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
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error && !error.message.includes('does not exist')) {
          console.error("Error fetching user credits:", error);
          throw error;
        }
        
        if (data) {
          setUserCredits(data as UserCredits);
        } else {
          // Create new user credits record with 0 credits instead of free credits
          const { data: newCredits, error: insertError } = await supabase
            .from('user_credits')
            .insert({
              user_id: user.id,
              credits_remaining: 0 // Changed from 10 to 0
            })
            .select()
            .single();
          
          if (insertError) {
            console.error("Error creating user credits:", insertError);
            throw insertError;
          }
          
          if (newCredits) {
            setUserCredits(newCredits as UserCredits);
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
