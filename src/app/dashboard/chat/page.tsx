import { requireAuth } from "@/lib/auth";
import { ChatPanel } from "@/components/chat";

export default async function ChatPage() {
  await requireAuth();

  return (
    <div className="flex h-[calc(100vh-0px)]">
      <main className="flex-1 flex flex-col">
        <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
          <div>
            <h1 className="font-fustat text-xl font-bold">Chat dengan AI</h1>
            <p className="text-sm text-text-gray">
              Describe produkmu dan AI akan generate PRD
            </p>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-lg">
            <p className="text-6xl mb-6">📄</p>
            <h2 className="font-fustat text-2xl font-bold mb-3">
              Siap membuat PRD?
            </h2>
            <p className="text-text-gray">
              Mulai chat di panel kanan. AI akan menanyakan preferensi kamu
              lalu generate PRD lengkap secara otomatis.
            </p>
          </div>
        </div>
      </main>

      <ChatPanel className="w-[400px]" />
    </div>
  );
}