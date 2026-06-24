"use client";

import { motion } from "framer-motion";


export function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">

      <div className="flex gap-1.5 rounded-2xl rounded-bl-md bg-(--bg-surface) px-4 py-3">
        <motion.span
          className="h-2 w-2 rounded-full bg-text-gray/40"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
        />
        <motion.span
          className="h-2 w-2 rounded-full bg-text-gray/40"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
        />
        <motion.span
          className="h-2 w-2 rounded-full bg-text-gray/40"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
        />
      </div>
    </div>
  );
}