"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  className?: string;
}

export function ChatInput({ className }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [focused, setFocused] = useState(false);
  const router = useRouter();

  const handleSend = async () => {
    if (!message.trim()) return;
    
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const redirectUrl = `/setup?prompt=${encodeURIComponent(message)}`;
      router.push(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
      return;
    }

    router.push(`/setup?prompt=${encodeURIComponent(message)}`);
  };

  return (
    <div
      className={cn(
        "mx-auto flex h-[200px] w-full max-w-[728px] flex-col rounded-[18px] backdrop-blur-xl transition-all duration-300",
        focused ? "ring-2 ring-primary-black/10" : "",
        className,
      )}
      style={{ background: "rgba(0,0,0,0.24)" }}
    >
      <div className="flex flex-1 flex-col p-[16px]">
        {/* Top row: Credit info */}
        <div className="flex items-center justify-between px-2 mb-[12px]">
          <div className="flex items-center gap-3">
            <span className="font-schibsted text-[12px] font-medium text-white">
              3 PRD Gratis
            </span>
            <Link href="/pricing" className="rounded-full bg-accent-green px-2.5 py-0.5 font-schibsted text-[10px] font-bold text-primary-black hover:opacity-90 transition-opacity uppercase tracking-wider cursor-pointer">
              Upgrade
            </Link>
          </div>
        </div>

        {/* Main input area */}
        <div
          className="flex-1 flex flex-col justify-between rounded-[12px] shadow-sm p-3 border border-[var(--border-subtle)] relative group focus-within:border-[var(--border-medium)] transition-colors"
          style={{ background: "var(--bg-elevated)" }}
        >
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
            placeholder="Jelaskan produk yang ingin kamu buat..."
            className="w-full resize-none border-none bg-transparent font-schibsted text-[16px] outline-none"
            style={{ color: "var(--text-primary)", caretColor: "var(--text-primary)" }}
            rows={2}
          />

          {/* Bottom row inside input area */}
          <div className="flex items-center justify-end mt-2">
            <div className="flex items-center gap-4">
              <span className="text-[12px] text-text-gray font-schibsted">
                {message.length.toLocaleString()}/3,000
              </span>
              <button
                onClick={handleSend}
                disabled={!message.trim()}
                className={cn(
                  "flex h-[36px] w-[36px] items-center justify-center rounded-full transition-all duration-200",
                  message.trim()
                    ? "bg-primary-black text-white hover:opacity-90"
                    : "bg-[#f8f8f8] text-text-gray/40",
                )}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 11.5V2.5M7 2.5L2.5 7M7 2.5L11.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}