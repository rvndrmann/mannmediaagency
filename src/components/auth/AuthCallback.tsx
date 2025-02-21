
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event, session?.user?.email);
        
        if (event === "SIGNED_IN" && session?.user) {
          console.log("User signed in successfully:", session.user.email);
          toast.success("Successfully logged in!");
          navigate("/dashboard", { replace: true });
        } else if (event === "SIGNED_OUT") {
          console.log("User signed out");
          navigate("/auth/login", { replace: true });
        }
      }
    );

    const handleCallback = async () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        // Log the params for debugging
        console.log("Hash params:", Object.fromEntries(hashParams.entries()));
        console.log("Query params:", Object.fromEntries(queryParams.entries()));
        
        // Check if we have an error in either hash or query params
        const error = hashParams.get("error") || queryParams.get("error");
        const errorDescription = hashParams.get("error_description") || 
                               queryParams.get("error_description");
        
        if (error) {
          throw new Error(errorDescription || error);
        }

        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Session retrieval error:", sessionError);
          throw sessionError;
        }

        if (!session) {
          console.log("No session found, waiting for auth state change...");
          // Don't navigate away - let the auth state listener handle it
          return;
        }

        console.log("Session retrieved successfully:", session.user?.email);
        toast.success("Successfully logged in!");
        navigate("/dashboard", { replace: true });
      } catch (error: any) {
        console.error("Auth callback error:", error);
        toast.error(error.message || "Authentication failed");
        navigate("/auth/login", { replace: true });
      }
    };

    handleCallback();

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
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
