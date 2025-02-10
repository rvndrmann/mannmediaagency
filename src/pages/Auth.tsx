
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, Lock, RocketIcon, LogIn, TagIcon } from "lucide-react";
import { VideoShowcase } from "@/components/auth/VideoShowcase";

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Check your email for the confirmation link!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate("/");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderAuthButtons = () => (
    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
      <Button
        onClick={() => {
          setIsSignUp(true);
          setShowAuthForm(true);
        }}
        className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white"
      >
        <RocketIcon className="mr-2 h-4 w-4" />
        Start Now
      </Button>
      <Button
        onClick={() => {
          setIsSignUp(false);
          setShowAuthForm(true);
        }}
        variant="outline"
        className="w-full sm:w-auto border-purple-400 text-purple-400 hover:bg-purple-400/10"
      >
        <LogIn className="mr-2 h-4 w-4" />
        Login
      </Button>
      <Button
        onClick={() => navigate("/plans")}
        variant="ghost"
        className="w-full sm:w-auto text-white hover:bg-white/10"
      >
        <TagIcon className="mr-2 h-4 w-4" />
        Pricing
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 p-4">
      <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-8 items-center">
        {/* Left side - Video Showcase */}
        <div className="w-full lg:w-7/12 space-y-8">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl font-bold text-white mb-4">
              Create Amazing Videos with AI
            </h1>
            <p className="text-gray-300 text-lg">
              Transform your content into engaging videos in minutes
            </p>
          </div>
          <VideoShowcase />
          {!showAuthForm && renderAuthButtons()}
        </div>

        {/* Right side - Auth Form */}
        {showAuthForm && (
          <div className="w-full lg:w-5/12">
            <Card className="w-full p-8 space-y-6 bg-gray-800/50 backdrop-blur-xl border-gray-700">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-2">
                  {isSignUp ? "Create an Account" : "Welcome Back"}
                </h2>
                <p className="text-gray-400">
                  {isSignUp
                    ? "Sign up to start creating videos"
                    : "Sign in to your account"}
                </p>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-gray-700/50 border-gray-600 text-white"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 bg-gray-700/50 border-gray-600 text-white"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={isLoading}
                >
                  {isLoading
                    ? "Loading..."
                    : isSignUp
                    ? "Create Account"
                    : "Sign In"}
                </Button>
              </form>

              <div className="text-center">
                <Button
                  variant="link"
                  className="text-purple-400 hover:text-purple-300"
                  onClick={() => setIsSignUp(!isSignUp)}
                >
                  {isSignUp
                    ? "Already have an account? Sign in"
                    : "Don't have an account? Sign up"}
                </Button>
              </div>

              <div className="text-center">
                <Button
                  variant="ghost"
                  className="text-gray-400 hover:text-gray-300"
                  onClick={() => setShowAuthForm(false)}
                >
                  Back to options
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;
