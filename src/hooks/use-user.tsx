
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useUser = () => {
  const [user, setUser] = useState<any>(null);
  const [userCredits, setUserCredits] = useState<{ credits_remaining: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setUser(session.user);
          
          // Fetch user credits
          const { data: creditsData, error: creditsError } = await supabase
            .from('user_credits')
            .select('credits_remaining')
            .eq('user_id', session.user.id)
            .single();
            
          if (!creditsError) {
            setUserCredits(creditsData);
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        setUser(session?.user || null);
        if (session?.user) {
          // Fetch user credits when auth state changes
          supabase
            .from('user_credits')
            .select('credits_remaining')
            .eq('user_id', session.user.id)
            .single()
            .then(({ data, error }) => {
              if (!error) {
                setUserCredits(data);
              }
            });
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserCredits(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { user, userCredits, isLoading };
};
