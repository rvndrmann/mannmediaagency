
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, save_browser_data = true } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Browser Use API if API key is available
    const apiKey = Deno.env.get("BROWSER_USE_API_KEY");
    if (apiKey) {
      try {
        console.log("Using Browser Use API to capture website");
        const options = {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`, 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            "url": url,
            "save_browser_data": save_browser_data
          })
        };

        const response = await fetch('https://api.browser-use.com/api/v1/capture-website', options);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Browser Use API Error (${response.status}): ${errorText}`);
        }
        
        const apiResponse = await response.json();
        
        return new Response(
          JSON.stringify(apiResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (apiError) {
        console.error("Browser Use API Error:", apiError);
        console.log("Falling back to local puppeteer implementation");
        // Continue to fallback solution if API fails
      }
    }

    // Fallback: Launch local puppeteer if API key is not available or API call failed
    console.log("Using local puppeteer implementation");
    const browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });
    
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.goto(url, { timeout: 30000, waitUntil: 'networkidle2' });
      
      // Wait for a short time to allow any animations to complete
      await new Promise(r => setTimeout(r, 1000));
      
      // Take screenshot
      const screenshotBuffer = await page.screenshot({ 
        type: 'jpeg',
        quality: 80,
        fullPage: false 
      });
      
      // Convert screenshot to base64
      const base64Image = `data:image/jpeg;base64,${btoa(String.fromCharCode(...new Uint8Array(screenshotBuffer)))}`;
      
      const responseData = {
        image_url: base64Image,
        url: page.url(),
        saved: save_browser_data
      };

      return new Response(
        JSON.stringify(responseData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error("Error capturing website:", error);
    
    return new Response(
      JSON.stringify({ error: error.message || "Failed to capture website" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
