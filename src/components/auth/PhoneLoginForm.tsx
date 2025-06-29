
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { usePhoneAuth } from "@/hooks/usePhoneAuth";
import { AlertCircle } from "lucide-react";

interface PhoneLoginFormProps {
  isSignUp?: boolean;
}

const PhoneLoginForm = ({ isSignUp = false }: PhoneLoginFormProps) => {
  const [showPhoneForm, setShowPhoneForm] = useState(false);
  const {
    phoneNumber,
    setPhoneNumber,
    verificationCode,
    setVerificationCode,
    status,
    step,
    error,
    handlePhoneSubmit,
    handleVerificationSubmit,
    resetVerification,
  } = usePhoneAuth(isSignUp);

  const togglePhoneForm = () => {
    setShowPhoneForm(!showPhoneForm);
    if (step !== "phone") {
      resetVerification();
    }
  };

  if (!showPhoneForm) {
    return (
      <Button
        type="button"
        onClick={togglePhoneForm}
        className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground mt-3"
      >
        Continue with Phone Number
      </Button>
    );
  }

  return (
    <div className="space-y-4 mt-4 bg-card p-4 rounded-md">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-foreground">
          {step === "phone" ? "Enter Phone Number" : "Enter Verification Code"}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={togglePhoneForm}
          className="text-muted-foreground hover:text-foreground"
        >
          Cancel
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 py-2 px-3 bg-destructive/10 text-destructive rounded-md text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {step === "phone" ? (
        <div className="space-y-3">
          <div>
            <Label htmlFor="phone" className="text-foreground">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 555-5555"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="bg-input border-border text-foreground"
            />
          </div>
          <Button
            onClick={handlePhoneSubmit}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={status === "loading"}
          >
            {status === "loading" ? (
              <span className="size-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
            ) : null}
            {status === "loading" ? "Sending..." : "Send Verification Code"}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <Label htmlFor="code" className="text-foreground">Verification Code</Label>
            <Input
              id="code"
              type="text"
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              className="bg-input border-border text-foreground"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={resetVerification}
              variant="outline"
              className="flex-1 border-border text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
            >
              Back
            </Button>
            <Button
              onClick={handleVerificationSubmit}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={status === "loading"}
            >
              {status === "loading" ? (
                <span className="size-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
              ) : null}
              {status === "loading" ? "Verifying..." : "Verify Code"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhoneLoginForm;
