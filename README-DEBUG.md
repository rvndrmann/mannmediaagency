# Canvas Authentication Debug Guide

## Problem Overview

The canvas application is showing a "Create New Project" screen instead of displaying your project history. This is happening because the app is encountering authentication issues with Supabase.

## Solution Implemented

We've implemented several improvements to make the system more resilient to authentication issues:

1. Enhanced the Supabase client initialization to clear potentially corrupted auth data
2. Improved the authentication flow in AuthCallback.tsx to better handle PKCE and token-based auth
3. Made the useAuth hook more robust with fallback mechanisms and local storage confirmation
4. Added a development mode that can bypass authentication for testing purposes

## How to Use Developer Mode

We've added a special developer mode that allows you to view and work with mock project data without requiring authentication. This is useful for:

- Testing the UI when authentication is failing
- Development and testing when Supabase is unavailable
- Demonstrating features without needing a real account

### Enabling Developer Mode

There are three ways to enable the developer mode:

#### 1. Using the Developer Button

When running locally (on localhost), a small purple wrench button (🔧) appears in the bottom-right corner of the screen. Click this button to toggle developer mode on/off.

#### 2. Using the Console

Open your browser's developer console (F12 or right-click > Inspect > Console) and run:

```javascript
enableMockData()
```

This will enable mock data mode and reload the page.

#### 3. By Clicking the Header

Rapidly click the "Please sign in to view your projects" header 5 times to activate developer mode.

### Disabling Developer Mode

To disable developer mode:

- Click the purple wrench button again
- Or run `disableMockData()` in the console

## Permanent Fix Recommendations

For a permanent solution to the authentication issues, consider:

1. Verifying that your Supabase project is correctly configured
2. Checking the API keys in the client.ts file
3. Ensuring the database has the correct tables (canvas_projects, canvas_scenes)
4. Looking for CORS issues if the app is hosted on a different domain than expected

## Files Modified

- src/integrations/supabase/client.ts
- src/hooks/use-auth.ts
- src/hooks/use-canvas-projects.ts
- src/components/auth/AuthCallback.tsx
- src/pages/Canvas.tsx
- index.html

## New Files Added

- src/utils/dev-mode-helpers.ts
- public/mockdata-enabler.js
- README-DEBUG.md (this file)