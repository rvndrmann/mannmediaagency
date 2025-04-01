
import React from "react";

interface PageLayoutProps {
  children: React.ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-6 px-4">
        {children}
      </main>
    </div>
  );
}
