
import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Sidebar } from "@/components/Sidebar";

const ProductShootV2 = () => {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex flex-col min-h-screen w-full bg-background">
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 relative">
            <div className="p-8">
              <h1 className="text-2xl font-bold mb-6">Product Shoot V2</h1>
              {/* We'll implement the V2 functionality in the next iteration */}
              <p className="text-muted-foreground">
                Enhanced AI-powered product photography coming soon...
              </p>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ProductShootV2;
