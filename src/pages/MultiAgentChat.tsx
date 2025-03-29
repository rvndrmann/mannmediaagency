
import { Helmet } from 'react-helmet';
import MultiAgentChat from '@/components/multi-agent/MultiAgentChat';

export default function MultiAgentChatPage() {
  return (
    <>
      <Helmet>
        <title>AI Chat | Video Creator</title>
      </Helmet>
      <div className="flex flex-col h-full min-h-screen overflow-hidden bg-white dark:bg-slate-950">
        <div className="flex-1 overflow-hidden">
          <MultiAgentChat />
        </div>
      </div>
    </>
  );
}
