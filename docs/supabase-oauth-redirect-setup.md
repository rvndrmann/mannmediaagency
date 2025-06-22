# Verifying and Updating Supabase OAuth Redirect URLs

## Overview

OAuth redirect URLs are critical for successful authentication flows. They must exactly match the URLs configured in your Supabase project settings and your frontend application.

## Current Configuration

In this project, the OAuth redirect URLs are configured in the `supabase/config.toml` file:

```toml
site_url = "https://www.mannmediaagency.com"
additional_redirect_urls = [
  "https://www.mannmediaagency.com/auth/callback",
  "https://avdwgvjhufslhqrrmxgo.supabase.co/auth/v1/callback",
  "http://localhost:5173/auth/callback",
  "https://mannmediaagency.com/auth/callback",
  "http://localhost:8080/",
  "http://localhost:8080/auth/callback",
  "http://localhost:8082/",
  "http://localhost:8082/auth/callback",
  "https://avdwgvjhufslhqrrmxgo.supabase.co/functions/v1/mcp-server."
]
```

## How to Verify

1. **Match Frontend URL:**  
   Ensure the URL you use to access the app matches one of the URLs above exactly, including protocol (`http` vs `https`), domain, port, and path.

2. **Check OAuth Redirect URL in Supabase Dashboard:**  
   - Log in to your Supabase dashboard at https://app.supabase.com  
   - Select your project  
   - Navigate to **Authentication > Settings > Redirect URLs**  
   - Verify that the URLs listed here include the URLs from your `config.toml` file, especially the `/auth/callback` paths.

3. **Test Login:**  
   Use a supported browser (preferably Chrome) and access the app via one of the configured URLs. Attempt login and observe if the OAuth flow completes successfully.

## How to Update

- **Update `supabase/config.toml`:**  
  Add or remove URLs in the `additional_redirect_urls` array as needed. Save the file and redeploy your Supabase project if necessary.

- **Update Supabase Dashboard:**  
  Add or remove redirect URLs in the dashboard to match your deployment URLs.

## Common Issues

- Mismatch between the URL used in the browser and the configured redirect URLs causes OAuth to fail.
- Using unsupported browsers (e.g., Instagram in-app browser) can cause login issues.
- Forgetting to include localhost URLs during local development.

## Summary

Ensure consistency between your frontend URL, `config.toml` redirect URLs, and Supabase dashboard redirect URLs. This alignment is essential for OAuth login to work correctly.

---

If you need help updating these settings or further debugging, please provide details about your deployment environment and URLs you are using.