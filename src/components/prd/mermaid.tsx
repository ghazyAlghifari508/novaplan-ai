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
        // We show the raw code so that if it's a permanent syntax error after streaming finishes, the user can still read the logic.
        const escapedChart = chart.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        setSvg(`
          <div class="flex flex-col w-full max-w-full rounded-lg border border-dashed border-fog/30 bg-charcoal/30">
            <div class="text-xs p-3 text-fog flex items-center justify-center border-b border-fog/20">
              <span class="animate-pulse">Menyusun diagram... (Jika tidak tampil, AI melakukan kesalahan syntax)</span>
            </div>
            <pre class="p-4 text-[11px] overflow-x-auto text-slate font-berkeley-mono whitespace-pre leading-relaxed">${escapedChart}</pre>
          </div>
        `);
      }
    };

    if (chart) {
      renderChart();
    }
  }, [chart, resolvedTheme]);

  if (!svg) {
    return <div className="animate-pulse bg-black/5 dark:bg-white/5 h-32 rounded-lg flex items-center justify-center text-sm text-(--text-secondary) my-6">Rendering diagram...</div>;
  }

  return (
    <div 
      ref={containerRef}
      className="my-6 overflow-x-auto bg-(--bg-card) p-4 rounded-lg border border-(--border-subtle) flex justify-center w-full"
      dangerouslySetInnerHTML={{ __html: svg }} 
    />
  );
};
