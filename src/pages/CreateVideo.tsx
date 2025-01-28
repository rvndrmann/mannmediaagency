import React from "react";
import { CreateVideoDialog } from "@/components/CreateVideoDialog";
import { useNavigate } from "react-router-dom";

const CreateVideo = () => {
  const navigate = useNavigate();
  console.log("Navigating to create video...");

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-purple-50">
      <div className="max-w-2xl mx-auto p-6">
        <CreateVideoDialog 
          open={true} 
          onOpenChange={(open) => {
            if (!open) navigate("/");
          }} 
        />
      </div>
    </div>
  );
};

export default CreateVideo;