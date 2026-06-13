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
      className="relative z-10 flex w-full flex-col items-center px-6 text-center"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex w-full max-w-[1200px] flex-col items-center gap-8 pt-16 md:pt-20">


        <motion.h1
          variants={itemVariants}
          className="max-w-[860px] font-inter text-[48px] font-light leading-none text-snow md:text-[64px] lg:text-[72px]"
        >
          Dari ide produk ke PRD yang siap dieksekusi
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="max-w-[650px] font-inter text-[17px] font-normal leading-[1.6] text-fog"
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
