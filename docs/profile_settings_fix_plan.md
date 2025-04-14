# Plan to Fix Profile Settings Page Not Found Error

**Problem:** Accessing the profile settings page results in a "Page Not Found" error because no route is defined for it in `src/App.tsx`.

**Identified Component:** `src/pages/ProfileSettings.tsx` is the correct component for handling profile settings.

**Solution Steps:**

1.  **Create `ProtectedRoute` Component:**
    *   Create a new component (e.g., in `src/components/auth/ProtectedRoute.tsx`).
    *   This component will use the `useUser` hook from `src/hooks/use-user.ts`.
    *   If `isLoading` is true, show a loading indicator.
    *   If `user` is null (not logged in), redirect to `/auth/login`.
    *   If `user` exists, render the child components.

2.  **Define Route in `src/App.tsx`:**
    *   Import the new `ProtectedRoute` component and `ProfileSettings` page.
    *   Add a new `<Route>` within the `<Routes>` section:
        ```typescript
        import ProfileSettings from "./pages/ProfileSettings"; // Add this import at the top
        import ProtectedRoute from "./components/auth/ProtectedRoute"; // Add this import

        // ... inside the App component's return statement, within <Routes>
        <Route path="/settings" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
        ```

3.  **Add Navigation Link:**
    *   Identify the primary navigation component (likely `src/components/sidebar/Navigation.tsx`).
    *   Add a new navigation item (e.g., "Settings") that links to the `/settings` path.

**Implementation:** Switch to "Code" mode to perform these steps.

**Mermaid Diagram:**

```mermaid
graph TD
    A[Start: Profile Settings Not Found] --> B{1. Identify Component: ProfileSettings.tsx};
    B --> C{2. Create ProtectedRoute Component};
    C --> D{3. Define Route in src/App.tsx};
    D -- Add `<Route path="/settings" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />` --> E{4. Identify Navigation Component};
    E -- Likely src/components/sidebar/Navigation.tsx --> F{5. Add Navigation Link};
    F -- Add Link to "/settings" --> G[End: Profile Settings Accessible];