"use client";

import { motion } from "framer-motion";
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
      className="relative z-10 flex flex-col items-center text-center"
      style={{ marginTop: "-50px" }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex flex-col items-center gap-[34px]">
        <motion.span
          variants={itemVariants}
          className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-dark-badge px-4 py-1.5"
        >
          <span className="text-xs font-medium text-accent-green">New</span>
          <span className="text-xs text-white/60">
            Dari ide ke PRD dalam 5 menit
          </span>
        </motion.span>

        <motion.h1
          variants={itemVariants}
          className="font-fustat text-[80px] font-bold leading-[1.05] tracking-tight text-white max-lg:text-5xl max-md:text-4xl"
        >
          Dari ide ke PRD
          <br />
          dalam 5 menit.
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="max-w-lg font-inter text-xl leading-relaxed text-white/60 max-md:text-base"
        >
          Describe produk kamu secara natural dan AI akan generate Product
          Requirements Document yang lengkap, terstruktur, dan profesional.
        </motion.p>

        <motion.div variants={itemVariants} className="w-full">
          <ChatInput />
        </motion.div>
      </div>
    </motion.div>
  );
}