
import { useState, useCallback } from "react";

export const useScreenshotCapture = (currentUrl: string | null, taskDescription: string, environment: string) => {
  const [screenshot, setScreenshot] = useState<string | null>(null);
  
  const captureScreenshot = useCallback(async (): Promise<string | null> => {
    if (typeof document === 'undefined') return null;
    
    try {
      console.log('Starting screenshot capture...');
      const html2canvas = (await import('html2canvas')).default;
      
      // Create a simple representation of the current browser state
      const browserStateElement = document.createElement('div');
      browserStateElement.className = 'browser-screenshot-container';
      browserStateElement.style.width = '1024px';
      browserStateElement.style.height = '768px';
      browserStateElement.style.position = 'fixed';
      browserStateElement.style.top = '-9999px';
      browserStateElement.style.left = '-9999px';
      browserStateElement.style.backgroundColor = '#fff';
      
      // Add current URL display
      const urlDisplay = document.createElement('div');
      urlDisplay.className = 'browser-url-display';
      urlDisplay.style.padding = '10px';
      urlDisplay.style.borderBottom = '1px solid #eee';
      urlDisplay.style.fontFamily = 'Arial, sans-serif';
      urlDisplay.textContent = `Current URL: ${currentUrl || 'No URL'}`;
      browserStateElement.appendChild(urlDisplay);
      
      // Show notice that this is an external window session
      const noticeElement = document.createElement('div');
      noticeElement.style.padding = '20px';
      noticeElement.style.textAlign = 'center';
      noticeElement.style.fontSize = '18px';
      noticeElement.innerHTML = `
        <p>This website is open in an external browser window. The screenshot represents the current state.</p>
        <p style="margin-top: 10px; font-weight: bold">Current URL: ${currentUrl || 'None'}</p>
      `;
      browserStateElement.appendChild(noticeElement);
      
      // Display additional info if available
      const infoDisplay = document.createElement('div');
      infoDisplay.style.padding = '20px';
      infoDisplay.style.marginTop = '20px';
      infoDisplay.style.border = '1px solid #eee';
      infoDisplay.style.borderRadius = '5px';
      infoDisplay.innerHTML = `
        <h3 style="margin-bottom: 10px; font-weight: bold">Browser Session Info:</h3>
        <p>Task: ${taskDescription || 'No active task'}</p>
        <p>Environment: ${environment}</p>
        <p>Status: Website open in external window</p>
      `;
      browserStateElement.appendChild(infoDisplay);
      
      // Add to document temporarily
      document.body.appendChild(browserStateElement);
      
      // Capture screenshot of this state representation
      const canvas = await html2canvas(browserStateElement, {
        backgroundColor: '#FFFFFF',
        scale: 1.5,
      });
      
      // Remove the temporary element
      document.body.removeChild(browserStateElement);
      
      const dataUrl = canvas.toDataURL('image/png');
      console.log('Screenshot representation captured successfully, size:', dataUrl.length);
      setScreenshot(dataUrl);
      return dataUrl;
    } catch (error) {
      console.error('Error capturing screenshot representation:', error);
      const fallback = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      setScreenshot(fallback);
      return fallback;
    }
  }, [currentUrl, taskDescription, environment, setScreenshot]);
  
  return {
    screenshot,
    setScreenshot,
    captureScreenshot
  };
};
