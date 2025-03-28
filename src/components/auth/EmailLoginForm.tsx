
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useEmailAuth } from "@/hooks/useEmailAuth";
import { AlertCircle, Loader2 } from "lucide-react";

interface EmailLoginFormProps {
  isSignUp?: boolean;
}

const EmailLoginForm = ({ isSignUp = false }: EmailLoginFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { status, error, handleEmailLogin, handleEmailSignUp } = useEmailAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp) {
      handleEmailSignUp(email, password);
    } else {
      handleEmailLogin(email, password);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-white">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-gray-900 border-gray-700 text-white"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-white">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-gray-900 border-gray-700 text-white"
          required
          minLength={6}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 py-2 px-3 bg-red-500/10 text-red-300 rounded-md text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <Button
        type="submit"
        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
        disabled={status === "loading" || !email.trim() || !password.trim()}
      >
        {status === "loading" ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : null}
        {status === "loading" 
          ? (isSignUp ? "Creating Account..." : "Logging In...") 
          : (isSignUp ? "Create Account" : "Log In")}
      </Button>
    </form>
  );
};

export default EmailLoginForm;
