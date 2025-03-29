
import { Helmet } from 'react-helmet';
import MultiAgentChat from '@/components/multi-agent/MultiAgentChat';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { showToast } from '@/utils/toast-utils';

export default function MultiAgentChatPage() {
  const [searchParams] = useSearchParams();
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  
  useEffect(() => {
    // Extract project ID from URL if present
    const projectIdParam = searchParams.get('projectId');
    if (projectIdParam) {
      setProjectId(projectIdParam);
      console.log("Loading project from URL:", projectIdParam);
    }
    
    // Add console logs to help with debugging
    console.log("MultiAgentChatPage rendered");
    
    // Force browser to repaint for smoother loading
    requestAnimationFrame(() => {
      console.log("Animation frame triggered");
    });
  }, [searchParams]);
  
  return (
    <>
      <Helmet>
        <title>AI Chat | Video Creator</title>
      </Helmet>
      <div className="flex flex-col h-full min-h-screen overflow-hidden bg-white dark:bg-slate-950">
        <div className="flex-1 overflow-hidden">
          <MultiAgentChat 
            projectId={projectId}
            // Key will force component to re-mount when project changes
            key={`chat-${projectId || 'default'}`}
          />
        </div>
      </div>
    </>
  );
}
