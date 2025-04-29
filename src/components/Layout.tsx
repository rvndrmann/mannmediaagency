
import { ReactNode } from "react";
import { BottomNavBar } from "./mobile/BottomNavBar"; // Import the new component

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[#1A1F2C] text-white">
      <main className="pb-16 md:pb-0">{children}</main> {/* Add padding-bottom for mobile to avoid overlap */}
      <BottomNavBar /> {/* Render the bottom nav bar */}
    </div>
  );
}
