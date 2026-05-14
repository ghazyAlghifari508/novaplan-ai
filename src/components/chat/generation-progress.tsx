"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GENERATION_STEPS } from "@/lib/prompts";
import { CheckCircle2, Loader2, Circle } from "lucide-react";

interface GenerationProgressProps {
  isActive: boolean;
}

export function GenerationProgress({ isActive }: GenerationProgressProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setCurrentStep(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % GENERATION_STEPS.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex flex-col items-center gap-6 py-8"
        >
          <div className="flex items-center gap-2">
            <motion.div
              className="h-3 w-3 rounded-full bg-accent-green"
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span className="text-sm text-text-gray">AI sedang bekerja...</span>
          </div>

          <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-light-gray-bg">
            <motion.div
              className="h-full rounded-full bg-primary-black"
              animate={{
                width: ["0%", "25%", "50%", "75%", "100%"],
              }}
              transition={{ duration: 15, ease: "easeInOut" }}
            />
          </div>

          <div className="space-y-3">
            {GENERATION_STEPS.map((step, index) => (
              <div
                key={step}
                className={`flex items-center gap-2 text-sm transition-all duration-500 ${
                  index <= currentStep
                    ? "text-primary-black"
                    : "text-text-gray/30"
                }`}
              >
                <span className="w-5 flex justify-center">
                  {index < currentStep ? (
                    <CheckCircle2 size={16} className="text-accent-green" />
                  ) : index === currentStep ? (
                    <Loader2 size={16} className="animate-spin text-primary-black" />
                  ) : (
                    <Circle size={16} className="text-text-gray/30" />
                  )}
                </span>
                {step}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}