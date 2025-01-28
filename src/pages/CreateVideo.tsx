import React from "react";
import { CreateVideoDialog } from "@/components/CreateVideoDialog";

export const CreateVideo = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-purple-50">
      <div className="max-w-2xl mx-auto p-6">
        <CreateVideoDialog open={true} onOpenChange={() => {}} />
      </div>
    </div>
  );
};

export default CreateVideo;