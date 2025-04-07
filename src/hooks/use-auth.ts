import { useState, useEffect, useCallback } from 'react'; // Add useCallback
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Overall auth loading
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(true); // Separate loading for admin check
  const [error, setError] = useState<Error | null>(null);

  // Function to ensure a default project exists for the user
  const ensureDefaultProject = useCallback(async (userId: string) => {
    if (!userId) return;

    try {
      console.log(`[useAuth] Checking for existing projects for user ${userId}`);
      // Check if the user already has any projects
      const { count, error: countError } = await supabase
        .from('canvas_projects')
        .select('*', { count: 'exact', head: true }) // Efficiently count rows
        .eq('user_id', userId);

      if (countError) {
        console.error('[useAuth] Error checking project count:', countError);
        return; // Don't proceed if we can't check
      }

      console.log(`[useAuth] User ${userId} has ${count ?? 0} projects.`);

      // If the user has no projects, create a default one
      if (count === 0) {
        console.log(`[useAuth] No projects found for user ${userId}. Creating default project.`);
        const { error: insertError } = await supabase
          .from('canvas_projects')
          .insert({
            user_id: userId,
            title: 'My First Project', // Default title
            // Add any other required default fields here if necessary
          });

        if (insertError) {
          console.error('[useAuth] Error creating default project:', insertError);
        } else {
          console.log(`[useAuth] Default project created successfully for user ${userId}.`);
          // Optionally: Trigger a refresh or update relevant state if needed elsewhere
        }
      }
    } catch (err) {
      console.error('[useAuth] Exception ensuring default project:', err);
    }
  }, []); // useCallback ensures the function identity is stable

  // Function to check admin status
  const checkAdminStatus = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setIsAdmin(false);
      setIsAdminLoading(false);
      return;
    }
    setIsAdminLoading(true);
    try {
      // Assuming the table is 'admin_users' and has a 'user_id' column matching auth.users.id
      const { data, error, count } = await supabase
        .from('admin_users')
        .select('user_id', { count: 'exact', head: true }) // More efficient: check existence
        .eq('user_id', userId);

      if (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false); // Default to false on error
      } else {
        setIsAdmin(count !== null && count > 0);
        console.log(`User ${userId} isAdmin status: ${count !== null && count > 0}`);
      }
    } catch (err) {
      console.error("Exception checking admin status:", err);
      setIsAdmin(false);
    } finally {
      setIsAdminLoading(false);
    }
  }, []);

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
          const currentUser = sessionData.session.user;
          setUser(currentUser);
          console.log('User set from session in auth hook:', currentUser.id);
          checkAdminStatus(currentUser.id); // Check admin status
          ensureDefaultProject(currentUser.id); // Ensure default project exists
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
        checkAdminStatus(user?.id); // Check admin status
        if (user) {
          ensureDefaultProject(user.id); // Ensure default project exists
        }
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
        setIsAdmin(false); // Reset admin status on error
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
        setIsAdmin(false); // Reset admin status on sign out
        localStorage.removeItem('auth_confirmed');
        localStorage.removeItem('user_email');
        localStorage.removeItem('auth_timestamp');
        localStorage.removeItem('auth_reload_attempt');
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        checkAdminStatus(currentUser?.id); // Check admin status on sign in/refresh
        if (currentUser && event === 'SIGNED_IN') { // Only ensure on initial SIGNED_IN
          ensureDefaultProject(currentUser.id);
        }
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
    loading: loading || isAdminLoading, // Combine loading states
    isAdmin,
    error,
    signIn,
    signOut,
  };
}
