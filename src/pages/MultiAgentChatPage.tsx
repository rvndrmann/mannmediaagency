
import React from 'react';
import { Layout } from "@/components/Layout";
import { MultiAgentChat } from "@/components/canvas/MultiAgentChat";
import { Card } from "@/components/ui/card";

const MultiAgentChatPage: React.FC = () => {
  return (
    <Layout>
      <div className="container mx-auto p-4 h-[calc(100vh-80px)]">
        <Card className="h-full overflow-hidden">
          <MultiAgentChat />
        </Card>
      </div>
    </Layout>
  );
};

export default MultiAgentChatPage;
