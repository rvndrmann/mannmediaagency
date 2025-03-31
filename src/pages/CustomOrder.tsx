
import React from 'react';
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const CustomOrder = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center mb-6 md:mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")}
            className="mr-4 text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl md:text-2xl font-bold text-white">Custom Order</h1>
        </div>
        
        <div className="text-center text-white">
          <p>Custom order page content coming soon!</p>
        </div>
      </div>
    </div>
  );
};

export default CustomOrder;
