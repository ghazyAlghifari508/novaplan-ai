"use client";

import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import DOMPurify from "dompurify";

// Use mermaid "default" (light) theme so diagrams have white backgrounds
// and dark text — designed for readability. The app's own dark UI provides
// the card-level dark framing; within the SVG a light theme is clearest.
mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose",
  logLevel: 4, // ERROR only — 0 = TRACE floods console
});

interface MermaidProps {
  chart: string;
}

export const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [hasError, setHasError] = useState(false);
  const renderIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const currentRender = ++renderIdRef.current;

    const renderChart = async () => {
      try {
        setHasError(false);
        setSvg("");

        if (!chart || !chart.trim()) {
          setHasError(true);
          return;
        }

        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

        // Silent parse — returns false on invalid syntax instead of throwing.
        // During AI streaming, incomplete mermaid blocks are common; we handle
        // this by rendering raw text until valid syntax arrives.
        const isParseable = await mermaid.parse(chart, { suppressErrors: true });

        if (!isParseable) {
          // Chart not parseable (streaming / invalid). Show raw text.
          if (cancelled) return;
          setHasError(true);
          const escaped = chart
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
          setSvg(DOMPurify.sanitize(`
            <div class="flex flex-col w-full max-w-full rounded-lg border border-dashed border-fog/30 bg-charcoal/30">
              <div class="text-xs p-3 text-fog flex items-center justify-center border-b border-fog/20">
                <span>Menyusun diagram... (Jika tidak tampil, AI melakukan kesalahan syntax)</span>
              </div>
              <pre class="p-4 text-[11px] overflow-x-auto text-slate font-berkeley-mono whitespace-pre leading-relaxed">${escaped}</pre>
            </div>
          `));
          return;
        }

        // Chart is parseable — render it.
        const { svg: renderSvg } = await mermaid.render(id, chart);
        if (cancelled) return;

        // Guard: mermaid.render can succeed but return empty/minimal SVG
        // (known issue with certain diagram types). Detect and fallback.
        if (!renderSvg || renderSvg.trim().length < 50) {
          throw new Error("Empty SVG rendered");
        }

        // ponytail: Mermaid uses <foreignObject> for HTML labels. DOMPurify
        // strips the HTML content inside foreignObject (body, span, div) with
        // default config — skip DOMPurify since mermaid's securityLevel: "loose"
        // already prevents XSS. The SVG only contains diagram markup.
        setSvg(renderSvg);
        setHasError(false);
      } catch {
        if (cancelled) return;

        setHasError(true);
        // Clean up SVG stubs mermaid may have injected
        document.querySelectorAll('svg[id^="dmermaid-"], svg[id^="mermaid-"], div[id^="dmermaid-"]').forEach((el) => el.remove());

        const escaped = chart
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
        setSvg(DOMPurify.sanitize(`
          <div class="flex flex-col w-full max-w-full rounded-lg border border-dashed border-fog/30 bg-charcoal/30">
            <div class="text-xs p-3 text-fog flex items-center justify-center border-b border-fog/20">
              <span>Diagram tidak dapat dirender — kesalahan syntax pada kode Mermaid</span>
            </div>
            <pre class="p-4 text-[11px] overflow-x-auto text-slate font-berkeley-mono whitespace-pre leading-relaxed">${escaped}</pre>
          </div>
        `));
      }
    };

    renderChart();

    return () => {
      cancelled = true;
    };
  }, [chart]);

  if (!svg && !hasError) {
    return (
      <div className="animate-pulse bg-black/5 dark:bg-white/5 h-32 rounded-lg flex items-center justify-center text-sm text-(--text-secondary) my-6">
        Rendering diagram...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-6 overflow-x-auto bg-(--bg-card) p-4 rounded-lg border border-(--border-subtle) flex justify-center w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};
