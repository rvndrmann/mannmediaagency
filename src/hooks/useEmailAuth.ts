
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export type AuthStatus = 'idle' | 'loading' | 'success' | 'error';

export const useEmailAuth = () => {
  const [status, setStatus] = useState<AuthStatus>("idle");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleEmailLogin = async (email: string, password: string) => {
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    try {
      setStatus("loading");
      setError("");
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error("Email login error:", error);
        setError(error.message || "Failed to log in");
        setStatus("error");
        toast.error(error.message || "Failed to log in");
        return;
      }

      toast.success("Logged in successfully!");
      setStatus("success");
      navigate("/");
    } catch (err: any) {
      console.error("Unexpected login error:", err);
      setError(err.message || "An unexpected error occurred");
      setStatus("error");
      toast.error(err.message || "An unexpected error occurred");
    }
  };

  const handleEmailSignUp = async (email: string, password: string) => {
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    try {
      setStatus("loading");
      setError("");
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        console.error("Email signup error:", error);
        setError(error.message || "Failed to create account");
        setStatus("error");
        toast.error(error.message || "Failed to create account");
        return;
      }

      if (data.user?.identities?.length === 0) {
        setError("Email is already registered. Please log in instead.");
        setStatus("error");
        toast.error("Email is already registered. Please log in instead.");
        return;
      }

      toast.success(
        data.session 
          ? "Account created and logged in successfully!" 
          : "Verification email sent. Please check your inbox."
      );
      
      setStatus("success");
      
      if (data.session) {
        navigate("/");
      }
    } catch (err: any) {
      console.error("Unexpected signup error:", err);
      setError(err.message || "An unexpected error occurred");
      setStatus("error");
      toast.error(err.message || "An unexpected error occurred");
    }
  };

  return {
    status,
    error,
    handleEmailLogin,
    handleEmailSignUp
  };
};
