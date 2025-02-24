
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface VerificationInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export const VerificationInput = ({ value, onChange, error }: VerificationInputProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="verification" className="text-white">
        Verification Code
      </Label>
      <Input
        id="verification"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
        placeholder="Enter 6-digit code"
        className={cn(
          "bg-white/10 border-white/20 text-white placeholder:text-gray-400",
          error && "border-red-500"
        )}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <p className="text-sm text-gray-400">
        Enter the 6-digit code sent to your phone
      </p>
    </div>
  );
};
