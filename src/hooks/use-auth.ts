import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Check for the current user
    const checkUser = async () => {
      try {
        setLoading(true);
        
        // Check if we have confirmation of a successful auth in localStorage
        const authConfirmed = localStorage.getItem('auth_confirmed') === 'true';
        const userEmail = localStorage.getItem('user_email');
        const authTimestamp = localStorage.getItem('auth_timestamp');
        
        console.log('Auth debug info from localStorage:', {
          authConfirmed,
          userEmail,
          authTimestamp: authTimestamp ? new Date(authTimestamp).toLocaleString() : null
        });
        
        // Check the session first
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        console.log('Auth session check:', {
          hasSession: !!sessionData?.session,
          sessionError: sessionError ? sessionError.message : null
        });
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          // Continue anyway to try the getUser method as a fallback
        }
        
        // If we have a valid session, use it
        if (sessionData?.session) {
          setUser(sessionData.session.user);
          console.log('User set from session in auth hook:', sessionData.session.user.id);
          // Update localStorage for future reference
          localStorage.setItem('auth_confirmed', 'true');
          localStorage.setItem('user_email', sessionData.session.user.email || 'unknown');
          localStorage.setItem('auth_timestamp', new Date().toISOString());
          setLoading(false);
          return;
        }
        
        // If no session, try to get the user directly
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        console.log('Auth user check:', {
          hasUser: !!user,
          error: userError ? userError.message : null
        });
        
        if (userError) {
          console.error('User fetch error:', userError);
          
          // If we have auth confirmation in localStorage but API calls are failing,
          // it might be a temporary API issue - try to reload the page once
          if (authConfirmed && !sessionData?.session && !user) {
            const lastReloadAttempt = localStorage.getItem('auth_reload_attempt');
            const currentTime = new Date().getTime();
            const shouldAttemptReload = !lastReloadAttempt || 
              (currentTime - new Date(lastReloadAttempt).getTime() > 5 * 60 * 1000); // 5 minutes
              
            if (shouldAttemptReload) {
              console.log('Attempting page reload to recover auth state...');
              localStorage.setItem('auth_reload_attempt', new Date().toISOString());
              window.location.reload();
              return;
            }
          }
          
          throw userError;
        }
        
        setUser(user);
        console.log('User set from getUser in auth hook:', user ? user.id : 'No user');
        
        // Update localStorage for future reference if we got a user
        if (user) {
          localStorage.setItem('auth_confirmed', 'true');
          localStorage.setItem('user_email', user.email || 'unknown');
          localStorage.setItem('auth_timestamp', new Date().toISOString());
        }
      } catch (err) {
        console.error('Error checking auth status:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        
        // Reset user to null on error
        setUser(null);
        
        // Clear localStorage auth confirmation if authentication check fails
        localStorage.removeItem('auth_confirmed');
      } finally {
        setLoading(false);
      }
    };

    // Call the function
    checkUser();

    // Set up a listener for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', { event, hasUser: !!session?.user });
      
      // Update the user state based on the auth event
      if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem('auth_confirmed');
        localStorage.removeItem('user_email');
        localStorage.removeItem('auth_timestamp');
        localStorage.removeItem('auth_reload_attempt');
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setUser(session?.user ?? null);
        
        // Update localStorage for future reference
        if (session?.user) {
          localStorage.setItem('auth_confirmed', 'true');
          localStorage.setItem('user_email', session.user.email || 'unknown');
          localStorage.setItem('auth_timestamp', new Date().toISOString());
        }
      }
    });

    // Clean up the listener when the component unmounts
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Provide sign-in and sign-out functions
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error signing in:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      console.error('Error signing out:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    signIn,
    signOut,
  };
}
