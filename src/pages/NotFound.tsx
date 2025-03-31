
import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { FileX } from "lucide-react";

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
        <div className="mb-8 bg-red-500/10 p-6 rounded-full">
          <FileX className="h-16 w-16 text-red-500" />
        </div>
        <h1 className="text-4xl font-bold mb-4">Page Not Found</h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-md">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-4">
          <Button 
            variant="default" 
            onClick={() => navigate("/")}
            className="min-w-[120px]"
          >
            Go Home
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)}
            className="min-w-[120px]"
          >
            Go Back
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;
