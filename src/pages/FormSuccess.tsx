
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

const FormSuccess = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 p-4">
      <Card className="max-w-md w-full glass-card">
        <CardHeader className="text-center">
          <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
          <CardTitle className="text-2xl">Form Submitted Successfully</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">
            Thank you for your submission. We have received your information and will process it shortly.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => navigate("/")} className="w-full">
            Return Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default FormSuccess;
