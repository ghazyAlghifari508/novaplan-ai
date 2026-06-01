"use client";

import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { useTheme } from "next-themes";

interface MermaidProps {
  chart: string;
}

export const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: resolvedTheme === "dark" ? "dark" : "default",
      securityLevel: "loose",
      logLevel: 5,
      suppressErrorRendering: true,
    });

    const renderChart = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        // Pre-parse to avoid rendering invalid syntax (prevents DOM pollution)
        await mermaid.parse(chart, { suppressErrors: true });
        
        const { svg: renderSvg } = await mermaid.render(id, chart);
        setSvg(renderSvg);
      } catch (error) {
        // Clean up any rogue error SVGs Mermaid might have injected into the body
        document.querySelectorAll('svg[id^="dmermaid-"], svg[id^="mermaid-"], div[id^="dmermaid-"]').forEach(el => el.remove());
        
        // Silently catch errors. These usually happen during AI text streaming because the Mermaid code is incomplete.
        // We DO NOT print the raw ${chart} here to prevent Mermaid's global watcher from accidentally injecting an SVG into it.
        setSvg(`<div class="flex flex-col w-full max-w-full"><div class="text-sm p-4 text-text-gray flex items-center justify-center animate-pulse border-b border-border-subtle dark:border-white/10 mb-2 pb-2">Menyusun diagram...</div></div>`);
      }
    };

    if (chart) {
      renderChart();
    }
  }, [chart, resolvedTheme]);

  if (!svg) {
    return <div className="animate-pulse bg-black/5 dark:bg-white/5 h-32 rounded-lg flex items-center justify-center text-sm text-text-gray my-6">Rendering diagram...</div>;
  }

  return (
    <div 
      ref={containerRef}
      className="my-6 overflow-x-auto bg-white dark:bg-[#1A1A1A] p-4 rounded-lg border border-border-subtle dark:border-white/10 flex justify-center w-full"
      dangerouslySetInnerHTML={{ __html: svg }} 
    />
  );
};
