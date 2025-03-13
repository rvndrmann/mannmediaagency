
import { MessageInbox } from "@/components/messages/MessageInbox";

export default function Messages() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-6">
        <MessageInbox />
      </main>
    </div>
  );
}
