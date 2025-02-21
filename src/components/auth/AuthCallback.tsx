
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Auth callback error:", error);
          throw error;
        }

        if (session?.user) {
          console.log("Authentication successful for:", session.user.email);
          toast.success("Successfully logged in!");
          navigate("/dashboard", { replace: true });
        } else {
          throw new Error("No session found after authentication");
        }
      } catch (error: any) {
        console.error("Auth callback error:", error);
        toast.error(error.message || "Authentication failed");
        navigate("/auth/login", { replace: true });
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
