
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface VerificationInputProps {
  onSubmit: (code: string) => void;
  onResend: () => void;
  isLoading: boolean;
  phoneNumber: string;
}

const VerificationInput = ({
  onSubmit,
  onResend,
  isLoading,
  phoneNumber,
}: VerificationInputProps) => {
  const [code, setCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(code);
  };

  return (
    <div className="space-y-4">
      <div className="text-center text-sm text-gray-400">
        Enter the verification code sent to {phoneNumber}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="text"
          placeholder="Enter verification code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={6}
          className="text-center text-lg tracking-widest"
        />
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || code.length !== 6}
        >
          {isLoading ? (
            <span className="size-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
          ) : null}
          {isLoading ? "Verifying..." : "Verify code"}
        </Button>
      </form>
      <Button
        variant="link"
        onClick={onResend}
        disabled={isLoading}
        className="w-full text-purple-400 hover:text-purple-300"
      >
        Resend code
      </Button>
    </div>
  );
};

export default VerificationInput;
