import { useState, useEffect, useCallback } from "react";

interface UsePanelResizeOptions {
  initialRightWidth?: number;
  minRight?: number;
  maxRight?: number;
}

/**
 * Manage the right chat panel width via a drag handle.
 * ponytail: left sidebar drag removed when PRD-03 unmounted the project sidebar.
 * Restore left-side params here if a resizable left panel returns.
 */
export function usePanelResize({
  initialRightWidth = 380,
  minRight = 280,
  maxRight = 800,
}: UsePanelResizeOptions = {}) {
  const [rightWidth, setRightWidth] = useState(initialRightWidth);
  const [isDraggingRight, setIsDraggingRight] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRight) {
        setRightWidth(Math.max(minRight, Math.min(window.innerWidth - e.clientX, maxRight)));
      }
    };

    const handleMouseUp = () => {
      setIsDraggingRight(false);
    };

    if (isDraggingRight) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "none";
    } else {
      document.body.style.userSelect = "";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
    };
  }, [isDraggingRight, minRight, maxRight]);

  const onStartDragRight = useCallback(() => setIsDraggingRight(true), []);

  return {
    rightWidth,
    isDraggingRight,
    onStartDragRight,
  };
}
