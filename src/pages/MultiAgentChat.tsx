
import { Helmet } from 'react-helmet';
import MultiAgentChat from '@/components/multi-agent/MultiAgentChat';
import { useEffect, useState, useLayoutEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { showToast } from '@/utils/toast-utils';

export default function MultiAgentChatPage() {
  const [searchParams] = useSearchParams();
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const [viewportHeight, setViewportHeight] = useState<number | undefined>(undefined);
  
  // Use layout effect to set initial viewport height
  useLayoutEffect(() => {
    const updateViewportHeight = () => {
      const height = window.visualViewport?.height || window.innerHeight;
      setViewportHeight(height);
      document.documentElement.style.setProperty('--vh', `${height * 0.01}px`);
    };
    
    updateViewportHeight();
    
    // Add event listeners to handle viewport changes
    window.addEventListener('resize', updateViewportHeight);
    window.visualViewport?.addEventListener('resize', updateViewportHeight);
    
    return () => {
      window.removeEventListener('resize', updateViewportHeight);
      window.visualViewport?.removeEventListener('resize', updateViewportHeight);
    };
  }, []);
  
  useEffect(() => {
    // Extract project ID from URL if present
    const projectIdParam = searchParams.get('projectId');
    if (projectIdParam) {
      setProjectId(projectIdParam);
      console.log("Loading project from URL:", projectIdParam);
    } else {
      console.log("No project ID in URL parameters");
    }
    
    // Add console logs to help with debugging
    console.log("MultiAgentChatPage rendered with dimensions:", {
      width: window.innerWidth,
      height: window.innerHeight,
      viewportHeight: window.visualViewport?.height
    });
    
    // Force browser to repaint for smoother loading and prevent layout shifts
    requestAnimationFrame(() => {
      document.documentElement.style.height = '100%';
      document.body.style.height = '100%';
      console.log("Animation frame triggered for page render");
    });
  }, [searchParams]);
  
  return (
    <>
      <Helmet>
        <title>AI Chat | Video Creator</title>
        <style>{`
          :root {
            --vh: 1vh;
          }
          html, body {
            height: 100%;
            overflow: hidden;
          }
          #root {
            height: 100%;
          }
          .app-height {
            height: 100vh;
            height: calc(var(--vh, 1vh) * 100);
          }
        `}</style>
      </Helmet>
      <div className="flex flex-col app-height overflow-hidden bg-white dark:bg-slate-950">
        <div className="flex-1 overflow-hidden" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <MultiAgentChat 
            projectId={projectId}
            // Key will force component to re-mount when project changes
            key={`chat-${projectId || 'default'}-${Date.now()}`}
          />
        </div>
      </div>
    </>
  );
}
