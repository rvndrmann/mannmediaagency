
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log("Auth callback initiated");
        
        // Clear any existing auth data
        localStorage.removeItem('auth_confirmed');
        
        // Get the URL hash parameters
        const hashParams = window.location.hash ? new URLSearchParams(window.location.hash.substring(1)) : null;
        const queryParams = new URLSearchParams(window.location.search);
        
        console.log("Hash params present:", !!hashParams && hashParams.has('access_token'));
        console.log("Query params present:", queryParams.has('code'));
        
        // PKCE flow detection (preferred method in Supabase v2)
        if (queryParams.has('code')) {
          console.log("PKCE flow detected with code parameter");
          
          // With PKCE, Supabase should handle the exchange automatically
          // Just need to get the session after the callback
          
          // First, ensure any existing corrupted sessions are cleared
        }
        
        // Get the current session
        console.log("Requesting session from Supabase...");
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log("Session check result:", {
          hasSession: !!session,
          sessionError: sessionError ? sessionError.message : null
        });

        if (sessionError) {
          console.error("Failed to get session:", sessionError);
          throw sessionError;
        }

        // If we have a session, we're good to go
        if (session?.user) {
          console.log("Authentication successful for:", session.user.email);
          console.log("User ID:", session.user.id);
          console.log("Session expires at:", new Date(session.expires_at * 1000).toISOString());
          
          // Store additional confirmation in localStorage for debugging
          localStorage.setItem('auth_confirmed', 'true');
          localStorage.setItem('user_email', session.user.email || 'unknown');
          localStorage.setItem('auth_timestamp', new Date().toISOString());
          
          // Force a refresh before redirecting to ensure the session is available to other components
          // Add a small delay before redirecting to allow session storage to settle
          setTimeout(() => {
            window.location.href = "/"; // Redirect to dashboard (Index page handles dashboard display)
          }, 500);
          return;
        }

        // If no session but we have an access token in hash params, try to exchange it
        if (hashParams) {
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          
          console.log("URL contains tokens:", {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken
          });
          
          if (accessToken) {
            // Try to set the session manually if we have an access token
            console.log("Attempting to set session with access token");
            try {
              const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || ''
              });
              
              console.log("Manual session set result:", {
                success: !!data.session,
                error: error ? error.message : null
              });
              
              if (data.session) {
                console.log("Session successfully established");
                localStorage.setItem('auth_confirmed', 'true');
                localStorage.setItem('user_email', data.session.user.email || 'unknown');
                localStorage.setItem('auth_timestamp', new Date().toISOString());
                
                // Force a refresh before redirecting to ensure the session is available to other components
                // Add a small delay before redirecting to allow session storage to settle
                setTimeout(() => {
                  window.location.href = "/"; // Redirect to dashboard (Index page handles dashboard display)
                }, 500);
                return;
              }
              
              if (error) throw error;
            } catch (err) {
              console.error("Error setting session:", err);
            }
          }
        }

        // If we're here and have no session but we do have a code, it might be a Supabase handling issue
        if (queryParams.has('code')) {
          console.log("No session established but code parameter exists - retrying with force refresh");
          
          // Try to force a refresh of the page to see if Supabase can complete the PKCE flow
          toast.info("Completing authentication...");
          setTimeout(() => {
            window.location.reload();
          }, 2000);
          return;
        }

        // If we get here, either there was no hash params or setting the session failed
        console.error("No valid session could be established");
        throw new Error("Authentication failed. Please try again.");
      } catch (error: any) {
        console.error("Auth callback error:", error);
        toast.error(error.message || "Authentication failed");
        // Wait a moment before redirecting to ensure logs are visible
        setTimeout(() => {
          navigate("/auth/login", { replace: true });
        }, 2000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 flex items-center justify-center">
      <div className="text-white text-center">
        <div className="size-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-lg">Completing login...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
