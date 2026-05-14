"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ChatInput } from "./chat-input";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.8,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

export function HeroContent() {
  return (
    <motion.div
      className="relative z-10 flex flex-col items-center text-center px-[120px] max-md:px-6 w-full"
      style={{ marginTop: "-50px" }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header elements with 34px gap */}
      <div className="flex flex-col items-center gap-[34px]">
        {/* Badge Component */}
        <motion.div variants={itemVariants}>
          <Link
            href="/pricing"
            className="flex items-center gap-2 rounded-full border border-[var(--border-subtle)] p-1 shadow-sm hover:shadow-md hover:bg-[var(--bg-hover)] transition-all cursor-pointer"
            style={{ background: "var(--bg-elevated)" }}
          >
            <div className="flex items-center gap-1.5 rounded-full bg-dark-badge px-3 py-1">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 1L7.5 4.5L11 6L7.5 7.5L6 11L4.5 7.5L1 6L4.5 4.5L6 1Z" fill="#ffffff" />
              </svg>
              <span className="font-inter text-[14px] font-medium text-white">Pricing</span>
            </div>
            <span className="font-inter text-[14px] font-normal pr-3" style={{ color: "var(--text-secondary)" }}>
              Lihat Paket Harga Kami
            </span>
          </Link>
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          variants={itemVariants}
          className="font-fustat text-[80px] font-bold tracking-[-4.8px] leading-none max-lg:text-6xl max-md:text-5xl"
          style={{ color: "var(--text-primary)" }}
        >
          Dari Ide ke PRD
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={itemVariants}
          className="w-[542px] max-w-[736px] font-fustat text-[20px] font-medium tracking-[-0.4px] max-md:w-full max-md:text-base leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          Describe produk kamu secara natural dan AI akan generate Product
          Requirements Document yang lengkap, terstruktur, dan profesional.
        </motion.p>
      </div>

      {/* Gap between header and search box is 44px */}
      <motion.div variants={itemVariants} className="mt-[44px] w-full">
        <ChatInput />
      </motion.div>
    </motion.div>
  );
}