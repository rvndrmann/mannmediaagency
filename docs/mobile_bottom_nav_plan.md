# Plan: Add Mobile Bottom Navigation Bar

**Objective:** Add a fixed bottom navigation bar to the mobile view, containing links to the Dashboard and Plans pages.

**Steps:**

1.  **Verify Routes:** Confirmed `/plans` and `/dashboard` routes exist in `src/App.tsx`.
2.  **Create New Component:** Create `src/components/mobile/BottomNavBar.tsx`.
3.  **Implement BottomNavBar Component:** Add the following code to `src/components/mobile/BottomNavBar.tsx`:
    ```typescript
    import { Link, useLocation } from "react-router-dom";
    import { LayoutDashboard, FileText } from "lucide-react"; // Assuming lucide-react is used for icons
    import { cn } from "@/lib/utils"; // Assuming a utility for class names exists

    export const BottomNavBar = () => {
      const location = useLocation();

      const navItems = [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/plans", label: "Plan", icon: FileText },
      ];

      return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background p-2 md:hidden">
          <div className="flex justify-around">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 rounded-md p-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      );
    };
    ```
4.  **Integrate BottomNavBar:** Modify `src/components/Layout.tsx` to import and render the `BottomNavBar`:
    ```typescript
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
    ```

**Mermaid Diagram:**

```mermaid
graph TD
    A[App.tsx] --> B(Routes);
    B --> C{Layout.tsx};
    C --> D[Page Content (children)];
    C --> E(BottomNavBar.tsx);
    E --> F[Dashboard Button (/dashboard)];
    E --> G[Plan Button (/plans)];

    style E fill:#f9f,stroke:#333,stroke-width:2px