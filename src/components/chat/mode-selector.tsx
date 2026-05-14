"use client";

import { motion } from "framer-motion";
import { Bot, Pencil } from "lucide-react";

interface ModeSelectorProps {
  onSelect: (mode: "ai_auto" | "manual") => void;
}

export function ModeSelector({ onSelect }: ModeSelectorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-4 py-6"
    >
      <p className="text-sm text-text-gray">Bagaimana kita melanjutkan?</p>
      <div className="flex gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect("ai_auto")}
          className="flex flex-col items-center gap-3 rounded-xl border border-border-subtle bg-white p-6 text-center transition-all hover:border-primary-black/30 hover:shadow-md"
        >
          <span className="text-primary-black"><Bot size={32} /></span>
          <span className="font-medium">Biarkan AI Memilih</span>
          <span className="text-xs text-text-gray">
            AI langsung pilih stack & design
          </span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect("manual")}
          className="flex flex-col items-center gap-3 rounded-xl border border-border-subtle bg-white p-6 text-center transition-all hover:border-primary-black/30 hover:shadow-md"
        >
          <span className="text-primary-black"><Pencil size={32} /></span>
          <span className="font-medium">Pilih Sendiri</span>
          <span className="text-xs text-text-gray">
            Atur preferensi & detail produk
          </span>
        </motion.button>
      </div>
    </motion.div>
  );
}