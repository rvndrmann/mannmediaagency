
import { Helmet } from 'react-helmet';
import { ScrollArea } from '@/components/ui/scroll-area';
import MultiAgentChat from '@/components/multi-agent/MultiAgentChat';

export default function MultiAgentChatPage() {
  return (
    <>
      <Helmet>
        <title>AI Chat | Video Creator</title>
      </Helmet>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <MultiAgentChat />
        </div>
      </div>
    </>
  );
}
