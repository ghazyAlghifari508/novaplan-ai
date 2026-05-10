"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  className?: string;
}

export function ChatInput({ className }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [credits] = useState(3);
  const [focused, setFocused] = useState(false);
  const router = useRouter();

  const handleSend = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login?redirect=/");
      return;
    }

    router.push(`/dashboard?chat=${encodeURIComponent(message)}`);
  };

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[728px] rounded-[18px] backdrop-blur-xl transition-all duration-300",
        focused ? "ring-2 ring-white/20" : "",
        className,
      )}
      style={{ background: "rgba(0,0,0,0.24)" }}
    >
      <div className="flex h-[200px] flex-col items-center justify-center gap-4 px-8">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Describe produkmu secara natural..."
          className="w-full resize-none border-none bg-transparent text-center text-lg text-white/90 placeholder-white/40 outline-none transition-all focus:text-white"
          rows={2}
        />

        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
              <div className="h-2 w-2 rounded-full bg-accent-green animate-pulse" />
              <span className="text-xs text-white/60">AI Ready</span>
            </div>

            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/50">
              {credits} free credits
            </span>
          </div>

          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200",
              message.trim()
                ? "bg-white text-black hover:bg-white/90"
                : "bg-white/10 text-white/30",
            )}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2 8L14 8M10 4L14 8L10 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}