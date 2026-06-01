import { useState, useEffect, useCallback } from "react";

interface UsePanelResizeOptions {
  initialLeftWidth?: number;
  initialRightWidth?: number;
  minLeft?: number;
  maxLeft?: number;
  minRight?: number;
  maxRight?: number;
}

/**
 * Custom hook to manage resizable panel widths via drag handles.
 * Extracted from prd-detail.tsx to reduce component complexity.
 */
export function usePanelResize({
  initialLeftWidth = 256,
  initialRightWidth = 380,
  minLeft = 160,
  maxLeft = 600,
  minRight = 280,
  maxRight = 800,
}: UsePanelResizeOptions = {}) {
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
  const [rightWidth, setRightWidth] = useState(initialRightWidth);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingLeft) {
        setLeftWidth(Math.max(minLeft, Math.min(e.clientX, maxLeft)));
      } else if (isDraggingRight) {
        setRightWidth(Math.max(minRight, Math.min(window.innerWidth - e.clientX, maxRight)));
      }
    };

    const handleMouseUp = () => {
      setIsDraggingLeft(false);
      setIsDraggingRight(false);
    };

    if (isDraggingLeft || isDraggingRight) {
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
  }, [isDraggingLeft, isDraggingRight, minLeft, maxLeft, minRight, maxRight]);

  const onStartDragLeft = useCallback(() => setIsDraggingLeft(true), []);
  const onStartDragRight = useCallback(() => setIsDraggingRight(true), []);

  return {
    leftWidth,
    rightWidth,
    isDraggingLeft,
    isDraggingRight,
    onStartDragLeft,
    onStartDragRight,
  };
}
